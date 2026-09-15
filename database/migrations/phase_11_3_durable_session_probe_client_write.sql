-- ENJAZ Phase 11.3-D — fresh client session activation + write probe
-- Runs in a separate migration connection from the fixture.

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
declare v_inv jsonb; v_model jsonb; v_send jsonb;
begin
  if auth.uid()<>current_setting('p113d.client')::uuid then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_AUTH_MISMATCH';
  end if;

  v_inv:=public.list_client_portal_invitations_v1();
  if jsonb_array_length(v_inv)<>1 then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_INVITATION_DISCOVERY_FAILED';
  end if;

  perform public.activate_client_portal_invitation_v1(current_setting('p113d.ws')::uuid,1);

  if jsonb_array_length(public.list_client_portal_workspaces_v1())<>1 then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_WORKSPACE_DISCOVERY_FAILED';
  end if;

  v_model:=public.get_client_portal_read_model_v1(current_setting('p113d.ws')::uuid);
  if not exists(
    select 1 from jsonb_array_elements(v_model->'requests') r
    where r->>'id'=current_setting('p113d.request') and r->>'status'='open'
  ) then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_REQUEST_MISSING';
  end if;

  v_send:=public.send_client_portal_message_v1(
    current_setting('p113d.ws')::uuid,current_setting('p113d.tx')::uuid,current_setting('p113d.request')::uuid,
    current_setting('p113d.request')::uuid,'__ENJAZ_PHASE113_DURABLE_MESSAGE__'
  );
  if coalesce((v_send->>'wasDuplicate')::boolean,true) then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_FIRST_WRITE_MARKED_DUPLICATE';
  end if;

  v_model:=public.get_client_portal_read_model_v1(current_setting('p113d.ws')::uuid);
  if not exists(
    select 1 from jsonb_array_elements(v_model->'requests') r
    where r->>'id'=current_setting('p113d.request') and r->>'status'='fulfilled'
  ) then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_WRITE_NOT_PROJECTED';
  end if;
  if not exists(
    select 1 from jsonb_array_elements(v_model->'messages') m
    where m->>'id'=current_setting('p113d.request') and m->>'body'='__ENJAZ_PHASE113_DURABLE_MESSAGE__'
  ) then
    raise exception 'ENJAZ_PHASE113_FRESH_SESSION_MESSAGE_NOT_PROJECTED';
  end if;
end $$;

reset role;
commit;
