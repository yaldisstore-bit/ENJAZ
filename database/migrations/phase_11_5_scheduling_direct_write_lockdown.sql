begin;

revoke insert, update on table public.calendar_events from authenticated;
revoke insert, update on table public.renewals from authenticated;

drop policy if exists calendar_events_insert_workspace on public.calendar_events;
drop policy if exists calendar_events_update_workspace on public.calendar_events;
drop policy if exists renewals_insert_workspace on public.renewals;
drop policy if exists renewals_update_workspace on public.renewals;

commit;
