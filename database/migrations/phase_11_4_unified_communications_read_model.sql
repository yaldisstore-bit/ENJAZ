begin;

-- Phase 11.4-D — Unified Communications Experience & Certification foundation.
-- Canonical message truth remains public.communications. This migration adds only
-- a per-user read cursor plus governed read/action RPCs; it does not create a
-- second inbox/message store.

create table public.communication_conversation_reads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_conversation_reads_workspace_id_id_key unique(workspace_id,id),
  constraint communication_conversation_reads_conversation_fk foreign key(workspace_id,conversation_id)
    references public.communication_conversations(workspace_id,id) on delete cascade,
  constraint communication_conversation_reads_unique unique(workspace_id,conversation_id,user_id)
);

create index communication_conversation_reads_user_idx
  on public.communication_conversation_reads(workspace_id,user_id,last_read_at desc);
create index communication_conversation_reads_conversation_idx
  on public.communication_conversation_reads(workspace_id,conversation_id,user_id);

create trigger communication_conversation_reads_set_updated_at
before update on public.communication_conversation_reads
for each row execute function private.set_updated_at();

alter table public.communication_conversation_reads enable row level security;
revoke all on table public.communication_conversation_reads from public,anon,authenticated;
grant select,insert,update,delete on table public.communication_conversation_reads to service_role;

create policy communication_conversation_reads_browser_deny
  on public.communication_conversation_reads
  as restrictive for all to anon,authenticated
  using (false) with check (false);

create or replace function private.require_communication_workspace_user_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise insufficient_privilege using message='ENJAZ_COMMUNICATION_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then
    raise insufficient_privilege using message='ENJAZ_COMMUNICATION_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end;
$$;

create or replace function private.get_communications_hub_v1_impl(
  p_workspace_id uuid,p_query text default null,p_conversation_id uuid default null,p_limit integer default 60
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_actor uuid;
  v_query text:=nullif(lower(btrim(coalesce(p_query,''))), '');
  v_limit integer:=least(greatest(coalesce(p_limit,60),1),100);
  v_conversations jsonb:='[]'::jsonb;
  v_timeline jsonb:='[]'::jsonb;
  v_review jsonb:='[]'::jsonb;
  v_providers jsonb:='[]'::jsonb;
  v_summary jsonb:='{}'::jsonb;
  v_selected public.communication_conversations%rowtype;
begin
  v_actor:=private.require_communication_workspace_user_v1(p_workspace_id);
  if p_conversation_id is not null then
    select * into v_selected from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.id=p_conversation_id;
    if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_CONVERSATION_NOT_FOUND'; end if;
  end if;

  select coalesce(jsonb_agg(x.payload order by x.latest_at desc nulls last,x.conversation_id),'[]'::jsonb)
  into v_conversations
  from (
    select cv.id conversation_id,last_msg.occurred_at latest_at,
      jsonb_build_object(
        'id',cv.id,'subject',coalesce(cv.subject,last_msg.subject,'محادثة بلا عنوان'),'status',cv.status,
        'companyId',cv.company_id,'companyLabel',coalesce(nullif(company.display_name,''),company.legal_name),
        'contactId',cv.contact_id,'contactLabel',contact.display_name,'transactionId',cv.transaction_id,
        'transactionLabel',transaction.type,'updatedAt',cv.updated_at,
        'latestMessage',case when last_msg.id is null then null else jsonb_build_object(
          'id',last_msg.id,'channel',last_msg.channel,'direction',last_msg.direction,'summary',last_msg.summary,
          'subject',last_msg.subject,'occurredAt',last_msg.occurred_at,'linkStatus',last_msg.link_status) end,
        'unreadCount',coalesce(unread.n,0),
        'awaitingParty',case
          when last_msg.id is null then null
          when last_msg.link_status in ('review_required','unmatched') then 'staff'
          when command.status in ('awaiting_approval','failed','reconciliation_required') then 'staff'
          when last_msg.direction='incoming' then 'staff'
          when last_msg.direction='outgoing' and coalesce(attempt.status,'queued') in ('failed','cancelled','queued') then 'staff'
          when last_msg.direction='outgoing' then 'client' else null end,
        'unansweredSince',case when last_msg.id is not null and (
          last_msg.direction='incoming' or last_msg.link_status in ('review_required','unmatched')
          or command.status in ('awaiting_approval','failed','reconciliation_required')) then last_msg.occurred_at else null end,
        'unansweredMinutes',case when last_msg.id is not null and (
          last_msg.direction='incoming' or last_msg.link_status in ('review_required','unmatched')
          or command.status in ('awaiting_approval','failed','reconciliation_required'))
          then greatest(0,floor(extract(epoch from (now()-last_msg.occurred_at))/60)::integer) else null end,
        'slaBreached',case when last_msg.id is not null and (
          last_msg.direction='incoming' or last_msg.link_status in ('review_required','unmatched')
          or command.status in ('awaiting_approval','failed','reconciliation_required'))
          then now()-last_msg.occurred_at > interval '4 hours' else false end,
        'transportStatus',attempt.status,'outboundStatus',command.status,'approvalStatus',command.approval_status,
        'canRetry',coalesce(command.status='failed' and attempt.status='failed' and attempt.provider_message_id is null,false),
        'needsReview',coalesce(last_msg.link_status in ('review_required','unmatched'),false),
        'needsAttention',coalesce(unread.n,0)>0 or coalesce(last_msg.link_status in ('review_required','unmatched'),false)
          or coalesce(command.status in ('awaiting_approval','failed','reconciliation_required'),false)
          or coalesce(last_msg.direction='incoming',false)
      ) payload
    from public.communication_conversations cv
    left join public.contacts contact on contact.workspace_id=cv.workspace_id and contact.id=cv.contact_id and contact.deleted_at is null
    left join public.companies company on company.workspace_id=cv.workspace_id and company.id=cv.company_id and company.deleted_at is null
    left join public.transactions transaction on transaction.workspace_id=cv.workspace_id and transaction.id=cv.transaction_id and transaction.deleted_at is null
    left join lateral (
      select c.id,c.channel,c.direction,c.summary,c.subject,c.body_text,c.occurred_at,c.link_status,c.link_version
      from public.communications c where c.workspace_id=cv.workspace_id and c.conversation_id=cv.id
      order by c.occurred_at desc,c.id desc limit 1
    ) last_msg on true
    left join public.communication_conversation_reads read_state
      on read_state.workspace_id=cv.workspace_id and read_state.conversation_id=cv.id and read_state.user_id=v_actor
    left join lateral (
      select count(*)::integer n from public.communications c
      where c.workspace_id=cv.workspace_id and c.conversation_id=cv.id and c.direction='incoming'
        and c.occurred_at>coalesce(read_state.last_read_at,'epoch'::timestamptz)
    ) unread on true
    left join lateral (
      select a.status,a.error_code,a.provider_message_id,a.last_event_at from public.communication_transport_attempts a
      where a.workspace_id=cv.workspace_id and a.communication_id=last_msg.id
      order by a.requested_at desc,a.id desc limit 1
    ) attempt on true
    left join lateral (
      select oc.status,oc.approval_status,oc.id command_id,oc.version from public.communication_outbound_commands oc
      where oc.workspace_id=cv.workspace_id and oc.communication_id=last_msg.id limit 1
    ) command on true
    where cv.workspace_id=p_workspace_id and (
      v_query is null or position(v_query in lower(coalesce(cv.subject,'')))>0
      or position(v_query in lower(coalesce(contact.display_name,'')))>0
      or position(v_query in lower(coalesce(company.display_name,company.legal_name,'')))>0
      or position(v_query in lower(coalesce(transaction.type,'')))>0
      or exists(select 1 from public.communications search_msg where search_msg.workspace_id=cv.workspace_id
        and search_msg.conversation_id=cv.id and position(v_query in lower(concat_ws(' ',coalesce(search_msg.subject,''),coalesce(search_msg.summary,''),coalesce(search_msg.body_text,''))))>0)
    )
    order by last_msg.occurred_at desc nulls last,cv.updated_at desc limit v_limit
  ) x;

  if p_conversation_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'channel',c.channel,'direction',c.direction,'subject',c.subject,'bodyText',c.body_text,'summary',c.summary,
      'occurredAt',c.occurred_at,'linkStatus',c.link_status,'linkVersion',c.link_version,
      'transportStatus',attempt.status,'transportErrorCode',attempt.error_code,'outboundCommandId',command.id,
      'outboundStatus',command.status,'approvalStatus',command.approval_status,'outboundVersion',command.version,
      'canRetry',coalesce(command.status='failed' and attempt.status='failed' and attempt.provider_message_id is null,false),
      'attachmentCount',coalesce(attachments.n,0)
    ) order by c.occurred_at,c.id),'[]'::jsonb) into v_timeline
    from public.communications c
    left join lateral (select a.status,a.error_code,a.provider_message_id from public.communication_transport_attempts a
      where a.workspace_id=c.workspace_id and a.communication_id=c.id order by a.requested_at desc,a.id desc limit 1) attempt on true
    left join lateral (select oc.id,oc.status,oc.approval_status,oc.version from public.communication_outbound_commands oc
      where oc.workspace_id=c.workspace_id and oc.communication_id=c.id limit 1) command on true
    left join lateral (select count(*)::integer n from public.communication_document_links dl
      where dl.workspace_id=c.workspace_id and dl.communication_id=c.id) attachments on true
    where c.workspace_id=p_workspace_id and c.conversation_id=p_conversation_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'communicationId',c.id,'conversationId',c.conversation_id,'channel',c.channel,'subject',c.subject,'summary',c.summary,
    'occurredAt',c.occurred_at,'linkStatus',c.link_status,'linkVersion',c.link_version
  ) order by c.occurred_at desc,c.id desc),'[]'::jsonb) into v_review
  from (select * from public.communications c0 where c0.workspace_id=p_workspace_id and c0.direction='incoming'
    and c0.link_status in ('review_required','unmatched') order by c0.occurred_at desc,c0.id desc limit 50) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',pa.id,'channel',pa.channel,'provider',pa.provider,'displayName',pa.display_name,'capabilities',pa.capabilities,'enabled',pa.enabled
  ) order by pa.channel,pa.display_name),'[]'::jsonb) into v_providers
  from public.communication_provider_accounts pa where pa.workspace_id=p_workspace_id and pa.enabled;

  select jsonb_build_object(
    'conversationCount',(select count(*) from public.communication_conversations cv where cv.workspace_id=p_workspace_id),
    'unreadCount',(select count(*) from public.communications c join public.communication_conversations cv on cv.workspace_id=c.workspace_id and cv.id=c.conversation_id
      left join public.communication_conversation_reads rs on rs.workspace_id=cv.workspace_id and rs.conversation_id=cv.id and rs.user_id=v_actor
      where c.workspace_id=p_workspace_id and c.direction='incoming' and c.occurred_at>coalesce(rs.last_read_at,'epoch'::timestamptz)),
    'reviewCount',(select count(*) from public.communications c where c.workspace_id=p_workspace_id and c.direction='incoming' and c.link_status in ('review_required','unmatched')),
    'failedCount',(select count(*) from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.status='failed'),
    'reconciliationCount',(select count(*) from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.status='reconciliation_required'),
    'awaitingApprovalCount',(select count(*) from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.status='awaiting_approval'),
    'slaMinutes',240
  ) into v_summary;

  return jsonb_build_object('workspaceId',p_workspace_id,'actorUserId',v_actor,'canGovern',true,'query',v_query,
    'selectedConversationId',p_conversation_id,'summary',v_summary,'providerAccounts',v_providers,'conversations',v_conversations,
    'timeline',v_timeline,'reviewQueue',v_review);
end;
$$;

create or replace function public.get_communications_hub_v1(p_workspace_id uuid,p_query text default null,p_conversation_id uuid default null,p_limit integer default 60)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_communications_hub_v1_impl($1,$2,$3,$4);
$$;

create or replace function private.mark_communication_conversation_read_v1_impl(p_workspace_id uuid,p_conversation_id uuid,p_expected_version integer default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_row public.communication_conversation_reads%rowtype;
begin
  v_actor:=private.require_communication_workspace_user_v1(p_workspace_id);
  if not exists(select 1 from public.communication_conversations cv where cv.workspace_id=p_workspace_id and cv.id=p_conversation_id) then
    raise no_data_found using message='ENJAZ_COMMUNICATION_CONVERSATION_NOT_FOUND';
  end if;
  select * into v_row from public.communication_conversation_reads r
  where r.workspace_id=p_workspace_id and r.conversation_id=p_conversation_id and r.user_id=v_actor for update;
  if found then
    if p_expected_version is not null and p_expected_version<>v_row.version then raise serialization_failure using message='ENJAZ_COMMUNICATION_READ_STALE'; end if;
    update public.communication_conversation_reads set last_read_at=now(),version=version+1
      where workspace_id=p_workspace_id and id=v_row.id returning * into v_row;
  else
    if p_expected_version is not null then raise serialization_failure using message='ENJAZ_COMMUNICATION_READ_CREATE_VERSION_INVALID'; end if;
    insert into public.communication_conversation_reads(workspace_id,conversation_id,user_id,last_read_at)
      values(p_workspace_id,p_conversation_id,v_actor,now()) returning * into v_row;
  end if;
  return jsonb_build_object('conversationId',p_conversation_id,'lastReadAt',v_row.last_read_at,'version',v_row.version);
end;
$$;

create or replace function public.mark_communication_conversation_read_v1(p_workspace_id uuid,p_conversation_id uuid,p_expected_version integer default null)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.mark_communication_conversation_read_v1_impl($1,$2,$3);
$$;

create or replace function private.retry_communication_outbound_v1_impl(p_workspace_id uuid,p_command_id uuid,p_expected_version integer)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid; v_command public.communication_outbound_commands%rowtype; v_attempt public.communication_transport_attempts%rowtype;
begin
  v_actor:=private.require_communication_owner_v1(p_workspace_id);
  select * into v_command from public.communication_outbound_commands oc where oc.workspace_id=p_workspace_id and oc.id=p_command_id for update;
  if not found then raise no_data_found using message='ENJAZ_COMMUNICATION_OUTBOUND_COMMAND_NOT_FOUND'; end if;
  if p_expected_version is null or p_expected_version<>v_command.version then raise serialization_failure using message='ENJAZ_COMMUNICATION_RETRY_STALE'; end if;
  if v_command.status='reconciliation_required' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED'; end if;
  if v_command.status<>'failed' then raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_RETRY_NOT_FAILED'; end if;
  select * into v_attempt from public.communication_transport_attempts a
    where a.workspace_id=p_workspace_id and a.communication_id=v_command.communication_id and a.provider_account_id=v_command.provider_account_id
      and a.idempotency_key=v_command.idempotency_key for update;
  if not found or v_attempt.status<>'failed' or v_attempt.provider_message_id is not null then
    raise object_not_in_prerequisite_state using message='ENJAZ_COMMUNICATION_RETRY_TRANSPORT_UNSAFE';
  end if;
  update public.communication_transport_attempts set status='queued',attempt_no=attempt_no+1,error_code=null,last_event_at=null,requested_at=now()
    where workspace_id=p_workspace_id and id=v_attempt.id returning * into v_attempt;
  update public.communication_outbound_commands set status='queued',dispatch_claimed_at=null,dispatch_token=null,version=version+1
    where workspace_id=p_workspace_id and id=p_command_id returning * into v_command;
  perform private.record_communication_audit_v1(p_workspace_id,v_actor,'communication.outbound.retry_queued','communication',v_command.communication_id,
    'Confirmed failed outbound communication queued for safe retry',jsonb_build_object('commandId',v_command.id,'attemptId',v_attempt.id,'attemptNo',v_attempt.attempt_no,'version',v_command.version));
  return jsonb_build_object('commandId',v_command.id,'communicationId',v_command.communication_id,'attemptId',v_attempt.id,
    'status',v_command.status,'attemptNo',v_attempt.attempt_no,'version',v_command.version);
end;
$$;

create or replace function public.retry_communication_outbound_v1(p_workspace_id uuid,p_command_id uuid,p_expected_version integer)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.retry_communication_outbound_v1_impl($1,$2,$3);
$$;

revoke all on function private.require_communication_workspace_user_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function private.get_communications_hub_v1_impl(uuid,text,uuid,integer) from public,anon,service_role;
grant execute on function private.get_communications_hub_v1_impl(uuid,text,uuid,integer) to authenticated;
revoke all on function private.mark_communication_conversation_read_v1_impl(uuid,uuid,integer) from public,anon,service_role;
grant execute on function private.mark_communication_conversation_read_v1_impl(uuid,uuid,integer) to authenticated;
revoke all on function private.retry_communication_outbound_v1_impl(uuid,uuid,integer) from public,anon,service_role;
grant execute on function private.retry_communication_outbound_v1_impl(uuid,uuid,integer) to authenticated;
revoke all on function public.get_communications_hub_v1(uuid,text,uuid,integer) from public,anon,service_role;
grant execute on function public.get_communications_hub_v1(uuid,text,uuid,integer) to authenticated;
revoke all on function public.mark_communication_conversation_read_v1(uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.mark_communication_conversation_read_v1(uuid,uuid,integer) to authenticated;
revoke all on function public.retry_communication_outbound_v1(uuid,uuid,integer) from public,anon,service_role;
grant execute on function public.retry_communication_outbound_v1(uuid,uuid,integer) to authenticated;

commit;