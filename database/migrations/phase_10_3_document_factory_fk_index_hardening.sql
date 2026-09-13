-- ENJAZ Phase 10.3 — Document Factory FK/index hardening
-- Cover the composite final issued-document reference used by document_drafts.
begin;

create index if not exists document_drafts_final_document_version_fk_idx
  on public.document_drafts(workspace_id,final_document_id,final_document_version_id)
  where final_document_id is not null and final_document_version_id is not null;

commit;
