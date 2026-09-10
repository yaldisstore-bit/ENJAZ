-- ENJAZ Phase 9.2 — Global Search invoker bridge repair
-- The public RPC is SECURITY INVOKER, so the authenticated caller must be able to
-- execute the private helper it delegates to. The private schema itself remains
-- outside the exposed Data API; anon retains no execution authority.

begin;

revoke all on function private.global_search_v1_impl(uuid,text,integer) from public,anon,authenticated;
grant execute on function private.global_search_v1_impl(uuid,text,integer) to authenticated;

revoke all on function public.global_search_v1(uuid,text,integer) from public,anon;
grant execute on function public.global_search_v1(uuid,text,integer) to authenticated;

commit;
