-- ENJAZ Phase 11.3-D — second fresh client session durability + idempotency probe
-- Runs after the client write probe in a new migration connection.

begin;

select set_config('p113d.request',r.id::text,true),
       set_config('p113d.ws',r.workspace_id::text,true),
       set_config('p113d.principal',r.principal_id::text,true),
       set_config('p113d.tx',r.transaction_id::text,true),
       set_config('p113d.client',p.user_id::text,true)
from public.client_portal_requests r
join public.client_portal_principals p on p.workspace_id=r.workspace_id and p.id=r.principal_id
where r.title='__ENJAZ_PHASE113_DURABLE__'
order by r.created_at desc limit 1;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p113d.client'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p113d.client'),true);
set local role authenticated;

do $$
declare v_model jsonb; v_replay jsonb; v_message_count integer;
begin
  if auth.uid()<>current_setting('p113d.client')::uuid then
    raise exception 'ENJAZ_PHASE113_RELOAD_AUTH_MISMATCH';
  end if;

  if jsonb_array_length(public.list_client_portal_invitations_v1())<>0 then
    raise exception 'ENJAZ_PHASE113_RELOAD_INVITATION_REAPPEARED';
  end if;
  if jsonb_array_length(public.list_client_portal_workspaces_v1())<>1 then
    raise exception 'ENJAZ_PHASE113_RELOAD_WORKSPACE_MISSING';
  end if;

  v_model:=public.get_client_portal_read_model_v1(current_setting('p113d.ws')::uuid);
  if not exists(
    select 1 from jsonb_array_elements(v_model->'requests') r
    where r->>'id'=current_setting('p113d.request') and r->>'status'='fulfilled'
  ) then
    raise exception 'ENJAZ_PHASE113_RELOAD_FULFILLED_REQUEST_MISSING';
  end if;
  if not exists(
    select 1 from jsonb_array_elements(v_model->'messages') m
    where m->>'id'=current_setting('p113d.request') and m->>'body'='__ENJAZ_PHASE113_DURABLE_MESSAGE__'
  ) then
    raise exception 'ENJAZ_PHASE113_RELOAD_MESSAGE_MISSING';
  end if;

  v_replay:=public.send_client_portal_message_v1(
    current_setting('p113d.ws')::uuid,current_setting('p113d.tx')::uuid,current_setting('p113d.request')::uuid,
    current_setting('p113d.request')::uuid,'__ENJAZ_PHASE113_DURABLE_MESSAGE__'
  );
  if not coalesce((v_replay->>'wasDuplicate')::boolean,false) then
    raise exception 'ENJAZ_PHASE113_RELOAD_IDEMPOTENCY_FAILED';
  end if;

  v_model:=public.get_client_portal_read_model_v1(current_setting('p113d.ws')::uuid);
  select count(*) into v_message_count
  from jsonb_array_elements(v_model->'messages') m
  where m->>'id'=current_setting('p113d.request');
  if v_message_count<>1 then
    raise exception 'ENJAZ_PHASE113_RELOAD_DUPLICATE_MESSAGE_CREATED';
  end if;
end $$;

reset role;
commit;
