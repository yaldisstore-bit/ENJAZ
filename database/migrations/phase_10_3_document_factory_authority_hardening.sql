-- ENJAZ Phase 10.3 — Document Factory authority hardening
-- Keep direct authenticated writes restricted to a clean, unissued working draft.
begin;

alter table public.document_drafts
  drop constraint if exists document_drafts_draft_authority_fields_check;
alter table public.document_drafts
  add constraint document_drafts_draft_authority_fields_check
  check (
    status <> 'draft'
    or (
      approved_by is null
      and approved_at is null
      and finalized_by is null
      and finalized_at is null
      and final_document_id is null
      and final_document_version_id is null
    )
  );

drop policy if exists document_drafts_direct_insert_workspace on public.document_drafts;
drop policy if exists document_drafts_direct_update_workspace on public.document_drafts;

create policy document_drafts_direct_insert_workspace on public.document_drafts
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
    and approved_by is null
    and approved_at is null
    and finalized_by is null
    and finalized_at is null
    and final_document_id is null
    and final_document_version_id is null
  );

create policy document_drafts_direct_update_workspace on public.document_drafts
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
    and approved_by is null
    and approved_at is null
    and finalized_by is null
    and finalized_at is null
    and final_document_id is null
    and final_document_version_id is null
  )
  with check (
    (select auth.uid()) is not null
    and workspace_id in (
      select wm.workspace_id
      from public.workspace_memberships wm
      where wm.user_id=(select auth.uid())
    )
    and status='draft'
    and approved_by is null
    and approved_at is null
    and finalized_by is null
    and finalized_at is null
    and final_document_id is null
    and final_document_version_id is null
  );

comment on constraint document_drafts_draft_authority_fields_check on public.document_drafts is
  'Phase 10.3: an authenticated browser-editable draft cannot carry approval, finalization or issued-document authority fields.';

commit;
