-- ENJAZ Phase 10.1 — Document Vault foreign-key index hardening
-- Keeps delete/update FK checks bounded without changing authority or API semantics.

create index if not exists document_upload_sessions_company_fk_idx
  on public.document_upload_sessions(workspace_id, company_id)
  where company_id is not null;

create index if not exists document_upload_sessions_transaction_fk_idx
  on public.document_upload_sessions(workspace_id, transaction_id)
  where transaction_id is not null;

create index if not exists document_upload_sessions_version_fk_idx
  on public.document_upload_sessions(workspace_id, document_version_id)
  where document_version_id is not null;

create index if not exists document_upload_sessions_created_by_fk_idx
  on public.document_upload_sessions(created_by);

create index if not exists documents_uploaded_by_fk_idx
  on public.documents(uploaded_by)
  where uploaded_by is not null;

create index if not exists document_versions_uploaded_by_fk_idx
  on public.document_versions(uploaded_by)
  where uploaded_by is not null;
