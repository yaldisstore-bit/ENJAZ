-- ENJAZ Phase 10.5 — contract creation hardening
-- A canonical final Document Factory draft may be imported into a new contract revision;
-- this enables governed adoption of already-finalized official documents without copying them.

begin;

create or replace function public.create_engagement_contract_revision_v1(
  p_workspace_id uuid,
  p_engagement_id uuid,
  p_template_version_id uuid,
  p_draft_id uuid,
  p_title text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_engagement public.commercial_engagements%rowtype;
  v_draft public.document_drafts%rowtype;
  v_template public.document_template_versions%rowtype;
  v_existing public.engagement_contract_revisions%rowtype;
  v_previous public.engagement_contract_revisions%rowtype;
  v_revision integer;
  v_row public.engagement_contract_revisions%rowtype;
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_CONTRACT_AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then raise insufficient_privilege using message = 'ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN'; end if;
  if p_idempotency_key is null or p_title is null or char_length(btrim(p_title)) not between 1 and 320 then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_CREATE_INVALID';
  end if;

  select * into v_existing
  from public.engagement_contract_revisions r
  where r.workspace_id = p_workspace_id and r.idempotency_key = p_idempotency_key
  limit 1;
  if found then
    if v_existing.engagement_id = p_engagement_id
      and v_existing.template_version_id = p_template_version_id
      and v_existing.draft_id = p_draft_id
      and v_existing.title = btrim(p_title) then
      return jsonb_build_object(
        'revisionId',v_existing.id,'engagementId',v_existing.engagement_id,
        'revision',v_existing.revision_number,'status',v_existing.status,'wasDuplicate',true
      );
    end if;
    raise unique_violation using message = 'ENJAZ_CONTRACT_IDEMPOTENCY_CONFLICT';
  end if;

  select * into v_engagement
  from public.commercial_engagements e
  where e.workspace_id = p_workspace_id and e.id = p_engagement_id
  for update;
  if not found or v_engagement.deleted_at is not null then
    raise foreign_key_violation using message = 'ENJAZ_CONTRACT_ENGAGEMENT_INVALID';
  end if;

  select * into v_template
  from public.document_template_versions tv
  where tv.workspace_id = p_workspace_id and tv.id = p_template_version_id;
  if not found or v_template.status <> 'published' then
    raise foreign_key_violation using message = 'ENJAZ_CONTRACT_TEMPLATE_VERSION_INVALID';
  end if;

  select * into v_draft
  from public.document_drafts d
  where d.workspace_id = p_workspace_id and d.id = p_draft_id
  for update;
  if not found
    or v_draft.template_version_id is distinct from p_template_version_id
    or v_draft.company_id is distinct from v_engagement.company_id
    or v_draft.status not in ('draft','review_required','approved','final') then
    raise foreign_key_violation using message = 'ENJAZ_CONTRACT_DRAFT_INVALID';
  end if;

  select * into v_previous
  from public.engagement_contract_revisions r
  where r.workspace_id = p_workspace_id and r.engagement_id = p_engagement_id
  order by r.revision_number desc
  limit 1
  for update;

  if found then
    if v_previous.status <> 'superseded' then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_PREVIOUS_REVISION_NOT_SUPERSEDED';
    end if;
    v_revision := v_previous.revision_number + 1;
  else
    v_revision := 1;
  end if;

  insert into public.engagement_contract_revisions(
    workspace_id,engagement_id,revision_number,title,status,template_version_id,draft_id,
    supersedes_revision_number,idempotency_key,created_by,updated_by
  ) values (
    p_workspace_id,p_engagement_id,v_revision,btrim(p_title),'draft',p_template_version_id,p_draft_id,
    case when v_revision > 1 then v_revision - 1 else null end,p_idempotency_key,v_actor,v_actor
  ) returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values (
    p_workspace_id,v_actor,'engagement.contract.revision.created','engagement_contract_revision',v_row.id,
    'Created governed engagement contract revision',
    jsonb_build_object(
      'engagementId',p_engagement_id,'revision',v_row.revision_number,
      'templateVersionId',p_template_version_id,'draftId',p_draft_id,'idempotencyKey',p_idempotency_key
    )
  );

  return jsonb_build_object(
    'revisionId',v_row.id,'engagementId',v_row.engagement_id,
    'revision',v_row.revision_number,'status',v_row.status,'wasDuplicate',false
  );
end;
$$;

revoke all on function public.create_engagement_contract_revision_v1(uuid,uuid,uuid,uuid,text,uuid) from public, anon;
grant execute on function public.create_engagement_contract_revision_v1(uuid,uuid,uuid,uuid,text,uuid) to authenticated;

commit;
