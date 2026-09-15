-- ENJAZ Phase 11.3-D — cleanup for the durable fresh-session probe
-- Removes every phase-owned fixture/action row and proves zero residue.

begin;

select set_config('p113d.request',r.id::text,true),
       set_config('p113d.ws',r.workspace_id::text,true),
       set_config('p113d.principal',r.principal_id::text,true)
from public.client_portal_requests r
where r.title='__ENJAZ_PHASE113_DURABLE__'
order by r.created_at desc limit 1;

do $$
begin
  if nullif(current_setting('p113d.request',true),'') is null then
    raise exception 'ENJAZ_PHASE113_DURABLE_CLEANUP_FIXTURE_NOT_FOUND';
  end if;
end $$;

delete from public.client_portal_messages
where principal_id=current_setting('p113d.principal')::uuid;

delete from public.client_portal_requests
where principal_id=current_setting('p113d.principal')::uuid;

delete from public.client_portal_authority_events
where principal_id=current_setting('p113d.principal')::uuid;

delete from public.client_portal_grants
where principal_id=current_setting('p113d.principal')::uuid;

delete from public.client_portal_principals
where id=current_setting('p113d.principal')::uuid;

delete from public.audit_events
where workspace_id=current_setting('p113d.ws')::uuid
  and (
    details->>'principalId'=current_setting('p113d.principal')
    or entity_id=current_setting('p113d.request')::uuid
    or (summary='Client portal governed action' and details->>'requestId'=current_setting('p113d.request'))
  );

do $$
begin
  if exists(select 1 from public.client_portal_requests where title='__ENJAZ_PHASE113_DURABLE__')
     or exists(select 1 from public.client_portal_messages where body='__ENJAZ_PHASE113_DURABLE_MESSAGE__')
     or exists(select 1 from public.client_portal_principals where id=current_setting('p113d.principal')::uuid)
     or exists(select 1 from public.client_portal_grants where principal_id=current_setting('p113d.principal')::uuid) then
    raise exception 'ENJAZ_PHASE113_DURABLE_CLEANUP_RESIDUE';
  end if;
end $$;

commit;
