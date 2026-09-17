-- ENJAZ Phase 11.6-B — public secure-link capability boundary
-- anon has no USAGE on schema private. Public token façades intentionally execute as definer,
-- matching the existing public intake capability model while keeping all staff commands invoker-owned.
begin;

alter function public.get_public_intake_followup_v1(text) security definer;
alter function public.save_public_intake_followup_v1(text,jsonb,boolean) security definer;

-- The public definer façades own the anonymous capability. No browser role calls private impls directly.
revoke all on function private.get_public_intake_followup_v1_impl(text) from public,anon,authenticated,service_role;
revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public,anon,authenticated,service_role;

revoke all on function public.get_public_intake_followup_v1(text) from public,service_role;
grant execute on function public.get_public_intake_followup_v1(text) to anon,authenticated;
revoke all on function public.save_public_intake_followup_v1(text,jsonb,boolean) from public,service_role;
grant execute on function public.save_public_intake_followup_v1(text,jsonb,boolean) to anon,authenticated;

commit;
