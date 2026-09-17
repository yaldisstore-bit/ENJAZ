-- ENJAZ Phase 11.6-B — Intake follow-up & client information loop
-- Canonical intake truth stays in public.intake_submissions.
-- Follow-up request state is private bridge evidence only.
-- Client Portal mode delegates request creation/revocation to existing M3 owning commands.
begin;

create table private.intake_followup_token_secret (
  singleton boolean primary key default true check (singleton),
  secret bytea not null check (octet_length(secret)=32),
  created_at timestamptz not null default now()
);
insert into private.intake_followup_token_secret(singleton,secret)
values(true,extensions.gen_random_bytes(32));
revoke all on table private.intake_followup_token_secret from public,anon,authenticated,service_role;

create table private.intake_followup_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  submission_id uuid not null,
  mode text not null check (mode in ('secure_link','client_portal')),
  request_kind text not null check (request_kind in ('information','document')),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  instructions text check (instructions is null or char_length(btrim(instructions)) between 1 and 2400),
  requested_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(requested_fields)='array'),
  token_hash text check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  portal_principal_id uuid,
  portal_transaction_id uuid,
  portal_request_id uuid,
  portal_request_version_at_issue integer check (portal_request_version_at_issue is null or portal_request_version_at_issue>0),
  source_submission_version integer not null check (source_submission_version>0),
  expected_submission_version integer not null check (expected_submission_version>0),
  draft_patch jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_patch)='object'),
  response_patch jsonb check (response_patch is null or jsonb_typeof(response_patch)='object'),
  status text not null default 'open' check (status in ('open','responded','revoked')),
  expires_at timestamptz not null,
  idempotency_key uuid not null,
  version integer not null default 1 check (version>0),
  requested_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  constraint intake_followup_requests_workspace_id_id_key unique(workspace_id,id),
  constraint intake_followup_requests_submission_fk foreign key(workspace_id,submission_id)
    references public.intake_submissions(workspace_id,id) on delete cascade,
  constraint intake_followup_requests_portal_principal_fk foreign key(workspace_id,portal_principal_id)
    references public.client_portal_principals(workspace_id,id) on delete restrict,
  constraint intake_followup_requests_portal_request_fk foreign key(workspace_id,portal_request_id)
    references public.client_portal_requests(workspace_id,id) on delete restrict,
  constraint intake_followup_requests_idempotency_key unique(workspace_id,idempotency_key),
  constraint intake_followup_requests_mode_binding_check check (
    (mode='secure_link' and request_kind='information' and token_hash is not null
      and portal_principal_id is null and portal_transaction_id is null and portal_request_id is null and portal_request_version_at_issue is null)
    or
    (mode='client_portal' and token_hash is null
      and portal_principal_id is not null and portal_transaction_id is not null and portal_request_id is not null and portal_request_version_at_issue is not null)
  ),
  constraint intake_followup_requests_terminal_check check (
    (status='open' and responded_at is null and revoked_at is null)
    or (status='responded' and responded_at is not null and revoked_at is null and response_patch is not null)
    or (status='revoked' and revoked_at is not null and responded_at is null)
  )
);
create unique index intake_followup_requests_token_hash_key
  on private.intake_followup_requests(token_hash) where token_hash is not null;
create unique index intake_followup_requests_one_open_per_submission
  on private.intake_followup_requests(workspace_id,submission_id) where status='open';
create index intake_followup_requests_portal_request_idx
  on private.intake_followup_requests(workspace_id,portal_request_id) where portal_request_id is not null;
revoke all on table private.intake_followup_requests from public,anon,authenticated,service_role;

create or replace function private.intake_followup_token_v1(
  p_workspace_id uuid,p_submission_id uuid,p_idempotency_key uuid
) returns text
language plpgsql stable security definer set search_path='' as $$
declare v_secret bytea;
begin
  select secret into v_secret from private.intake_followup_token_secret where singleton=true;
  if v_secret is null then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_SECRET_MISSING'; end if;
  return encode(
    extensions.hmac(convert_to(p_workspace_id::text||':'||p_submission_id::text||':'||p_idempotency_key::text,'UTF8'),v_secret,'sha256'),
    'hex'
  );
end; $$;

create or replace function private.validate_intake_followup_patch_v1(
  p_workspace_id uuid,p_form_id uuid,p_requested_fields jsonb,p_patch jsonb
) returns void
language plpgsql stable security definer set search_path='' as $$
declare v_key text; v_value jsonb;
begin
  if jsonb_typeof(coalesce(p_requested_fields,'[]'::jsonb))<>'array'
     or jsonb_typeof(coalesce(p_patch,'{}'::jsonb))<>'object' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_PAYLOAD_INVALID';
  end if;
  if exists(select 1 from jsonb_array_elements(p_requested_fields) x where jsonb_typeof(x)<>'string') then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_FIELDS_INVALID';
  end if;
  if jsonb_array_length(p_requested_fields)<>(select count(distinct value)::integer from jsonb_array_elements_text(p_requested_fields)) then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_FIELDS_DUPLICATE';
  end if;
  if exists(
    select 1 from jsonb_array_elements_text(p_requested_fields) x(field_key)
    where not exists(
      select 1 from public.intake_form_fields f
      where f.workspace_id=p_workspace_id and f.form_id=p_form_id and f.field_key=x.field_key
    )
  ) then raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_FIELD_UNKNOWN'; end if;
  for v_key,v_value in select key,value from jsonb_each(p_patch) loop
    if not (p_requested_fields ? v_key) then
      raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_PATCH_SCOPE_INVALID';
    end if;
    if jsonb_typeof(v_value)<>'string' or char_length(btrim(v_value#>>'{}')) not between 1 and 2400 then
      raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_PATCH_VALUE_INVALID';
    end if;
  end loop;
end; $$;

create or replace function private.require_live_intake_followup_v1(p_token text)
returns private.intake_followup_requests
language plpgsql volatile security definer set search_path='' as $$
declare v_hash text; v_row private.intake_followup_requests%rowtype; v_submission public.intake_submissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_TOKEN_INVALID';
  end if;
  v_hash:=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex');
  select * into v_row from private.intake_followup_requests r
  where r.token_hash=v_hash and r.mode='secure_link' for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_NOT_FOUND'; end if;
  if v_row.status='revoked' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_REVOKED'; end if;
  if v_row.expires_at<=now() then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_EXPIRED'; end if;
  if v_row.status='responded' then return v_row; end if;
  select * into v_submission from public.intake_submissions s
  where s.workspace_id=v_row.workspace_id and s.id=v_row.submission_id;
  if not found or v_submission.status<>'under_review' then
    raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STATE_CHANGED';
  end if;
  if v_submission.version<>v_row.expected_submission_version then
    raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STALE';
  end if;
  return v_row;
end; $$;

create or replace function private.issue_intake_followup_v1_impl(
  p_workspace_id uuid,p_submission_id uuid,p_expected_submission_version integer,
  p_mode text,p_request_kind text,p_requested_fields jsonb,p_title text,p_instructions text,
  p_expires_in_hours integer,p_idempotency_key uuid,
  p_portal_principal_id uuid default null,p_portal_transaction_id uuid default null,p_portal_request_id uuid default null
) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=private.require_crm_member_v1(p_workspace_id);
  v_submission public.intake_submissions%rowtype;
  v_link public.intake_links%rowtype;
  v_existing private.intake_followup_requests%rowtype;
  v_row private.intake_followup_requests%rowtype;
  v_portal jsonb;
  v_portal_version integer;
  v_token text;
  v_hash text;
  v_fields jsonb:=coalesce(p_requested_fields,'[]'::jsonb);
begin
  if p_idempotency_key is null or p_expected_submission_version is null or p_expected_submission_version<1
     or p_mode not in ('secure_link','client_portal') or p_request_kind not in ('information','document')
     or char_length(btrim(coalesce(p_title,''))) not between 1 and 320
     or p_expires_in_hours is null or p_expires_in_hours not between 1 and 720 then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_REQUEST_INVALID';
  end if;
  if p_instructions is not null and char_length(btrim(p_instructions)) not between 1 and 2400 then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_INSTRUCTIONS_INVALID';
  end if;
  if p_request_kind='information' and jsonb_array_length(v_fields)=0 then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_FIELDS_REQUIRED';
  end if;
  if p_mode='secure_link' and p_request_kind<>'information' then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_DOCUMENT_REQUIRES_PORTAL';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text||':'||p_idempotency_key::text,0));
  select * into v_existing from private.intake_followup_requests r
  where r.workspace_id=p_workspace_id and r.idempotency_key=p_idempotency_key;
  if found then
    if v_existing.submission_id<>p_submission_id or v_existing.source_submission_version<>p_expected_submission_version
       or v_existing.mode<>p_mode or v_existing.request_kind<>p_request_kind
       or v_existing.requested_fields<>v_fields or v_existing.title<>btrim(p_title)
       or v_existing.instructions is distinct from nullif(btrim(coalesce(p_instructions,'')),'')
       or v_existing.portal_principal_id is distinct from p_portal_principal_id
       or v_existing.portal_transaction_id is distinct from p_portal_transaction_id
       or v_existing.portal_request_id is distinct from p_portal_request_id then
      raise unique_violation using message='ENJAZ_INTAKE_FOLLOWUP_IDEMPOTENCY_CONFLICT';
    end if;
    v_token:=case when v_existing.mode='secure_link' then private.intake_followup_token_v1(p_workspace_id,p_submission_id,p_idempotency_key) else null end;
    return jsonb_build_object(
      'followupId',v_existing.id,'submissionId',v_existing.submission_id,'mode',v_existing.mode,'requestKind',v_existing.request_kind,
      'status',v_existing.status,'version',v_existing.version,'submissionVersion',v_existing.expected_submission_version,
      'portalRequestId',v_existing.portal_request_id,'token',v_token,'expiresAt',v_existing.expires_at,'wasDuplicate',true
    );
  end if;

  select * into v_submission from public.intake_submissions s
  where s.workspace_id=p_workspace_id and s.id=p_submission_id for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_NOT_FOUND'; end if;
  if v_submission.version<>p_expected_submission_version then raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STALE'; end if;
  if v_submission.status not in ('submitted','under_review') then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STATE_INVALID'; end if;
  if exists(select 1 from private.intake_followup_requests r where r.workspace_id=p_workspace_id and r.submission_id=p_submission_id and r.status='open') then
    raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_ALREADY_OPEN';
  end if;
  perform private.validate_intake_followup_patch_v1(p_workspace_id,v_submission.form_id,v_fields,'{}'::jsonb);

  select * into v_link from public.intake_links l
  where l.workspace_id=p_workspace_id and l.id=v_submission.link_id;
  if not found then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_LINK_MISSING'; end if;

  if p_mode='client_portal' then
    if p_portal_principal_id is null or p_portal_transaction_id is null or p_portal_request_id is null then
      raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_SCOPE_REQUIRED';
    end if;
    if v_link.lead_id is null or not exists(
      select 1 from public.crm_leads l
      where l.workspace_id=p_workspace_id and l.id=v_link.lead_id and l.converted_transaction_id=p_portal_transaction_id
    ) then raise insufficient_privilege using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_TRANSACTION_UNBOUND'; end if;
    v_portal:=public.save_client_portal_request_v1(
      p_workspace_id,p_portal_principal_id,p_portal_request_id,null,p_portal_transaction_id,p_request_kind,
      btrim(p_title),nullif(btrim(coalesce(p_instructions,'')),''),null,now(),now()+make_interval(hours=>p_expires_in_hours),null
    );
    v_portal_version:=(v_portal->>'version')::integer;
  else
    if p_portal_principal_id is not null or p_portal_transaction_id is not null or p_portal_request_id is not null then
      raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_SECURE_SCOPE_INVALID';
    end if;
    v_token:=private.intake_followup_token_v1(p_workspace_id,p_submission_id,p_idempotency_key);
    v_hash:=encode(extensions.digest(convert_to(v_token,'UTF8'),'sha256'),'hex');
  end if;

  if v_submission.status='submitted' then
    update public.intake_submissions
      set status='under_review',version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=p_submission_id
    returning * into v_submission;
  end if;

  insert into private.intake_followup_requests(
    workspace_id,submission_id,mode,request_kind,title,instructions,requested_fields,token_hash,
    portal_principal_id,portal_transaction_id,portal_request_id,portal_request_version_at_issue,
    source_submission_version,expected_submission_version,expires_at,idempotency_key,requested_by
  ) values(
    p_workspace_id,p_submission_id,p_mode,p_request_kind,btrim(p_title),nullif(btrim(coalesce(p_instructions,'')),''),v_fields,v_hash,
    p_portal_principal_id,p_portal_transaction_id,p_portal_request_id,v_portal_version,
    p_expected_submission_version,v_submission.version,now()+make_interval(hours=>p_expires_in_hours),p_idempotency_key,v_actor
  ) returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'intake.followup.requested','intake_submission',p_submission_id,'Governed intake follow-up requested',
    jsonb_build_object('followupId',v_row.id,'mode',v_row.mode,'requestKind',v_row.request_kind,'portalRequestId',v_row.portal_request_id,
      'requestedFields',v_row.requested_fields,'expiresAt',v_row.expires_at,'idempotencyKey',p_idempotency_key,
      'sourceSubmissionVersion',p_expected_submission_version,'expectedSubmissionVersion',v_submission.version)
  );

  return jsonb_build_object(
    'followupId',v_row.id,'submissionId',v_row.submission_id,'mode',v_row.mode,'requestKind',v_row.request_kind,
    'status',v_row.status,'version',v_row.version,'submissionVersion',v_row.expected_submission_version,
    'portalRequestId',v_row.portal_request_id,'token',v_token,'expiresAt',v_row.expires_at,'wasDuplicate',false
  );
end; $$;

create or replace function public.issue_intake_followup_v1(
  uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.issue_intake_followup_v1_impl($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13);
$$;

create or replace function private.get_public_intake_followup_v1_impl(p_token text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_row private.intake_followup_requests%rowtype; v_submission public.intake_submissions%rowtype; v_form public.intake_forms%rowtype;
begin
  v_row:=private.require_live_intake_followup_v1(p_token);
  select * into v_submission from public.intake_submissions s where s.workspace_id=v_row.workspace_id and s.id=v_row.submission_id;
  select * into v_form from public.intake_forms f where f.workspace_id=v_row.workspace_id and f.id=v_submission.form_id;
  return jsonb_build_object(
    'publicAuthority','non_authoritative_followup_input','followupId',v_row.id,'status',v_row.status,
    'title',v_row.title,'instructions',v_row.instructions,'expiresAt',v_row.expires_at,
    'submissionVersion',v_row.expected_submission_version,
    'form',jsonb_build_object('title',v_form.public_title,'fields',coalesce((
      select jsonb_agg(jsonb_build_object('key',x.field_key,'label',x.label,'type',x.field_type,'required',x.required,'config',x.config) order by x.position)
      from public.intake_form_fields x
      where x.workspace_id=v_row.workspace_id and x.form_id=v_submission.form_id and v_row.requested_fields ? x.field_key
    ),'[]'::jsonb)),
    'draftPatch',case when v_row.status='open' then v_row.draft_patch else '{}'::jsonb end
  );
end; $$;

create or replace function public.get_public_intake_followup_v1(text)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.get_public_intake_followup_v1_impl($1);
$$;

create or replace function private.save_public_intake_followup_v1_impl(p_token text,p_patch jsonb,p_finalize boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_row private.intake_followup_requests%rowtype;
  v_submission public.intake_submissions%rowtype;
  v_patch jsonb:=coalesce(p_patch,'{}'::jsonb);
begin
  v_row:=private.require_live_intake_followup_v1(p_token);
  if v_row.status='responded' then
    if coalesce(p_finalize,false) and v_row.response_patch=v_patch then
      return jsonb_build_object(
        'followupId',v_row.id,'submissionId',v_row.submission_id,'status','responded','version',v_row.version,
        'submissionVersion',v_row.expected_submission_version+1,'authoritative',false,'wasDuplicate',true
      );
    end if;
    raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_ALREADY_RESPONDED';
  end if;

  select * into v_submission from public.intake_submissions s
  where s.workspace_id=v_row.workspace_id and s.id=v_row.submission_id for update;
  if not found or v_submission.status<>'under_review' or v_submission.version<>v_row.expected_submission_version then
    raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STALE';
  end if;
  perform private.validate_intake_followup_patch_v1(v_row.workspace_id,v_submission.form_id,v_row.requested_fields,v_patch);

  if not coalesce(p_finalize,false) then
    update private.intake_followup_requests set draft_patch=v_patch,version=version+1,updated_at=now()
    where id=v_row.id returning * into v_row;
    return jsonb_build_object(
      'followupId',v_row.id,'submissionId',v_row.submission_id,'status','open','version',v_row.version,
      'submissionVersion',v_submission.version,'authoritative',false,'wasDuplicate',false
    );
  end if;

  if v_patch='{}'::jsonb then raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_RESPONSE_EMPTY'; end if;
  update public.intake_submissions
    set answers=answers||v_patch,version=version+1,updated_at=now()
  where workspace_id=v_row.workspace_id and id=v_row.submission_id
  returning * into v_submission;

  update private.intake_followup_requests
    set draft_patch='{}'::jsonb,response_patch=v_patch,status='responded',responded_at=now(),version=version+1,updated_at=now()
  where id=v_row.id returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    v_row.workspace_id,null,'intake.followup.responded','intake_submission',v_row.submission_id,
    'Secure intake follow-up response merged into canonical submission',
    jsonb_build_object('followupId',v_row.id,'updatedFields',(select jsonb_agg(key) from jsonb_each(v_patch)),'newSubmissionVersion',v_submission.version)
  );

  return jsonb_build_object(
    'followupId',v_row.id,'submissionId',v_row.submission_id,'status',v_row.status,'version',v_row.version,
    'submissionVersion',v_submission.version,'authoritative',false,'wasDuplicate',false
  );
end; $$;

create or replace function public.save_public_intake_followup_v1(text,jsonb,boolean)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.save_public_intake_followup_v1_impl($1,$2,$3);
$$;

create or replace function private.reconcile_portal_intake_followup_v1_impl(
  p_workspace_id uuid,p_followup_id uuid,p_expected_followup_version integer,p_expected_submission_version integer,p_answer_patch jsonb
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=private.require_crm_member_v1(p_workspace_id);
  v_row private.intake_followup_requests%rowtype;
  v_submission public.intake_submissions%rowtype;
  v_request public.client_portal_requests%rowtype;
  v_patch jsonb:=coalesce(p_answer_patch,'{}'::jsonb);
  v_has_evidence boolean:=false;
begin
  select * into v_row from private.intake_followup_requests r
  where r.workspace_id=p_workspace_id and r.id=p_followup_id for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_NOT_FOUND'; end if;
  if v_row.mode<>'client_portal' then raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_NOT_PORTAL'; end if;
  if v_row.version<>p_expected_followup_version then raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_STALE'; end if;
  if v_row.status<>'open' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_NOT_OPEN'; end if;
  if v_row.expires_at<=now() then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_EXPIRED'; end if;

  select * into v_request from public.client_portal_requests q
  where q.workspace_id=p_workspace_id and q.id=v_row.portal_request_id;
  if not found or v_request.principal_id<>v_row.portal_principal_id or v_request.transaction_id<>v_row.portal_transaction_id
     or v_request.request_type<>v_row.request_kind or v_request.revoked_at is not null or v_request.status<>'fulfilled'
     or v_request.version<=v_row.portal_request_version_at_issue then
    raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_REQUEST_NOT_FULFILLED';
  end if;

  if v_row.request_kind='information' then
    select exists(
      select 1 from public.client_portal_messages m
      join public.client_portal_principals p on p.workspace_id=m.workspace_id and p.id=m.principal_id
      where m.workspace_id=p_workspace_id and m.request_id=v_row.portal_request_id
        and m.principal_id=v_row.portal_principal_id and m.actor_user_id=p.user_id and m.created_at>=v_row.created_at
    ) into v_has_evidence;
  else
    select exists(
      select 1 from public.client_portal_requested_document_uploads u
      where u.workspace_id=p_workspace_id and u.request_id=v_row.portal_request_id
        and u.principal_id=v_row.portal_principal_id and u.status='acknowledged' and u.acknowledged_at>=v_row.created_at
    ) into v_has_evidence;
  end if;
  if not v_has_evidence then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_RESPONSE_MISSING'; end if;

  select * into v_submission from public.intake_submissions s
  where s.workspace_id=p_workspace_id and s.id=v_row.submission_id for update;
  if not found or v_submission.status<>'under_review' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STATE_CHANGED'; end if;
  if v_submission.version<>p_expected_submission_version or v_submission.version<>v_row.expected_submission_version then
    raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_STALE';
  end if;
  perform private.validate_intake_followup_patch_v1(p_workspace_id,v_submission.form_id,v_row.requested_fields,v_patch);
  if v_row.request_kind='information' and v_patch='{}'::jsonb then
    raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_RESPONSE_EMPTY';
  end if;

  if v_patch<>'{}'::jsonb then
    update public.intake_submissions
      set answers=answers||v_patch,version=version+1,updated_at=now()
    where workspace_id=p_workspace_id and id=v_submission.id
    returning * into v_submission;
  end if;

  update private.intake_followup_requests
    set response_patch=v_patch,status='responded',responded_at=now(),version=version+1,updated_at=now()
  where id=v_row.id returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'intake.followup.portal_reconciled','intake_submission',v_submission.id,
    'Client Portal follow-up evidence reconciled into intake review',
    jsonb_build_object('followupId',v_row.id,'portalRequestId',v_row.portal_request_id,'requestKind',v_row.request_kind,
      'updatedFields',case when v_patch='{}'::jsonb then '[]'::jsonb else (select jsonb_agg(key) from jsonb_each(v_patch)) end,
      'newSubmissionVersion',v_submission.version)
  );

  return jsonb_build_object(
    'followupId',v_row.id,'submissionId',v_submission.id,'status',v_row.status,'version',v_row.version,
    'submissionVersion',v_submission.version,'portalRequestId',v_row.portal_request_id
  );
end; $$;

create or replace function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.reconcile_portal_intake_followup_v1_impl($1,$2,$3,$4,$5);
$$;

create or replace function private.revoke_intake_followup_v1_impl(
  p_workspace_id uuid,p_followup_id uuid,p_expected_version integer,p_reason text
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  v_actor uuid:=private.require_crm_member_v1(p_workspace_id);
  v_row private.intake_followup_requests%rowtype;
  v_portal public.client_portal_requests%rowtype;
  v_reason text:=btrim(coalesce(p_reason,''));
begin
  if char_length(v_reason) not between 1 and 800 then raise invalid_parameter_value using message='ENJAZ_INTAKE_FOLLOWUP_REVOKE_REASON_INVALID'; end if;
  select * into v_row from private.intake_followup_requests r
  where r.workspace_id=p_workspace_id and r.id=p_followup_id for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_NOT_FOUND'; end if;
  if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_INTAKE_FOLLOWUP_STALE'; end if;
  if v_row.status='revoked' then
    return jsonb_build_object('followupId',v_row.id,'status','revoked','version',v_row.version,'wasDuplicate',true);
  end if;
  if v_row.status<>'open' then raise object_not_in_prerequisite_state using message='ENJAZ_INTAKE_FOLLOWUP_NOT_OPEN'; end if;

  if v_row.mode='client_portal' then
    select * into v_portal from public.client_portal_requests q
    where q.workspace_id=p_workspace_id and q.id=v_row.portal_request_id for update;
    if not found then raise no_data_found using message='ENJAZ_INTAKE_FOLLOWUP_PORTAL_REQUEST_NOT_FOUND'; end if;
    if v_portal.revoked_at is null and v_portal.status='open' then
      perform private.revoke_client_portal_request_v1_impl(p_workspace_id,v_row.portal_request_id,v_portal.version,v_reason);
    end if;
  end if;

  update private.intake_followup_requests
    set status='revoked',revoked_at=now(),version=version+1,updated_at=now()
  where id=v_row.id returning * into v_row;

  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details)
  values(
    p_workspace_id,v_actor,'intake.followup.revoked','intake_submission',v_row.submission_id,
    'Governed intake follow-up revoked',jsonb_build_object('followupId',v_row.id,'mode',v_row.mode,'portalRequestId',v_row.portal_request_id,'reason',v_reason)
  );

  return jsonb_build_object('followupId',v_row.id,'status',v_row.status,'version',v_row.version,'wasDuplicate',false);
end; $$;

create or replace function public.revoke_intake_followup_v1(uuid,uuid,integer,text)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.revoke_intake_followup_v1_impl($1,$2,$3,$4);
$$;

-- Private helper functions remain inaccessible to browser roles; public façades are security invoker.
revoke all on function private.intake_followup_token_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function private.validate_intake_followup_patch_v1(uuid,uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.require_live_intake_followup_v1(text) from public,anon,authenticated,service_role;

revoke all on function private.issue_intake_followup_v1_impl(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function private.issue_intake_followup_v1_impl(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) to authenticated,service_role;
revoke all on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) from public,anon,service_role;
grant execute on function public.issue_intake_followup_v1(uuid,uuid,integer,text,text,jsonb,text,text,integer,uuid,uuid,uuid,uuid) to authenticated;

revoke all on function private.get_public_intake_followup_v1_impl(text) from public;
grant execute on function private.get_public_intake_followup_v1_impl(text) to anon,authenticated,service_role;
revoke all on function public.get_public_intake_followup_v1(text) from public,service_role;
grant execute on function public.get_public_intake_followup_v1(text) to anon,authenticated;

revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public;
grant execute on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) to anon,authenticated,service_role;
revoke all on function public.save_public_intake_followup_v1(text,jsonb,boolean) from public,service_role;
grant execute on function public.save_public_intake_followup_v1(text,jsonb,boolean) to anon,authenticated;

revoke all on function private.reconcile_portal_intake_followup_v1_impl(uuid,uuid,integer,integer,jsonb) from public,anon;
grant execute on function private.reconcile_portal_intake_followup_v1_impl(uuid,uuid,integer,integer,jsonb) to authenticated,service_role;
revoke all on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) from public,anon,service_role;
grant execute on function public.reconcile_portal_intake_followup_v1(uuid,uuid,integer,integer,jsonb) to authenticated;

revoke all on function private.revoke_intake_followup_v1_impl(uuid,uuid,integer,text) from public,anon;
grant execute on function private.revoke_intake_followup_v1_impl(uuid,uuid,integer,text) to authenticated,service_role;
revoke all on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) from public,anon,service_role;
grant execute on function public.revoke_intake_followup_v1(uuid,uuid,integer,text) to authenticated;

commit;
