-- ENJAZ Phase 11.3-D — Client Portal performance hardening
-- Cover every Phase-11.3-owned foreign-key access path reported by the Real Cloud
-- performance advisor. This changes no authority, RLS or business semantics.

begin;

create index if not exists cp_appointment_responses_actor_idx
  on public.client_portal_appointment_responses(actor_user_id);
create index if not exists cp_appointment_responses_request_scope_idx
  on public.client_portal_appointment_responses(workspace_id,principal_id,request_id,transaction_id);

create index if not exists cp_authority_events_actor_idx
  on public.client_portal_authority_events(actor_user_id);
create index if not exists cp_authority_events_grant_idx
  on public.client_portal_authority_events(workspace_id,grant_id);

create index if not exists cp_approval_responses_actor_idx
  on public.client_portal_document_approval_responses(actor_user_id);
create index if not exists cp_approval_responses_document_idx
  on public.client_portal_document_approval_responses(workspace_id,document_id);
create index if not exists cp_approval_responses_draft_idx
  on public.client_portal_document_approval_responses(workspace_id,draft_id);
create index if not exists cp_approval_responses_request_scope_idx
  on public.client_portal_document_approval_responses(workspace_id,principal_id,request_id,transaction_id);
create index if not exists cp_approval_responses_share_idx
  on public.client_portal_document_approval_responses(workspace_id,resource_share_id);

create index if not exists cp_approval_targets_created_by_idx
  on public.client_portal_document_approval_targets(created_by);
create index if not exists cp_approval_targets_document_idx
  on public.client_portal_document_approval_targets(workspace_id,document_id);
create index if not exists cp_approval_targets_draft_idx
  on public.client_portal_document_approval_targets(workspace_id,draft_id);
create index if not exists cp_approval_targets_request_scope_idx
  on public.client_portal_document_approval_targets(workspace_id,principal_id,request_id,transaction_id);
create index if not exists cp_approval_targets_share_idx
  on public.client_portal_document_approval_targets(workspace_id,resource_share_id);

create index if not exists cp_grants_company_fk_idx
  on public.client_portal_grants(workspace_id,company_id);
create index if not exists cp_grants_created_by_idx
  on public.client_portal_grants(created_by);
create index if not exists cp_grants_transaction_fk_idx
  on public.client_portal_grants(workspace_id,transaction_id);

create index if not exists cp_messages_actor_idx
  on public.client_portal_messages(actor_user_id);
create index if not exists cp_messages_request_scope_idx
  on public.client_portal_messages(workspace_id,principal_id,request_id,transaction_id);
create index if not exists cp_messages_transaction_fk_idx
  on public.client_portal_messages(workspace_id,transaction_id);

create index if not exists cp_principals_created_by_idx
  on public.client_portal_principals(created_by);

create index if not exists cp_read_receipts_actor_idx
  on public.client_portal_request_read_receipts(actor_user_id);
create index if not exists cp_read_receipts_request_scope_idx
  on public.client_portal_request_read_receipts(workspace_id,principal_id,request_id,transaction_id);

create index if not exists cp_requested_uploads_actor_idx
  on public.client_portal_requested_document_uploads(actor_user_id);
create index if not exists cp_requested_uploads_document_idx
  on public.client_portal_requested_document_uploads(workspace_id,document_id);
create index if not exists cp_requested_uploads_request_scope_idx
  on public.client_portal_requested_document_uploads(workspace_id,principal_id,request_id,transaction_id);

create index if not exists cp_requests_created_by_idx
  on public.client_portal_requests(created_by);
create index if not exists cp_requests_revoked_by_idx
  on public.client_portal_requests(revoked_by);
create index if not exists cp_requests_transaction_fk_idx
  on public.client_portal_requests(workspace_id,transaction_id);

create index if not exists cp_resource_shares_created_by_idx
  on public.client_portal_resource_shares(created_by);
create index if not exists cp_resource_shares_document_fk_idx
  on public.client_portal_resource_shares(workspace_id,document_id);
create index if not exists cp_resource_shares_payment_fk_idx
  on public.client_portal_resource_shares(workspace_id,payment_id);
create index if not exists cp_resource_shares_revoked_by_idx
  on public.client_portal_resource_shares(revoked_by);
create index if not exists cp_resource_shares_transaction_fk_idx
  on public.client_portal_resource_shares(workspace_id,transaction_id);

commit;
