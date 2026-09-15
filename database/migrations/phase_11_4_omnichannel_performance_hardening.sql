-- ENJAZ Phase 11.4-B — performance / exact-binding hardening
-- Covers every M4 foreign key reported by Supabase Performance Advisor and prevents
-- duplicate copies of the exact same endpoint-to-target binding while preserving
-- ambiguity across genuinely different targets.

begin;

create index communication_channel_consents_updated_by_fk_idx
  on public.communication_channel_consents(updated_by)
  where updated_by is not null;

create index communication_conversations_created_by_fk_idx
  on public.communication_conversations(created_by)
  where created_by is not null;

create index communication_endpoint_bindings_company_fk_idx
  on public.communication_endpoint_bindings(workspace_id,company_id)
  where company_id is not null;
create index communication_endpoint_bindings_transaction_fk_idx
  on public.communication_endpoint_bindings(workspace_id,transaction_id)
  where transaction_id is not null;
create index communication_endpoint_bindings_created_by_fk_idx
  on public.communication_endpoint_bindings(created_by)
  where created_by is not null;

create unique index communication_endpoint_bindings_exact_target_key
  on public.communication_endpoint_bindings(
    workspace_id,provider_account_id,endpoint_fingerprint,company_id,contact_id,transaction_id
  ) nulls not distinct;

create index communication_provider_accounts_created_by_fk_idx
  on public.communication_provider_accounts(created_by)
  where created_by is not null;

create index communication_relink_events_old_conversation_fk_idx
  on public.communication_relink_events(workspace_id,old_conversation_id)
  where old_conversation_id is not null;
create index communication_relink_events_new_conversation_fk_idx
  on public.communication_relink_events(workspace_id,new_conversation_id)
  where new_conversation_id is not null;
create index communication_relink_events_old_company_fk_idx
  on public.communication_relink_events(workspace_id,old_company_id)
  where old_company_id is not null;
create index communication_relink_events_new_company_fk_idx
  on public.communication_relink_events(workspace_id,new_company_id)
  where new_company_id is not null;
create index communication_relink_events_old_contact_fk_idx
  on public.communication_relink_events(workspace_id,old_contact_id)
  where old_contact_id is not null;
create index communication_relink_events_new_contact_fk_idx
  on public.communication_relink_events(workspace_id,new_contact_id)
  where new_contact_id is not null;
create index communication_relink_events_old_transaction_fk_idx
  on public.communication_relink_events(workspace_id,old_transaction_id)
  where old_transaction_id is not null;
create index communication_relink_events_new_transaction_fk_idx
  on public.communication_relink_events(workspace_id,new_transaction_id)
  where new_transaction_id is not null;

create index communication_transport_events_attempt_fk_idx
  on public.communication_transport_events(workspace_id,attempt_id,provider_account_id,occurred_at desc);

commit;
