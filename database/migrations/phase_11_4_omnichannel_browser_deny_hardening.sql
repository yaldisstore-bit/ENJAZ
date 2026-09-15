-- ENJAZ Phase 11.4-B — explicit browser fail-closed hardening
-- Supporting M4 tables are server-side authority only. These restrictive policies
-- keep them denied even if a browser table privilege is accidentally reintroduced.

begin;

create policy communication_conversations_browser_deny
on public.communication_conversations
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_provider_accounts_browser_deny
on public.communication_provider_accounts
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_endpoint_bindings_browser_deny
on public.communication_endpoint_bindings
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_channel_consents_browser_deny
on public.communication_channel_consents
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_transport_attempts_browser_deny
on public.communication_transport_attempts
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_transport_events_browser_deny
on public.communication_transport_events
as restrictive for all to anon,authenticated
using (false) with check (false);

create policy communication_relink_events_browser_deny
on public.communication_relink_events
as restrictive for all to anon,authenticated
using (false) with check (false);

-- Canonical communications already has legacy workspace RLS policies, but M4 keeps
-- the raw canonical table backend-only. This restrictive policy prevents accidental
-- browser exposure if a direct table privilege is reintroduced later.
create policy communications_m4_browser_deny
on public.communications
as restrictive for all to anon,authenticated
using (false) with check (false);

commit;
