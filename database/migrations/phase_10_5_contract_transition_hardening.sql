-- ENJAZ Phase 10.5 — contract transition hardening
-- Returning signature_pending -> approved must release the unsigned artifact binding.

begin;

create or replace function public.transition_engagement_contract_revision_v1(
  p_workspace_id uuid,
  p_revision_id uuid,
  p_to_status text,
  p_document_id uuid default null,
  p_document_version_id uuid default null,
  p_effective_on date default null,
  p_expires_on date default null,
  p_signature_provenance jsonb default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.engagement_contract_revisions%rowtype;
  v_draft public.document_drafts%rowtype;
  v_engagement public.commercial_engagements%rowtype;
  v_allowed boolean := false;
  v_document_id uuid;
  v_document_version_id uuid;
  v_effective_on date;
  v_expires_on date;
  v_signature_provenance jsonb;
  v_now timestamptz := now();
begin
  if v_actor is null then raise insufficient_privilege using message = 'ENJAZ_CONTRACT_AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then raise insufficient_privilege using message = 'ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN'; end if;
  if p_to_status is null or p_to_status not in (
    'draft','under_review','approved','signature_pending','signed',
    'effective','expired','terminated','superseded'
  ) then raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_STATUS_INVALID'; end if;
  if p_note is not null and (char_length(btrim(p_note)) < 1 or char_length(btrim(p_note)) > 1000) then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_NOTE_INVALID';
  end if;

  select * into v_row
  from public.engagement_contract_revisions r
  where r.workspace_id = p_workspace_id and r.id = p_revision_id
  for update;
  if not found then raise no_data_found using message = 'ENJAZ_CONTRACT_REVISION_NOT_FOUND'; end if;

  v_allowed :=
    (v_row.status = 'draft' and p_to_status = 'under_review')
    or (v_row.status = 'under_review' and p_to_status in ('draft','approved'))
    or (v_row.status = 'approved' and p_to_status in ('under_review','signature_pending'))
    or (v_row.status = 'signature_pending' and p_to_status in ('approved','signed'))
    or (v_row.status = 'signed' and p_to_status in ('effective','superseded'))
    or (v_row.status = 'effective' and p_to_status in ('expired','terminated','superseded'))
    or (v_row.status in ('expired','terminated') and p_to_status = 'superseded');
  if not v_allowed then raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_TRANSITION_INVALID'; end if;

  v_document_id := v_row.document_id;
  v_document_version_id := v_row.document_version_id;
  v_effective_on := coalesce(p_effective_on,v_row.effective_on);
  v_expires_on := coalesce(p_expires_on,v_row.expires_on);
  v_signature_provenance := v_row.signature_provenance;

  if v_effective_on is not null and v_expires_on is not null and v_expires_on < v_effective_on then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_DATE_RANGE_INVALID';
  end if;

  if p_to_status = 'signature_pending' then
    if p_document_id is null or p_document_version_id is null then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_SIGNABLE_ARTIFACT_REQUIRED';
    end if;
    select * into v_draft
    from public.document_drafts d
    where d.workspace_id = p_workspace_id and d.id = v_row.draft_id;
    if not found or v_draft.status <> 'final'
      or v_draft.final_document_id is distinct from p_document_id
      or v_draft.final_document_version_id is distinct from p_document_version_id then
      raise foreign_key_violation using message = 'ENJAZ_CONTRACT_FINAL_ARTIFACT_INVALID';
    end if;
    v_document_id := p_document_id;
    v_document_version_id := p_document_version_id;
  elsif v_row.status = 'signature_pending' and p_to_status = 'approved' then
    v_document_id := null;
    v_document_version_id := null;
  elsif p_document_id is not null or p_document_version_id is not null then
    if p_document_id is distinct from v_document_id or p_document_version_id is distinct from v_document_version_id then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_SIGNED_ARTIFACT_IMMUTABLE';
    end if;
  end if;

  if p_to_status = 'signed' then
    if v_document_id is null or v_document_version_id is null then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_SIGNABLE_ARTIFACT_REQUIRED';
    end if;
    if p_signature_provenance is null
      or jsonb_typeof(p_signature_provenance) <> 'object'
      or p_signature_provenance = '{}'::jsonb then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_SIGNATURE_PROVENANCE_REQUIRED';
    end if;
    v_signature_provenance := p_signature_provenance;
  elsif p_signature_provenance is not null and p_signature_provenance is distinct from v_signature_provenance then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_SIGNATURE_PROVENANCE_IMMUTABLE';
  end if;

  if p_to_status in ('effective','expired','terminated') and v_effective_on is null then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_EFFECTIVE_DATE_REQUIRED';
  end if;
  if p_to_status = 'expired' then
    if v_expires_on is null then raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_EXPIRY_REQUIRED'; end if;
    if v_expires_on > current_date then raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_NOT_YET_EXPIRED'; end if;
  end if;
  if p_to_status = 'terminated' and p_note is null then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_TERMINATION_NOTE_REQUIRED';
  end if;

  update public.engagement_contract_revisions
  set status = p_to_status,
      document_id = v_document_id,
      document_version_id = v_document_version_id,
      effective_on = v_effective_on,
      expires_on = v_expires_on,
      signed_at = case when p_to_status = 'signed' then v_now else signed_at end,
      signature_provenance = v_signature_provenance,
      termination_note = case when p_to_status = 'terminated' then btrim(p_note) else termination_note end,
      updated_by = v_actor,
      updated_at = v_now
  where workspace_id = p_workspace_id and id = p_revision_id
  returning * into v_row;

  if p_to_status in ('effective','expired','terminated') then
    select * into v_engagement
    from public.commercial_engagements e
    where e.workspace_id = p_workspace_id and e.id = v_row.engagement_id
    for update;
    if not found then raise foreign_key_violation using message = 'ENJAZ_CONTRACT_ENGAGEMENT_INVALID'; end if;
    update public.commercial_engagements
    set status = case p_to_status
          when 'effective' then 'active'
          when 'expired' then 'completed'
          when 'terminated' then 'cancelled'
          else status
        end,
        start_on = case when p_to_status = 'effective' then coalesce(start_on,v_effective_on) else start_on end,
        end_on = case
          when p_to_status = 'effective' then coalesce(v_expires_on,end_on)
          when p_to_status = 'expired' then v_expires_on
          when p_to_status = 'terminated' then current_date
          else end_on
        end,
        updated_at = v_now
    where workspace_id = p_workspace_id and id = v_row.engagement_id;
  end if;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values (
    p_workspace_id,v_actor,'engagement.contract.revision.transitioned','engagement_contract_revision',v_row.id,
    'Transitioned governed engagement contract revision',
    jsonb_build_object(
      'engagementId',v_row.engagement_id,'revision',v_row.revision_number,'status',v_row.status,
      'documentId',v_row.document_id,'documentVersionId',v_row.document_version_id,
      'effectiveOn',v_row.effective_on,'expiresOn',v_row.expires_on,
      'note',case when p_note is null then null else btrim(p_note) end
    )
  );

  return jsonb_build_object(
    'revisionId',v_row.id,'engagementId',v_row.engagement_id,'revision',v_row.revision_number,
    'status',v_row.status,'documentId',v_row.document_id,'documentVersionId',v_row.document_version_id,
    'effectiveOn',v_row.effective_on,'expiresOn',v_row.expires_on,'signedAt',v_row.signed_at
  );
end;
$$;

revoke all on function public.transition_engagement_contract_revision_v1(uuid,uuid,text,uuid,uuid,date,date,jsonb,text) from public, anon;
grant execute on function public.transition_engagement_contract_revision_v1(uuid,uuid,text,uuid,uuid,date,date,jsonb,text) to authenticated;

commit;
