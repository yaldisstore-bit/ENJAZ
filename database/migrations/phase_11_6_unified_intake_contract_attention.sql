-- ENJAZ Phase 11.6-D — unified intake/contract attention read projection.
-- Projection only: no shadow store and no owning-authority mutation.

begin;

create or replace function private.list_unified_intake_contract_attention_v1_impl(
  p_workspace_id uuid,
  p_kind text default 'all',
  p_include_terminal boolean default false,
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_kind text:=lower(btrim(coalesce(p_kind,'all')));
  v_timezone text;
  v_items jsonb;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);

  if v_kind not in ('all','intake_followup','client_approval','contract_renewal') then
    raise invalid_parameter_value using message='ENJAZ_116D_ATTENTION_KIND_INVALID';
  end if;
  if p_limit is null or p_limit<1 or p_limit>500 then
    raise invalid_parameter_value using message='ENJAZ_116D_ATTENTION_LIMIT_INVALID';
  end if;

  select w.timezone into v_timezone
  from public.workspaces w
  where w.id=p_workspace_id;
  if not found or nullif(btrim(v_timezone),'') is null then
    raise object_not_in_prerequisite_state using message='ENJAZ_116D_WORKSPACE_TIMEZONE_MISSING';
  end if;

  with intake_rows as (
    select
      f.id,
      f.expires_at as sort_at,
      jsonb_build_object(
        'id',f.id,
        'kind','intake_followup',
        'authority','intake_submissions',
        'evidenceAuthority','intake_followup_requests',
        'canonicalId',f.submission_id,
        'title',f.title,
        'state',case
          when f.status='revoked' then 'revoked'
          when f.status='open' and f.expires_at<=now() then 'expired'
          when f.status='responded' then 'responded'
          else 'open'
        end,
        'attentionState',case
          when f.status='revoked' or (f.status='open' and f.expires_at<=now()) then 'terminal'
          when f.status='responded' then 'response_ready'
          else 'waiting_external'
        end,
        'stale',s.version<>f.expected_submission_version,
        'mode',f.mode,
        'requestKind',f.request_kind,
        'dueAt',f.expires_at,
        'decision',null,
        'communicationEvidence',false,
        'companyId',null,
        'transactionId',f.portal_transaction_id,
        'contractRevisionId',null,
        'sourceVersion',f.version,
        'canonicalVersion',s.version,
        'ownerSurface','intake_review'
      ) item
    from private.intake_followup_requests f
    join public.intake_submissions s
      on s.workspace_id=f.workspace_id and s.id=f.submission_id
    where f.workspace_id=p_workspace_id
      and v_kind in ('all','intake_followup')
      and (
        p_include_terminal
        or (f.status='open' and f.expires_at>now())
        or f.status='responded'
      )
  ),
  approval_rows as (
    select
      b.request_id as id,
      coalesce(r.due_at,r.valid_until,b.bound_at) as sort_at,
      jsonb_build_object(
        'id',b.request_id,
        'kind','client_approval',
        'authority','client_portal_requests',
        'evidenceAuthority','contract_approval_bridge_bindings',
        'canonicalId',b.revision_id,
        'title',r.title,
        'state',case
          when r.status='cancelled' or r.revoked_at is not null then 'revoked'
          when r.status='open' and r.valid_until is not null and r.valid_until<=now() then 'expired'
          when b.reconciled_at is not null then 'reconciled'
          when response.id is not null then 'decision_ready'
          else 'awaiting_client'
        end,
        'attentionState',case
          when r.status='cancelled' or r.revoked_at is not null
            or (r.status='open' and r.valid_until is not null and r.valid_until<=now())
            or b.reconciled_at is not null then 'terminal'
          when response.id is not null then 'action_required'
          else 'waiting_external'
        end,
        'stale',b.reconciled_at is null and cr.version<>b.revision_version_at_issue,
        'mode','client_portal',
        'requestKind','approval',
        'dueAt',coalesce(r.due_at,r.valid_until),
        'decision',response.decision,
        'communicationEvidence',false,
        'companyId',e.company_id,
        'transactionId',r.transaction_id,
        'contractRevisionId',b.revision_id,
        'sourceVersion',r.version,
        'canonicalVersion',cr.version,
        'ownerSurface','documents'
      ) item
    from private.contract_approval_bridge_bindings b
    join public.client_portal_requests r
      on r.workspace_id=b.workspace_id and r.id=b.request_id
    join public.engagement_contract_revisions cr
      on cr.workspace_id=b.workspace_id and cr.id=b.revision_id
    join public.commercial_engagements e
      on e.workspace_id=cr.workspace_id and e.id=cr.engagement_id and e.deleted_at is null
    left join lateral (
      select x.id,x.decision
      from public.client_portal_document_approval_responses x
      where x.workspace_id=b.workspace_id and x.request_id=b.request_id
      order by x.responded_at desc,x.id
      limit 1
    ) response on true
    where b.workspace_id=p_workspace_id
      and v_kind in ('all','client_approval')
      and (
        p_include_terminal
        or (
          b.reconciled_at is null
          and r.status<>'cancelled'
          and r.revoked_at is null
        )
      )
  ),
  renewal_rows as (
    select
      r.id,
      (r.due_date::timestamp at time zone v_timezone) as sort_at,
      jsonb_build_object(
        'id',r.id,
        'kind','contract_renewal',
        'authority','renewals',
        'evidenceAuthority','contract_renewal_communication_evidence',
        'canonicalId',r.id,
        'title',r.title,
        'state',r.status,
        'attentionState',case
          when r.status in ('completed','cancelled') then 'terminal'
          when cr.status<>'effective' or cr.expires_on is null or r.due_date<>cr.expires_on then 'conflict'
          when r.due_date<(now() at time zone v_timezone)::date then 'overdue'
          when r.due_date=(now() at time zone v_timezone)::date then 'due_today'
          else 'upcoming'
        end,
        'stale',cr.status<>'effective' or cr.expires_on is null or r.due_date<>cr.expires_on,
        'mode','canonical_renewal',
        'requestKind','renewal',
        'dueAt',r.due_date,
        'decision',null,
        'communicationEvidence',evidence.communication_id is not null,
        'companyId',r.company_id,
        'transactionId',r.transaction_id,
        'contractRevisionId',r.contract_revision_id,
        'sourceVersion',r.version,
        'canonicalVersion',cr.version,
        'ownerSurface','calendar'
      ) item
    from public.renewals r
    join public.engagement_contract_revisions cr
      on cr.workspace_id=r.workspace_id and cr.id=r.contract_revision_id
    left join lateral (
      select x.communication_id
      from private.contract_renewal_communication_evidence x
      where x.workspace_id=r.workspace_id and x.renewal_id=r.id
      order by x.created_at desc,x.operation_id
      limit 1
    ) evidence on true
    where r.workspace_id=p_workspace_id
      and r.contract_revision_id is not null
      and v_kind in ('all','contract_renewal')
      and (p_include_terminal or r.status='active')
  ),
  all_rows as (
    select * from intake_rows
    union all select * from approval_rows
    union all select * from renewal_rows
  ),
  selected_rows as (
    select id,sort_at,item
    from all_rows
    order by
      case item->>'attentionState'
        when 'conflict' then 0
        when 'action_required' then 1
        when 'overdue' then 2
        when 'due_today' then 3
        when 'response_ready' then 4
        when 'waiting_external' then 5
        when 'upcoming' then 6
        else 7
      end,
      sort_at nulls last,
      id
    limit p_limit
  )
  select coalesce(jsonb_agg(item order by
    case item->>'attentionState'
      when 'conflict' then 0
      when 'action_required' then 1
      when 'overdue' then 2
      when 'due_today' then 3
      when 'response_ready' then 4
      when 'waiting_external' then 5
      when 'upcoming' then 6
      else 7
    end,
    sort_at nulls last,id
  ),'[]'::jsonb)
  into v_items
  from selected_rows;

  return jsonb_build_object(
    'schema','enjaz.intake-contract-attention.v1',
    'workspaceId',p_workspace_id,
    'workspaceTimezone',v_timezone,
    'kind',v_kind,
    'includeTerminal',p_include_terminal,
    'generatedAt',now(),
    'items',v_items
  );
end;
$$;

create or replace function public.list_unified_intake_contract_attention_v1(
  p_workspace_id uuid,
  p_kind text default 'all',
  p_include_terminal boolean default false,
  p_limit integer default 200
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.list_unified_intake_contract_attention_v1_impl(
    p_workspace_id,p_kind,p_include_terminal,p_limit
  );
$$;

revoke all on function private.list_unified_intake_contract_attention_v1_impl(uuid,text,boolean,integer)
  from public,anon;
grant execute on function private.list_unified_intake_contract_attention_v1_impl(uuid,text,boolean,integer)
  to authenticated,service_role;
revoke all on function public.list_unified_intake_contract_attention_v1(uuid,text,boolean,integer)
  from public,anon,service_role;
grant execute on function public.list_unified_intake_contract_attention_v1(uuid,text,boolean,integer)
  to authenticated;

commit;
