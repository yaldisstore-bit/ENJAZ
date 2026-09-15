-- ENJAZ Phase 11.3B hardening — internal authority-event writer is never browser-callable.
-- Governed SECURITY DEFINER mutation implementations call this helper as the function owner.

begin;

revoke all on function private.record_client_portal_authority_event_v1(uuid,uuid,uuid,uuid,text,text,jsonb)
from authenticated;

commit;
