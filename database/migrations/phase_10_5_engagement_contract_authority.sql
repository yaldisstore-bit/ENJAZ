-- ENJAZ Phase 10.5 — Engagement/Contract Document Layer — M16
-- Canonical contract revision authority layered on top of Phase 7 commercial_engagements
-- and Phase 10 Document Factory/Vault. No shadow engagement, document, or money store.

begin;

create table if not exists public.engagement_contract_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  engagement_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  status text not null default 'draft' check (status in (
    'draft','under_review','approved','signature_pending','signed',
    'effective','expired','terminated','superseded'
  )),
  template_version_id uuid not null,
  draft_id uuid not null,
  document_id uuid,
  document_version_id uuid,
  supersedes_revision_number integer,
  effective_on date,
  expires_on date,
  signed_at timestamptz,
  signature_provenance jsonb not null default '{}'::jsonb,
  termination_note text,
  idempotency_key uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint engagement_contract_revisions_workspace_id_id_key unique (workspace_id,id),
  constraint engagement_contract_revisions_number_unique unique (workspace_id,engagement_id,revision_number),
  constraint engagement_contract_revisions_idempotency_unique unique (workspace_id,idempotency_key),
  constraint engagement_contract_revisions_engagement_fk foreign key (workspace_id,engagement_id)
    references public.commercial_engagements(workspace_id,id) on delete restrict,
  constraint engagement_contract_revisions_template_version_fk foreign key (workspace_id,template_version_id)
    references public.document_template_versions(workspace_id,id) on delete restrict,
  constraint engagement_contract_revisions_draft_fk foreign key (workspace_id,draft_id)
    references public.document_drafts(workspace_id,id) on delete restrict,
  constraint engagement_contract_revisions_document_version_fk foreign key (workspace_id,document_id,document_version_id)
    references public.document_versions(workspace_id,document_id,id) on delete restrict,
  constraint engagement_contract_revisions_lineage_check check (
    (revision_number = 1 and supersedes_revision_number is null)
    or (revision_number > 1 and supersedes_revision_number = revision_number - 1)
  ),
  constraint engagement_contract_revisions_artifact_pair_check check ((document_id is null) = (document_version_id is null)),
  constraint engagement_contract_revisions_signature_provenance_check check (jsonb_typeof(signature_provenance) = 'object'),
  constraint engagement_contract_revisions_date_range_check check (expires_on is null or effective_on is null or expires_on >= effective_on),
  constraint engagement_contract_revisions_termination_note_check check (termination_note is null or char_length(btrim(termination_note)) between 1 and 1000),
  constraint engagement_contract_revisions_signed_authority_check check (
    status not in ('signed','effective','expired','terminated','superseded')
    or (
      document_id is not null
      and document_version_id is not null
      and signed_at is not null
      and signature_provenance <> '{}'::jsonb
    )
  ),
  constraint engagement_contract_revisions_effective_date_check check (
    status not in ('effective','expired','terminated') or effective_on is not null
  ),
  constraint engagement_contract_revisions_expiry_check check (status <> 'expired' or expires_on is not null),
  constraint engagement_contract_revisions_pre_signature_check check (
    status not in ('draft','under_review','approved')
    or (document_id is null and document_version_id is null and signed_at is null and signature_provenance = '{}'::jsonb)
  )
);

create index if not exists engagement_contract_revisions_engagement_idx
  on public.engagement_contract_revisions(workspace_id,engagement_id,revision_number desc);
create index if not exists engagement_contract_revisions_status_idx
  on public.engagement_contract_revisions(workspace_id,status,updated_at desc);
create index if not exists engagement_contract_revisions_document_idx
  on public.engagement_contract_revisions(workspace_id,document_id,document_version_id)
  where document_id is not null and document_version_id is not null;
create index if not exists engagement_contract_revisions_draft_idx
  on public.engagement_contract_revisions(workspace_id,draft_id);

alter table public.engagement_contract_revisions enable row level security;

create policy engagement_contract_revisions_select_workspace
on public.engagement_contract_revisions for select to authenticated
using (
  (select auth.uid()) is not null
  and workspace_id in (
    select wm.workspace_id
    from public.workspace_memberships wm
    where wm.user_id = (select auth.uid())
  )
);

revoke all on table public.engagement_contract_revisions from public, anon, authenticated;
grant select on table public.engagement_contract_revisions to authenticated;

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
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_CONTRACT_AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN';
  end if;
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
        'revisionId',v_existing.id,
        'engagementId',v_existing.engagement_id,
        'revision',v_existing.revision_number,
        'status',v_existing.status,
        'wasDuplicate',true
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
    or v_draft.status not in ('draft','review_required','approved') then
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
      'engagementId',p_engagement_id,
      'revision',v_row.revision_number,
      'templateVersionId',p_template_version_id,
      'draftId',p_draft_id,
      'idempotencyKey',p_idempotency_key
    )
  );

  return jsonb_build_object(
    'revisionId',v_row.id,
    'engagementId',v_row.engagement_id,
    'revision',v_row.revision_number,
    'status',v_row.status,
    'wasDuplicate',false
  );
end;
$$;

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
  if v_actor is null then
    raise insufficient_privilege using message = 'ENJAZ_CONTRACT_AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.workspace_memberships wm
    where wm.workspace_id = p_workspace_id and wm.user_id = v_actor
  ) then
    raise insufficient_privilege using message = 'ENJAZ_CONTRACT_WORKSPACE_FORBIDDEN';
  end if;
  if p_to_status is null or p_to_status not in (
    'draft','under_review','approved','signature_pending','signed',
    'effective','expired','terminated','superseded'
  ) then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_STATUS_INVALID';
  end if;
  if p_note is not null and (char_length(btrim(p_note)) < 1 or char_length(btrim(p_note)) > 1000) then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_NOTE_INVALID';
  end if;

  select * into v_row
  from public.engagement_contract_revisions r
  where r.workspace_id = p_workspace_id and r.id = p_revision_id
  for update;
  if not found then
    raise no_data_found using message = 'ENJAZ_CONTRACT_REVISION_NOT_FOUND';
  end if;

  v_allowed :=
    (v_row.status = 'draft' and p_to_status = 'under_review')
    or (v_row.status = 'under_review' and p_to_status in ('draft','approved'))
    or (v_row.status = 'approved' and p_to_status in ('under_review','signature_pending'))
    or (v_row.status = 'signature_pending' and p_to_status in ('approved','signed'))
    or (v_row.status = 'signed' and p_to_status in ('effective','superseded'))
    or (v_row.status = 'effective' and p_to_status in ('expired','terminated','superseded'))
    or (v_row.status in ('expired','terminated') and p_to_status = 'superseded');

  if not v_allowed then
    raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_TRANSITION_INVALID';
  end if;

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
    if v_expires_on is null then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_EXPIRY_REQUIRED';
    end if;
    if v_expires_on > current_date then
      raise invalid_parameter_value using message = 'ENJAZ_CONTRACT_NOT_YET_EXPIRED';
    end if;
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
    if not found then
      raise foreign_key_violation using message = 'ENJAZ_CONTRACT_ENGAGEMENT_INVALID';
    end if;
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
      'engagementId',v_row.engagement_id,
      'revision',v_row.revision_number,
      'status',v_row.status,
      'documentId',v_row.document_id,
      'documentVersionId',v_row.document_version_id,
      'effectiveOn',v_row.effective_on,
      'expiresOn',v_row.expires_on,
      'note',case when p_note is null then null else btrim(p_note) end
    )
  );

  return jsonb_build_object(
    'revisionId',v_row.id,
    'engagementId',v_row.engagement_id,
    'revision',v_row.revision_number,
    'status',v_row.status,
    'documentId',v_row.document_id,
    'documentVersionId',v_row.document_version_id,
    'effectiveOn',v_row.effective_on,
    'expiresOn',v_row.expires_on,
    'signedAt',v_row.signed_at
  );
end;
$$;

revoke all on function public.create_engagement_contract_revision_v1(uuid,uuid,uuid,uuid,text,uuid) from public, anon;
revoke all on function public.transition_engagement_contract_revision_v1(uuid,uuid,text,uuid,uuid,date,date,jsonb,text) from public, anon;
grant execute on function public.create_engagement_contract_revision_v1(uuid,uuid,uuid,uuid,text,uuid) to authenticated;
grant execute on function public.transition_engagement_contract_revision_v1(uuid,uuid,text,uuid,uuid,date,date,jsonb,text) to authenticated;

commit;
