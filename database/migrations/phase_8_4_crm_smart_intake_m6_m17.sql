-- ENJAZ Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17
-- Public intake is non-authoritative. Raw bearer tokens are never persisted.
-- Authoritative company/contact/transaction creation is guarded by internal conversion RPC only.
begin;

create table public.service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null check (char_length(btrim(code)) between 1 and 80),
  name text not null check (char_length(btrim(name)) between 1 and 240),
  description text check (description is null or char_length(btrim(description)) between 1 and 2400),
  base_price numeric(18,2) not null default 0 check (base_price >= 0),
  expected_duration_days integer check (expected_duration_days is null or expected_duration_days between 0 and 3650),
  required_inputs jsonb not null default '[]'::jsonb check (jsonb_typeof(required_inputs)='array'),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules)='object'),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_catalog_items_workspace_id_id_key unique(workspace_id,id),
  constraint service_catalog_items_workspace_code_key unique(workspace_id,code)
);

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 240),
  organization_name text check (organization_name is null or char_length(btrim(organization_name)) between 1 and 400),
  phone text check (phone is null or char_length(btrim(phone)) between 3 and 80),
  email text check (email is null or char_length(btrim(email)) between 3 and 320),
  source text check (source is null or char_length(btrim(source)) between 1 and 160),
  stage text not null default 'inquiry' check (stage in ('inquiry','qualified','quoted','accepted','lost','converted')),
  lost_reason text check (lost_reason is null or char_length(btrim(lost_reason)) between 3 and 1200),
  assigned_user_id uuid,
  converted_company_id uuid,
  converted_contact_id uuid,
  converted_transaction_id uuid,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_leads_workspace_id_id_key unique(workspace_id,id),
  constraint crm_leads_assignee_fk foreign key(workspace_id,assigned_user_id) references public.workspace_memberships(workspace_id,user_id) on delete restrict,
  constraint crm_leads_converted_company_fk foreign key(workspace_id,converted_company_id) references public.companies(workspace_id,id) on delete restrict,
  constraint crm_leads_converted_contact_fk foreign key(workspace_id,converted_contact_id) references public.contacts(workspace_id,id) on delete restrict,
  constraint crm_leads_converted_transaction_fk foreign key(workspace_id,converted_transaction_id) references public.transactions(workspace_id,id) on delete restrict,
  constraint crm_leads_lost_stage_consistency check ((stage='lost' and lost_reason is not null) or (stage<>'lost' and lost_reason is null)),
  constraint crm_leads_conversion_consistency check ((stage='converted' and converted_company_id is not null and converted_transaction_id is not null) or (stage<>'converted' and converted_transaction_id is null))
);

create table public.crm_service_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null,
  service_id uuid not null,
  status text not null default 'requested' check (status in ('requested','quoted','accepted','converted','cancelled')),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 2400),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_service_requests_workspace_id_id_key unique(workspace_id,id),
  constraint crm_service_requests_lead_fk foreign key(workspace_id,lead_id) references public.crm_leads(workspace_id,id) on delete restrict,
  constraint crm_service_requests_service_fk foreign key(workspace_id,service_id) references public.service_catalog_items(workspace_id,id) on delete restrict
);

create table public.crm_quotations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null,
  service_request_id uuid,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','sent','accepted','rejected','expired')),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) not null check (subtotal >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 30),
  discount_amount numeric(18,2) not null default 0 check (discount_amount >= 0),
  total numeric(18,2) not null check (total >= 0),
  valid_until date,
  approval_required boolean not null default false,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  accepted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_quotations_workspace_id_id_key unique(workspace_id,id),
  constraint crm_quotations_lead_fk foreign key(workspace_id,lead_id) references public.crm_leads(workspace_id,id) on delete restrict,
  constraint crm_quotations_request_fk foreign key(workspace_id,service_request_id) references public.crm_service_requests(workspace_id,id) on delete restrict,
  constraint crm_quotations_approval_consistency check ((approved_by is null and approved_at is null) or (approved_by is not null and approved_at is not null)),
  constraint crm_quotations_acceptance_consistency check ((status='accepted' and accepted_at is not null) or (status<>'accepted' and accepted_at is null))
);

create table public.crm_quotation_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quotation_id uuid not null,
  service_id uuid,
  description text not null check (char_length(btrim(description)) between 1 and 500),
  quantity numeric(12,2) not null default 1 check (quantity > 0 and quantity <= 100000),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  position integer not null default 1 check (position > 0),
  constraint crm_quotation_items_workspace_id_id_key unique(workspace_id,id),
  constraint crm_quotation_items_quote_fk foreign key(workspace_id,quotation_id) references public.crm_quotations(workspace_id,id) on delete cascade,
  constraint crm_quotation_items_service_fk foreign key(workspace_id,service_id) references public.service_catalog_items(workspace_id,id) on delete restrict,
  constraint crm_quotation_items_position_key unique(workspace_id,quotation_id,position)
);

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  public_title text not null check (char_length(btrim(public_title)) between 1 and 240),
  public_description text check (public_description is null or char_length(btrim(public_description)) between 1 and 2400),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_forms_workspace_id_id_key unique(workspace_id,id)
);

create table public.intake_form_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  form_id uuid not null,
  field_key text not null check (field_key ~ '^[A-Za-z0-9_.-]{1,80}$'),
  label text not null check (char_length(btrim(label)) between 1 and 240),
  field_type text not null check (field_type in ('text','textarea','email','phone','select','file')),
  required boolean not null default false,
  position integer not null check (position > 0),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config)='object'),
  constraint intake_form_fields_workspace_id_id_key unique(workspace_id,id),
  constraint intake_form_fields_form_fk foreign key(workspace_id,form_id) references public.intake_forms(workspace_id,id) on delete cascade,
  constraint intake_form_fields_key_unique unique(workspace_id,form_id,field_key),
  constraint intake_form_fields_position_unique unique(workspace_id,form_id,position)
);

create table public.intake_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  form_id uuid not null,
  lead_id uuid,
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  issued_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint intake_links_workspace_id_id_key unique(workspace_id,id),
  constraint intake_links_form_fk foreign key(workspace_id,form_id) references public.intake_forms(workspace_id,id) on delete restrict,
  constraint intake_links_lead_fk foreign key(workspace_id,lead_id) references public.crm_leads(workspace_id,id) on delete restrict,
  constraint intake_links_token_hash_key unique(token_hash),
  constraint intake_links_expiry_check check (expires_at > created_at)
);

create table public.intake_public_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.intake_links(id) on delete cascade,
  event_type text not null check (event_type in ('view','save_draft','submit')),
  occurred_at timestamptz not null default now()
);

create table public.intake_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  form_id uuid not null,
  link_id uuid not null,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','rejected','converted')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers)='object'),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  review_mapping jsonb check (review_mapping is null or jsonb_typeof(review_mapping)='object'),
  review_note text check (review_note is null or char_length(btrim(review_note)) between 1 and 2400),
  converted_lead_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_submissions_workspace_id_id_key unique(workspace_id,id),
  constraint intake_submissions_form_fk foreign key(workspace_id,form_id) references public.intake_forms(workspace_id,id) on delete restrict,
  constraint intake_submissions_link_fk foreign key(workspace_id,link_id) references public.intake_links(workspace_id,id) on delete restrict,
  constraint intake_submissions_converted_lead_fk foreign key(workspace_id,converted_lead_id) references public.crm_leads(workspace_id,id) on delete restrict,
  constraint intake_submissions_one_per_link unique(workspace_id,link_id),
  constraint intake_submissions_submit_consistency check ((status='draft' and submitted_at is null) or (status<>'draft' and submitted_at is not null)),
  constraint intake_submissions_review_consistency check ((reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null))
);

create table public.intake_submission_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  submission_id uuid not null,
  field_key text not null check (field_key ~ '^[A-Za-z0-9_.-]{1,80}$'),
  file_name text not null check (char_length(btrim(file_name)) between 1 and 320),
  mime_type text not null check (char_length(btrim(mime_type)) between 3 and 160),
  byte_size bigint not null check (byte_size between 1 and 52428800),
  storage_path text,
  upload_status text not null default 'pending_upload' check (upload_status in ('pending_upload','acknowledged','rejected')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint intake_submission_files_workspace_id_id_key unique(workspace_id,id),
  constraint intake_submission_files_submission_fk foreign key(workspace_id,submission_id) references public.intake_submissions(workspace_id,id) on delete cascade,
  constraint intake_submission_files_ack_check check ((upload_status='acknowledged' and storage_path is not null and acknowledged_at is not null) or (upload_status<>'acknowledged' and acknowledged_at is null))
);

create table public.crm_conversion_audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null,
  submission_id uuid,
  company_id uuid not null,
  contact_id uuid,
  transaction_id uuid not null,
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot)='object'),
  converted_by uuid not null references auth.users(id) on delete restrict,
  converted_at timestamptz not null default now(),
  constraint crm_conversion_audits_workspace_id_id_key unique(workspace_id,id),
  constraint crm_conversion_audits_lead_fk foreign key(workspace_id,lead_id) references public.crm_leads(workspace_id,id) on delete restrict,
  constraint crm_conversion_audits_submission_fk foreign key(workspace_id,submission_id) references public.intake_submissions(workspace_id,id) on delete restrict,
  constraint crm_conversion_audits_company_fk foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete restrict,
  constraint crm_conversion_audits_contact_fk foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id) on delete restrict,
  constraint crm_conversion_audits_transaction_fk foreign key(workspace_id,transaction_id) references public.transactions(workspace_id,id) on delete restrict,
  constraint crm_conversion_audits_lead_unique unique(workspace_id,lead_id)
);

create index service_catalog_active_idx on public.service_catalog_items(workspace_id,active,name);
create index crm_leads_stage_idx on public.crm_leads(workspace_id,stage,updated_at desc);
create index crm_leads_email_idx on public.crm_leads(workspace_id,lower(email)) where email is not null;
create index crm_leads_phone_idx on public.crm_leads(workspace_id,phone) where phone is not null;
create index crm_leads_assignee_idx on public.crm_leads(workspace_id,assigned_user_id,stage) where assigned_user_id is not null;
create index crm_service_requests_lead_idx on public.crm_service_requests(workspace_id,lead_id,status);
create index crm_service_requests_service_idx on public.crm_service_requests(workspace_id,service_id,status);
create index crm_quotations_lead_idx on public.crm_quotations(workspace_id,lead_id,created_at desc);
create index crm_quotations_request_idx on public.crm_quotations(workspace_id,service_request_id) where service_request_id is not null;
create index crm_quotation_items_quote_idx on public.crm_quotation_items(workspace_id,quotation_id,position);
create index crm_quotation_items_service_idx on public.crm_quotation_items(workspace_id,service_id) where service_id is not null;
create index intake_forms_active_idx on public.intake_forms(workspace_id,active,updated_at desc);
create index intake_form_fields_form_idx on public.intake_form_fields(workspace_id,form_id,position);
create index intake_links_form_idx on public.intake_links(workspace_id,form_id,created_at desc);
create index intake_links_lead_idx on public.intake_links(workspace_id,lead_id) where lead_id is not null;
create index intake_links_live_idx on public.intake_links(token_hash,expires_at) where revoked_at is null;
create index intake_public_events_link_idx on public.intake_public_events(link_id,occurred_at desc);
create index intake_submissions_status_idx on public.intake_submissions(workspace_id,status,updated_at desc);
create index intake_submissions_form_idx on public.intake_submissions(workspace_id,form_id,status);
create index intake_submission_files_submission_idx on public.intake_submission_files(workspace_id,submission_id,field_key);
create index crm_conversion_submission_idx on public.crm_conversion_audits(workspace_id,submission_id) where submission_id is not null;
create index crm_conversion_company_idx on public.crm_conversion_audits(workspace_id,company_id,converted_at desc);
create index crm_conversion_contact_idx on public.crm_conversion_audits(workspace_id,contact_id) where contact_id is not null;
create index crm_conversion_transaction_idx on public.crm_conversion_audits(workspace_id,transaction_id);

create or replace function private.require_crm_member_v1(p_workspace_id uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=v_actor) then
    raise insufficient_privilege using message='ENJAZ_CRM_WORKSPACE_FORBIDDEN';
  end if;
  return v_actor;
end; $$;

create or replace function private.intake_token_hash_v1(p_token text)
returns text language plpgsql immutable security definer set search_path='' as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise invalid_parameter_value using message='ENJAZ_INTAKE_TOKEN_INVALID'; end if;
  return encode(sha256(convert_to(p_token,'UTF8')),'hex');
end; $$;

create or replace function private.require_live_intake_link_v1(p_token text)
returns public.intake_links language plpgsql security definer set search_path='' as $$
declare v_link public.intake_links%rowtype; v_hash text;
begin
  v_hash := private.intake_token_hash_v1(p_token);
  select * into v_link from public.intake_links l where l.token_hash=v_hash;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_LINK_NOT_FOUND'; end if;
  if v_link.revoked_at is not null then raise insufficient_privilege using message='ENJAZ_INTAKE_LINK_REVOKED'; end if;
  if v_link.expires_at <= now() then raise insufficient_privilege using message='ENJAZ_INTAKE_LINK_EXPIRED'; end if;
  return v_link;
end; $$;

create or replace function private.enforce_public_intake_rate_v1(p_link_id uuid,p_event_type text)
returns void language plpgsql security definer set search_path='' as $$
declare v_hour bigint; v_recent bigint;
begin
  if p_event_type not in ('view','save_draft','submit') then raise invalid_parameter_value using message='ENJAZ_INTAKE_EVENT_INVALID'; end if;
  select count(*) into v_hour from public.intake_public_events e where e.link_id=p_link_id and e.occurred_at>now()-interval '1 hour';
  select count(*) into v_recent from public.intake_public_events e where e.link_id=p_link_id and e.event_type in ('save_draft','submit') and e.occurred_at>now()-interval '30 seconds';
  if v_hour>=120 or (p_event_type in ('save_draft','submit') and v_recent>=4) then raise program_limit_exceeded using message='ENJAZ_INTAKE_RATE_LIMITED'; end if;
  insert into public.intake_public_events(link_id,event_type) values(p_link_id,p_event_type);
end; $$;

create or replace function private.validate_intake_payload_v1(p_workspace_id uuid,p_form_id uuid,p_answers jsonb,p_files jsonb,p_finalize boolean)
returns void language plpgsql stable security definer set search_path='' as $$
declare f record; v_value jsonb; v_file jsonb; v_count integer; v_allowed jsonb; v_max bigint;
begin
  if jsonb_typeof(p_answers)<>'object' or jsonb_typeof(p_files)<>'array' then raise invalid_parameter_value using message='ENJAZ_INTAKE_PAYLOAD_INVALID'; end if;
  for f in select * from public.intake_form_fields x where x.workspace_id=p_workspace_id and x.form_id=p_form_id order by x.position loop
    v_value := p_answers->f.field_key;
    if p_finalize and f.required and f.field_type<>'file' and (v_value is null or jsonb_typeof(v_value)<>'string' or char_length(btrim(v_value#>>'{}'))=0) then raise invalid_parameter_value using message='ENJAZ_INTAKE_REQUIRED_FIELD_MISSING'; end if;
    if v_value is not null and f.field_type<>'file' then
      if jsonb_typeof(v_value)<>'string' or char_length(v_value#>>'{}')>4000 then raise invalid_parameter_value using message='ENJAZ_INTAKE_FIELD_INVALID'; end if;
      if f.field_type='email' and (v_value#>>'{}') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise invalid_parameter_value using message='ENJAZ_INTAKE_EMAIL_INVALID'; end if;
      if f.field_type='phone' and char_length(regexp_replace(v_value#>>'{}','[^0-9+]','','g'))<6 then raise invalid_parameter_value using message='ENJAZ_INTAKE_PHONE_INVALID'; end if;
      if f.field_type='select' and jsonb_typeof(f.config->'options')='array' and not (f.config->'options' ? (v_value#>>'{}')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_SELECT_INVALID'; end if;
    end if;
    if f.field_type='file' then
      select count(*) into v_count from jsonb_array_elements(p_files) q where q->>'fieldKey'=f.field_key;
      if p_finalize and f.required and v_count=0 then raise invalid_parameter_value using message='ENJAZ_INTAKE_REQUIRED_FILE_MISSING'; end if;
      v_allowed:=coalesce(f.config->'allowedMimeTypes','["application/pdf","image/jpeg","image/png"]'::jsonb);
      v_max:=coalesce((f.config->>'maxBytes')::bigint,10485760);
      for v_file in select value from jsonb_array_elements(p_files) loop
        if v_file->>'fieldKey'=f.field_key then
          if jsonb_typeof(v_file)<>'object' or char_length(btrim(coalesce(v_file->>'fileName','')))=0 or coalesce((v_file->>'byteSize')::bigint,0)<1 or (v_file->>'byteSize')::bigint>least(v_max,52428800) then raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_INVALID'; end if;
          if jsonb_typeof(v_allowed)<>'array' or not (v_allowed ? coalesce(v_file->>'mimeType','')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_MIME_FORBIDDEN'; end if;
        end if;
      end loop;
    end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from public.intake_form_fields f where f.workspace_id=p_workspace_id and f.form_id=p_form_id and f.field_key=k)) then raise invalid_parameter_value using message='ENJAZ_INTAKE_UNKNOWN_FIELD'; end if;
  if exists(select 1 from jsonb_array_elements(p_files) q where not exists(select 1 from public.intake_form_fields f where f.workspace_id=p_workspace_id and f.form_id=p_form_id and f.field_type='file' and f.field_key=q->>'fieldKey')) then raise invalid_parameter_value using message='ENJAZ_INTAKE_UNKNOWN_FILE_FIELD'; end if;
end; $$;

create or replace function public.get_crm_intake_context_v1(p_workspace_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
  perform private.require_crm_member_v1(p_workspace_id);
  return jsonb_build_object(
    'authority','crm_pre_transaction_and_reviewed_intake',
    'externalSubmissionAuthority','non_authoritative',
    'companyWriteAuthority','guarded_conversion_rpc_only',
    'transactionWriteAuthority','guarded_conversion_rpc_only',
    'financeLedgerWriteAuthority','none',
    'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'description',s.description,'basePrice',s.base_price,'expectedDurationDays',s.expected_duration_days,'requiredInputs',s.required_inputs,'active',s.active) order by s.active desc,s.name) from public.service_catalog_items s where s.workspace_id=p_workspace_id),'[]'::jsonb),
    'leads',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'displayName',l.display_name,'organizationName',l.organization_name,'phone',l.phone,'email',l.email,'source',l.source,'stage',l.stage,'lostReason',l.lost_reason,'version',l.version,'convertedCompanyId',l.converted_company_id,'convertedTransactionId',l.converted_transaction_id) order by l.updated_at desc) from public.crm_leads l where l.workspace_id=p_workspace_id limit 200),'[]'::jsonb),
    'serviceRequests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'leadId',r.lead_id,'serviceId',r.service_id,'serviceName',s.name,'status',r.status,'notes',r.notes) order by r.updated_at desc) from public.crm_service_requests r join public.service_catalog_items s on s.workspace_id=r.workspace_id and s.id=r.service_id where r.workspace_id=p_workspace_id limit 200),'[]'::jsonb),
    'quotations',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'leadId',q.lead_id,'serviceRequestId',q.service_request_id,'status',q.status,'currency',q.currency,'subtotal',q.subtotal,'discountPercent',q.discount_percent,'discountAmount',q.discount_amount,'total',q.total,'validUntil',q.valid_until,'approvalRequired',q.approval_required,'version',q.version) order by q.created_at desc) from public.crm_quotations q where q.workspace_id=p_workspace_id limit 200),'[]'::jsonb),
    'reviewQueue',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'formId',x.form_id,'formTitle',f.public_title,'status',x.status,'submittedAt',x.submitted_at,'version',x.version,'fileCount',(select count(*) from public.intake_submission_files z where z.workspace_id=x.workspace_id and z.submission_id=x.id),'pendingUploadCount',(select count(*) from public.intake_submission_files z where z.workspace_id=x.workspace_id and z.submission_id=x.id and z.upload_status<>'acknowledged')) order by x.submitted_at nulls last,x.updated_at desc) from public.intake_submissions x join public.intake_forms f on f.workspace_id=x.workspace_id and f.id=x.form_id where x.workspace_id=p_workspace_id and x.status in ('submitted','under_review','approved')),'[]'::jsonb),
    'forms',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'publicTitle',f.public_title,'active',f.active,'version',f.version,'fieldCount',(select count(*) from public.intake_form_fields z where z.workspace_id=f.workspace_id and z.form_id=f.id)) order by f.updated_at desc) from public.intake_forms f where f.workspace_id=p_workspace_id),'[]'::jsonb)
  );
end; $$;

create or replace function public.save_service_catalog_item_v1(p_workspace_id uuid,p_service_id uuid,p_code text,p_name text,p_description text,p_base_price numeric,p_expected_duration_days integer,p_required_inputs jsonb,p_rules jsonb,p_active boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.service_catalog_items%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_code,''))) not between 1 and 80 or char_length(btrim(coalesce(p_name,''))) not between 1 and 240 or coalesce(p_base_price,-1)<0 or jsonb_typeof(coalesce(p_required_inputs,'[]'::jsonb))<>'array' or jsonb_typeof(coalesce(p_rules,'{}'::jsonb))<>'object' then raise invalid_parameter_value using message='ENJAZ_SERVICE_INVALID'; end if;
  if p_service_id is null then
    insert into public.service_catalog_items(workspace_id,code,name,description,base_price,expected_duration_days,required_inputs,rules,active,created_by) values(p_workspace_id,btrim(p_code),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_base_price,p_expected_duration_days,coalesce(p_required_inputs,'[]'::jsonb),coalesce(p_rules,'{}'::jsonb),coalesce(p_active,true),v_actor) returning * into v_row;
  else
    update public.service_catalog_items set code=btrim(p_code),name=btrim(p_name),description=nullif(btrim(coalesce(p_description,'')),''),base_price=p_base_price,expected_duration_days=p_expected_duration_days,required_inputs=coalesce(p_required_inputs,'[]'::jsonb),rules=coalesce(p_rules,'{}'::jsonb),active=coalesce(p_active,true),updated_at=now() where workspace_id=p_workspace_id and id=p_service_id returning * into v_row;
    if not found then raise no_data_found using message='ENJAZ_SERVICE_NOT_FOUND'; end if;
  end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,case when p_service_id is null then 'crm.service.created' else 'crm.service.updated' end,'service_catalog_item',v_row.id,'CRM service catalog item saved',jsonb_build_object('code',v_row.code,'active',v_row.active,'basePrice',v_row.base_price));
  return jsonb_build_object('id',v_row.id,'code',v_row.code,'name',v_row.name,'basePrice',v_row.base_price,'active',v_row.active);
end; $$;

create or replace function public.create_crm_lead_v1(p_workspace_id uuid,p_display_name text,p_organization_name text,p_phone text,p_email text,p_source text,p_assigned_user_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.crm_leads%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_display_name,''))) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_CRM_LEAD_NAME_INVALID'; end if;
  if p_assigned_user_id is not null and not exists(select 1 from public.workspace_memberships wm where wm.workspace_id=p_workspace_id and wm.user_id=p_assigned_user_id) then raise foreign_key_violation using message='ENJAZ_CRM_ASSIGNEE_NOT_MEMBER'; end if;
  insert into public.crm_leads(workspace_id,display_name,organization_name,phone,email,source,assigned_user_id,created_by) values(p_workspace_id,btrim(p_display_name),nullif(btrim(coalesce(p_organization_name,'')),''),nullif(btrim(coalesce(p_phone,'')),''),nullif(lower(btrim(coalesce(p_email,''))),''),nullif(btrim(coalesce(p_source,'')),''),p_assigned_user_id,v_actor) returning * into v_row;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.lead.created','crm_lead',v_row.id,'CRM lead created',jsonb_build_object('source',v_row.source,'stage',v_row.stage));
  return jsonb_build_object('id',v_row.id,'stage',v_row.stage,'version',v_row.version);
end; $$;

create or replace function public.advance_crm_lead_v1(p_workspace_id uuid,p_lead_id uuid,p_expected_version integer,p_next_stage text,p_lost_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.crm_leads%rowtype; v_allowed boolean:=false;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  select * into v_row from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id for update;
  if not found then raise no_data_found using message='ENJAZ_CRM_LEAD_NOT_FOUND'; end if;
  if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_CRM_LEAD_STALE'; end if;
  v_allowed := (v_row.stage='inquiry' and p_next_stage in ('qualified','lost')) or (v_row.stage='qualified' and p_next_stage in ('quoted','lost')) or (v_row.stage='quoted' and p_next_stage in ('accepted','lost'));
  if not v_allowed then raise invalid_parameter_value using message='ENJAZ_CRM_STAGE_TRANSITION_INVALID'; end if;
  if p_next_stage='lost' and char_length(btrim(coalesce(p_lost_reason,'')))<3 then raise invalid_parameter_value using message='ENJAZ_CRM_LOST_REASON_REQUIRED'; end if;
  update public.crm_leads set stage=p_next_stage,lost_reason=case when p_next_stage='lost' then btrim(p_lost_reason) else null end,version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_lead_id returning * into v_row;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.lead.stage_changed','crm_lead',v_row.id,'CRM lead stage changed',jsonb_build_object('stage',v_row.stage,'version',v_row.version,'lostReason',v_row.lost_reason));
  return jsonb_build_object('id',v_row.id,'stage',v_row.stage,'version',v_row.version);
end; $$;

create or replace function public.create_crm_service_request_v1(p_workspace_id uuid,p_lead_id uuid,p_service_id uuid,p_notes text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.crm_service_requests%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if not exists(select 1 from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id and l.stage not in ('lost','converted')) then raise foreign_key_violation using message='ENJAZ_CRM_LEAD_NOT_ELIGIBLE'; end if;
  if not exists(select 1 from public.service_catalog_items s where s.workspace_id=p_workspace_id and s.id=p_service_id and s.active) then raise foreign_key_violation using message='ENJAZ_SERVICE_NOT_ACTIVE'; end if;
  insert into public.crm_service_requests(workspace_id,lead_id,service_id,notes,created_by) values(p_workspace_id,p_lead_id,p_service_id,nullif(btrim(coalesce(p_notes,'')),''),v_actor) returning * into v_row;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.service_request.created','crm_service_request',v_row.id,'CRM service request created',jsonb_build_object('leadId',p_lead_id,'serviceId',p_service_id));
  return jsonb_build_object('id',v_row.id,'status',v_row.status);
end; $$;

create or replace function public.create_crm_quotation_v1(p_workspace_id uuid,p_lead_id uuid,p_service_request_id uuid,p_currency text,p_discount_percent numeric,p_valid_until date,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_quote public.crm_quotations%rowtype; v_item jsonb; v_pos integer:=0; v_subtotal numeric(18,2):=0; v_qty numeric; v_unit numeric; v_desc text; v_service uuid; v_discount numeric; v_status text;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if not exists(select 1 from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id and l.stage in ('qualified','quoted')) then raise invalid_parameter_value using message='ENJAZ_CRM_QUOTE_LEAD_NOT_ELIGIBLE'; end if;
  if p_service_request_id is not null and not exists(select 1 from public.crm_service_requests r where r.workspace_id=p_workspace_id and r.id=p_service_request_id and r.lead_id=p_lead_id and r.status in ('requested','quoted')) then raise foreign_key_violation using message='ENJAZ_CRM_REQUEST_INVALID'; end if;
  if coalesce(p_currency,'') !~ '^[A-Z]{3}$' or coalesce(p_discount_percent,-1)<0 or p_discount_percent>30 or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise invalid_parameter_value using message='ENJAZ_CRM_QUOTE_INVALID'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pos:=v_pos+1; v_desc:=btrim(coalesce(v_item->>'description','')); v_qty:=coalesce((v_item->>'quantity')::numeric,0); v_unit:=coalesce((v_item->>'unitPrice')::numeric,-1); v_service:=nullif(v_item->>'serviceId','')::uuid;
    if char_length(v_desc) not between 1 and 500 or v_qty<=0 or v_qty>100000 or v_unit<0 then raise invalid_parameter_value using message='ENJAZ_CRM_QUOTE_ITEM_INVALID'; end if;
    if v_service is not null and not exists(select 1 from public.service_catalog_items s where s.workspace_id=p_workspace_id and s.id=v_service) then raise foreign_key_violation using message='ENJAZ_CRM_QUOTE_SERVICE_INVALID'; end if;
    v_subtotal:=v_subtotal+round(v_qty*v_unit,2);
  end loop;
  v_discount:=round(v_subtotal*(p_discount_percent/100.0),2); v_status:=case when p_discount_percent>10 then 'pending_approval' else 'approved' end;
  insert into public.crm_quotations(workspace_id,lead_id,service_request_id,status,currency,subtotal,discount_percent,discount_amount,total,valid_until,approval_required,approved_by,approved_at,created_by) values(p_workspace_id,p_lead_id,p_service_request_id,v_status,p_currency,v_subtotal,p_discount_percent,v_discount,v_subtotal-v_discount,p_valid_until,p_discount_percent>10,case when p_discount_percent<=10 then v_actor else null end,case when p_discount_percent<=10 then now() else null end,v_actor) returning * into v_quote;
  v_pos:=0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pos:=v_pos+1; v_desc:=btrim(v_item->>'description'); v_qty:=(v_item->>'quantity')::numeric; v_unit:=(v_item->>'unitPrice')::numeric; v_service:=nullif(v_item->>'serviceId','')::uuid;
    insert into public.crm_quotation_items(workspace_id,quotation_id,service_id,description,quantity,unit_price,line_total,position) values(p_workspace_id,v_quote.id,v_service,v_desc,v_qty,v_unit,round(v_qty*v_unit,2),v_pos);
  end loop;
  update public.crm_leads set stage='quoted',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_lead_id and stage='qualified';
  if p_service_request_id is not null then update public.crm_service_requests set status='quoted',updated_at=now() where workspace_id=p_workspace_id and id=p_service_request_id; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.quotation.created','crm_quotation',v_quote.id,'CRM quotation created',jsonb_build_object('leadId',p_lead_id,'subtotal',v_subtotal,'discountPercent',p_discount_percent,'total',v_quote.total,'approvalRequired',v_quote.approval_required));
  return jsonb_build_object('id',v_quote.id,'status',v_quote.status,'subtotal',v_quote.subtotal,'discountPercent',v_quote.discount_percent,'total',v_quote.total,'approvalRequired',v_quote.approval_required,'version',v_quote.version);
end; $$;

create or replace function public.approve_crm_quotation_v1(p_workspace_id uuid,p_quotation_id uuid,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.crm_quotations%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id); select * into v_row from public.crm_quotations q where q.workspace_id=p_workspace_id and q.id=p_quotation_id for update;
  if not found then raise no_data_found using message='ENJAZ_CRM_QUOTE_NOT_FOUND'; end if; if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_CRM_QUOTE_STALE'; end if; if v_row.status<>'pending_approval' then raise invalid_parameter_value using message='ENJAZ_CRM_QUOTE_NOT_PENDING'; end if;
  update public.crm_quotations set status='approved',approved_by=v_actor,approved_at=now(),version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_quotation_id returning * into v_row;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.quotation.approved','crm_quotation',v_row.id,'CRM quotation discount approved',jsonb_build_object('discountPercent',v_row.discount_percent,'version',v_row.version));
  return jsonb_build_object('id',v_row.id,'status',v_row.status,'version',v_row.version);
end; $$;

create or replace function public.accept_crm_quotation_v1(p_workspace_id uuid,p_quotation_id uuid,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.crm_quotations%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id); select * into v_row from public.crm_quotations q where q.workspace_id=p_workspace_id and q.id=p_quotation_id for update;
  if not found then raise no_data_found using message='ENJAZ_CRM_QUOTE_NOT_FOUND'; end if; if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_CRM_QUOTE_STALE'; end if; if v_row.status not in ('approved','sent') or (v_row.valid_until is not null and v_row.valid_until<current_date) then raise invalid_parameter_value using message='ENJAZ_CRM_QUOTE_NOT_ACCEPTABLE'; end if;
  update public.crm_quotations set status='accepted',accepted_at=now(),version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_quotation_id returning * into v_row;
  update public.crm_leads set stage='accepted',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=v_row.lead_id and stage='quoted';
  if v_row.service_request_id is not null then update public.crm_service_requests set status='accepted',updated_at=now() where workspace_id=p_workspace_id and id=v_row.service_request_id; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.quotation.accepted','crm_quotation',v_row.id,'CRM quotation accepted',jsonb_build_object('leadId',v_row.lead_id,'total',v_row.total));
  return jsonb_build_object('id',v_row.id,'status',v_row.status,'leadId',v_row.lead_id,'version',v_row.version);
end; $$;

create or replace function public.save_intake_form_v1(p_workspace_id uuid,p_form_id uuid,p_name text,p_public_title text,p_public_description text,p_active boolean,p_fields jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_form public.intake_forms%rowtype; f jsonb; v_pos integer:=0; v_key text; v_type text; v_config jsonb;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 240 or char_length(btrim(coalesce(p_public_title,''))) not between 1 and 240 or jsonb_typeof(p_fields)<>'array' or jsonb_array_length(p_fields)<1 or jsonb_array_length(p_fields)>80 then raise invalid_parameter_value using message='ENJAZ_INTAKE_FORM_INVALID'; end if;
  if p_form_id is null then insert into public.intake_forms(workspace_id,name,public_title,public_description,active,created_by) values(p_workspace_id,btrim(p_name),btrim(p_public_title),nullif(btrim(coalesce(p_public_description,'')),''),coalesce(p_active,true),v_actor) returning * into v_form;
  else update public.intake_forms set name=btrim(p_name),public_title=btrim(p_public_title),public_description=nullif(btrim(coalesce(p_public_description,'')),''),active=coalesce(p_active,true),version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_form_id returning * into v_form; if not found then raise no_data_found using message='ENJAZ_INTAKE_FORM_NOT_FOUND'; end if; delete from public.intake_form_fields where workspace_id=p_workspace_id and form_id=p_form_id; end if;
  for f in select value from jsonb_array_elements(p_fields) loop
    v_pos:=v_pos+1; v_key:=coalesce(f->>'key',''); v_type:=coalesce(f->>'type',''); v_config:=coalesce(f->'config','{}'::jsonb);
    if v_key !~ '^[A-Za-z0-9_.-]{1,80}$' or v_type not in ('text','textarea','email','phone','select','file') or char_length(btrim(coalesce(f->>'label',''))) not between 1 and 240 or jsonb_typeof(v_config)<>'object' then raise invalid_parameter_value using message='ENJAZ_INTAKE_FIELD_DEFINITION_INVALID'; end if;
    if v_type='file' then
      if jsonb_typeof(coalesce(v_config->'allowedMimeTypes','[]'::jsonb))<>'array' or coalesce((v_config->>'maxBytes')::bigint,10485760)>52428800 then raise invalid_parameter_value using message='ENJAZ_INTAKE_FILE_RULE_INVALID'; end if;
    end if;
    insert into public.intake_form_fields(workspace_id,form_id,field_key,label,field_type,required,position,config) values(p_workspace_id,v_form.id,v_key,btrim(f->>'label'),v_type,coalesce((f->>'required')::boolean,false),v_pos,v_config);
  end loop;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'intake.form.saved','intake_form',v_form.id,'Smart intake form saved',jsonb_build_object('version',v_form.version,'fieldCount',v_pos,'active',v_form.active));
  return jsonb_build_object('id',v_form.id,'version',v_form.version,'fieldCount',v_pos,'active',v_form.active);
end; $$;

create or replace function public.issue_intake_link_v1(p_workspace_id uuid,p_form_id uuid,p_lead_id uuid,p_expires_in_hours integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_token text; v_hash text; v_link public.intake_links%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id);
  if not exists(select 1 from public.intake_forms f where f.workspace_id=p_workspace_id and f.id=p_form_id and f.active) then raise foreign_key_violation using message='ENJAZ_INTAKE_FORM_NOT_ACTIVE'; end if;
  if p_lead_id is not null and not exists(select 1 from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id and l.stage not in ('lost','converted')) then raise foreign_key_violation using message='ENJAZ_INTAKE_LEAD_INVALID'; end if;
  if p_expires_in_hours is null or p_expires_in_hours not between 1 and 720 then raise invalid_parameter_value using message='ENJAZ_INTAKE_EXPIRY_INVALID'; end if;
  v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); v_hash:=encode(sha256(convert_to(v_token,'UTF8')),'hex');
  insert into public.intake_links(workspace_id,form_id,lead_id,token_hash,expires_at,issued_by) values(p_workspace_id,p_form_id,p_lead_id,v_hash,now()+make_interval(hours=>p_expires_in_hours),v_actor) returning * into v_link;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'intake.link.issued','intake_link',v_link.id,'Secure intake link issued',jsonb_build_object('formId',p_form_id,'leadId',p_lead_id,'expiresAt',v_link.expires_at,'tokenHashPrefix',left(v_hash,12)));
  return jsonb_build_object('linkId',v_link.id,'token',v_token,'expiresAt',v_link.expires_at);
end; $$;

create or replace function public.revoke_intake_link_v1(p_workspace_id uuid,p_link_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.intake_links%rowtype;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id); update public.intake_links set revoked_at=coalesce(revoked_at,now()) where workspace_id=p_workspace_id and id=p_link_id returning * into v_row; if not found then raise no_data_found using message='ENJAZ_INTAKE_LINK_NOT_FOUND'; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'intake.link.revoked','intake_link',v_row.id,'Secure intake link revoked',jsonb_build_object('revokedAt',v_row.revoked_at));
  return jsonb_build_object('linkId',v_row.id,'revokedAt',v_row.revoked_at);
end; $$;

create or replace function public.get_public_intake_v1(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link public.intake_links%rowtype; v_submission public.intake_submissions%rowtype;
begin
  v_link:=private.require_live_intake_link_v1(p_token); perform private.enforce_public_intake_rate_v1(v_link.id,'view');
  select * into v_submission from public.intake_submissions s where s.workspace_id=v_link.workspace_id and s.link_id=v_link.id;
  return jsonb_build_object('publicAuthority','non_authoritative','form',jsonb_build_object('title',(select f.public_title from public.intake_forms f where f.workspace_id=v_link.workspace_id and f.id=v_link.form_id),'description',(select f.public_description from public.intake_forms f where f.workspace_id=v_link.workspace_id and f.id=v_link.form_id),'fields',coalesce((select jsonb_agg(jsonb_build_object('key',x.field_key,'label',x.label,'type',x.field_type,'required',x.required,'config',x.config) order by x.position) from public.intake_form_fields x where x.workspace_id=v_link.workspace_id and x.form_id=v_link.form_id),'[]'::jsonb)),'expiresAt',v_link.expires_at,'submission',case when v_submission.id is null then null else jsonb_build_object('id',v_submission.id,'status',v_submission.status,'answers',case when v_submission.status='draft' then v_submission.answers else '{}'::jsonb end,'version',v_submission.version,'submittedAt',v_submission.submitted_at) end);
end; $$;

create or replace function public.save_public_intake_v1(p_token text,p_answers jsonb,p_files jsonb,p_finalize boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link public.intake_links%rowtype; v_submission public.intake_submissions%rowtype; v_file jsonb; v_event text:=case when coalesce(p_finalize,false) then 'submit' else 'save_draft' end;
begin
  v_link:=private.require_live_intake_link_v1(p_token); perform private.enforce_public_intake_rate_v1(v_link.id,v_event); perform private.validate_intake_payload_v1(v_link.workspace_id,v_link.form_id,p_answers,p_files,coalesce(p_finalize,false));
  select * into v_submission from public.intake_submissions s where s.workspace_id=v_link.workspace_id and s.link_id=v_link.id for update;
  if found and v_submission.status<>'draft' then raise invalid_parameter_value using message='ENJAZ_INTAKE_ALREADY_SUBMITTED'; end if;
  if not found then insert into public.intake_submissions(workspace_id,form_id,link_id,status,answers,submitted_at) values(v_link.workspace_id,v_link.form_id,v_link.id,case when coalesce(p_finalize,false) then 'submitted' else 'draft' end,p_answers,case when coalesce(p_finalize,false) then now() else null end) returning * into v_submission;
  else update public.intake_submissions set answers=p_answers,status=case when coalesce(p_finalize,false) then 'submitted' else 'draft' end,submitted_at=case when coalesce(p_finalize,false) then now() else null end,version=version+1,updated_at=now() where workspace_id=v_link.workspace_id and id=v_submission.id returning * into v_submission; delete from public.intake_submission_files where workspace_id=v_link.workspace_id and submission_id=v_submission.id and upload_status='pending_upload'; end if;
  for v_file in select value from jsonb_array_elements(p_files) loop insert into public.intake_submission_files(workspace_id,submission_id,field_key,file_name,mime_type,byte_size) values(v_link.workspace_id,v_submission.id,v_file->>'fieldKey',btrim(v_file->>'fileName'),v_file->>'mimeType',(v_file->>'byteSize')::bigint); end loop;
  return jsonb_build_object('submissionId',v_submission.id,'status',v_submission.status,'version',v_submission.version,'authoritative',false,'pendingUploadCount',(select count(*) from public.intake_submission_files f where f.workspace_id=v_link.workspace_id and f.submission_id=v_submission.id and f.upload_status<>'acknowledged'));
end; $$;

create or replace function public.review_intake_submission_v1(p_workspace_id uuid,p_submission_id uuid,p_expected_version integer,p_decision text,p_mapping jsonb,p_note text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_row public.intake_submissions%rowtype; v_lead public.crm_leads%rowtype; v_name text; v_org text; v_phone text; v_email text; v_source text;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id); select * into v_row from public.intake_submissions s where s.workspace_id=p_workspace_id and s.id=p_submission_id for update;
  if not found then raise no_data_found using message='ENJAZ_INTAKE_SUBMISSION_NOT_FOUND'; end if; if v_row.version<>p_expected_version then raise serialization_failure using message='ENJAZ_INTAKE_SUBMISSION_STALE'; end if; if v_row.status not in ('submitted','under_review') then raise invalid_parameter_value using message='ENJAZ_INTAKE_REVIEW_STATE_INVALID'; end if; if p_decision not in ('approve','reject') or jsonb_typeof(coalesce(p_mapping,'{}'::jsonb))<>'object' then raise invalid_parameter_value using message='ENJAZ_INTAKE_REVIEW_INVALID'; end if;
  if p_decision='approve' and exists(select 1 from public.intake_submission_files f where f.workspace_id=p_workspace_id and f.submission_id=p_submission_id and f.upload_status<>'acknowledged') then raise invalid_parameter_value using message='ENJAZ_INTAKE_UPLOADS_NOT_ACKNOWLEDGED'; end if;
  if p_decision='approve' then
    v_name:=nullif(btrim(coalesce(v_row.answers->>coalesce(p_mapping->>'displayName',''),'')),''); v_org:=nullif(btrim(coalesce(v_row.answers->>coalesce(p_mapping->>'organizationName',''),'')),''); v_phone:=nullif(btrim(coalesce(v_row.answers->>coalesce(p_mapping->>'phone',''),'')),''); v_email:=nullif(lower(btrim(coalesce(v_row.answers->>coalesce(p_mapping->>'email',''),''))),''); v_source:=nullif(btrim(coalesce(v_row.answers->>coalesce(p_mapping->>'source',''),'')),'');
    if v_name is null then raise invalid_parameter_value using message='ENJAZ_INTAKE_MAPPING_NAME_REQUIRED'; end if;
    insert into public.crm_leads(workspace_id,display_name,organization_name,phone,email,source,stage,created_by) values(p_workspace_id,v_name,v_org,v_phone,v_email,v_source,'inquiry',v_actor) returning * into v_lead;
    update public.intake_submissions set status='approved',reviewed_by=v_actor,reviewed_at=now(),review_mapping=p_mapping,review_note=nullif(btrim(coalesce(p_note,'')),''),converted_lead_id=v_lead.id,version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_submission_id returning * into v_row;
  else update public.intake_submissions set status='rejected',reviewed_by=v_actor,reviewed_at=now(),review_mapping=p_mapping,review_note=nullif(btrim(coalesce(p_note,'')),''),version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_submission_id returning * into v_row; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,case when p_decision='approve' then 'intake.submission.approved' else 'intake.submission.rejected' end,'intake_submission',v_row.id,'Smart intake submission reviewed',jsonb_build_object('mapping',p_mapping,'convertedLeadId',v_row.converted_lead_id));
  return jsonb_build_object('submissionId',v_row.id,'status',v_row.status,'version',v_row.version,'leadId',v_row.converted_lead_id,'authoritativeCoreCreated',false);
end; $$;

create or replace function public.convert_crm_lead_v1(p_workspace_id uuid,p_lead_id uuid,p_reuse_company_id uuid,p_transaction_type text,p_department text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid; v_lead public.crm_leads%rowtype; v_existing public.crm_conversion_audits%rowtype; v_company_id uuid; v_contact_id uuid; v_tx_id uuid; v_duplicate_company uuid; v_duplicate_contact uuid; v_submission uuid; v_snapshot jsonb;
begin
  v_actor:=private.require_crm_member_v1(p_workspace_id); select * into v_existing from public.crm_conversion_audits a where a.workspace_id=p_workspace_id and a.lead_id=p_lead_id; if found then return jsonb_build_object('leadId',p_lead_id,'companyId',v_existing.company_id,'contactId',v_existing.contact_id,'transactionId',v_existing.transaction_id,'wasDuplicate',true); end if;
  select * into v_lead from public.crm_leads l where l.workspace_id=p_workspace_id and l.id=p_lead_id for update; if not found then raise no_data_found using message='ENJAZ_CRM_LEAD_NOT_FOUND'; end if; if v_lead.stage<>'accepted' then raise invalid_parameter_value using message='ENJAZ_CRM_LEAD_NOT_ACCEPTED'; end if; if char_length(btrim(coalesce(p_transaction_type,''))) not between 1 and 180 or char_length(btrim(coalesce(p_department,''))) not between 1 and 240 then raise invalid_parameter_value using message='ENJAZ_CRM_CONVERSION_TRANSACTION_INVALID'; end if;
  if v_lead.organization_name is not null then select c.id into v_duplicate_company from public.companies c where c.workspace_id=p_workspace_id and c.deleted_at is null and (lower(c.legal_name)=lower(v_lead.organization_name) or lower(coalesce(c.display_name,''))=lower(v_lead.organization_name)) limit 1; end if;
  if v_lead.email is not null or v_lead.phone is not null then select c.id into v_duplicate_contact from public.contacts c where c.workspace_id=p_workspace_id and c.status='active' and ((v_lead.email is not null and lower(coalesce(c.email,''))=lower(v_lead.email)) or (v_lead.phone is not null and c.phone=v_lead.phone)) limit 1; end if;
  if p_reuse_company_id is null and v_duplicate_company is not null then raise unique_violation using message='ENJAZ_CRM_DUPLICATE_COMPANY_REVIEW_REQUIRED'; end if;
  if p_reuse_company_id is not null then select c.id into v_company_id from public.companies c where c.workspace_id=p_workspace_id and c.id=p_reuse_company_id and c.deleted_at is null; if v_company_id is null then raise foreign_key_violation using message='ENJAZ_CRM_REUSE_COMPANY_INVALID'; end if;
  else if v_lead.organization_name is null then raise invalid_parameter_value using message='ENJAZ_CRM_ORGANIZATION_REQUIRED_FOR_NEW_COMPANY'; end if; insert into public.companies(workspace_id,legal_name,display_name,status) values(p_workspace_id,v_lead.organization_name,v_lead.organization_name,'active') returning id into v_company_id; end if;
  if v_duplicate_contact is not null then v_contact_id:=v_duplicate_contact; elsif v_lead.display_name is not null then insert into public.contacts(workspace_id,display_name,contact_type,phone,email,status) values(p_workspace_id,v_lead.display_name,'client',v_lead.phone,v_lead.email,'active') returning id into v_contact_id; end if;
  if v_contact_id is not null then insert into public.company_contacts(workspace_id,company_id,contact_id,relation_type) values(p_workspace_id,v_company_id,v_contact_id,'primary') on conflict(workspace_id,company_id,contact_id,relation_type) do nothing; update public.companies set primary_contact_id=coalesce(primary_contact_id,v_contact_id),updated_at=now() where workspace_id=p_workspace_id and id=v_company_id; end if;
  insert into public.transactions(workspace_id,company_id,primary_contact_id,type,department,status,priority,current_fee) values(p_workspace_id,v_company_id,v_contact_id,btrim(p_transaction_type),btrim(p_department),'active','normal',0) returning id into v_tx_id;
  select s.id into v_submission from public.intake_submissions s where s.workspace_id=p_workspace_id and s.converted_lead_id=p_lead_id order by s.created_at desc limit 1;
  v_snapshot:=jsonb_build_object('displayName',v_lead.display_name,'organizationName',v_lead.organization_name,'phone',v_lead.phone,'email',v_lead.email,'source',v_lead.source,'leadVersion',v_lead.version,'acceptedQuotation',(select jsonb_build_object('id',q.id,'currency',q.currency,'subtotal',q.subtotal,'discountPercent',q.discount_percent,'total',q.total) from public.crm_quotations q where q.workspace_id=p_workspace_id and q.lead_id=p_lead_id and q.status='accepted' order by q.accepted_at desc limit 1));
  insert into public.crm_conversion_audits(workspace_id,lead_id,submission_id,company_id,contact_id,transaction_id,source_snapshot,converted_by) values(p_workspace_id,p_lead_id,v_submission,v_company_id,v_contact_id,v_tx_id,v_snapshot,v_actor);
  update public.crm_leads set stage='converted',converted_company_id=v_company_id,converted_contact_id=v_contact_id,converted_transaction_id=v_tx_id,version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=p_lead_id;
  update public.crm_service_requests set status='converted',updated_at=now() where workspace_id=p_workspace_id and lead_id=p_lead_id and status='accepted';
  if v_submission is not null then update public.intake_submissions set status='converted',version=version+1,updated_at=now() where workspace_id=p_workspace_id and id=v_submission and status='approved'; end if;
  insert into public.audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,summary,details) values(p_workspace_id,v_actor,'crm.lead.converted','crm_lead',p_lead_id,'CRM lead converted to authoritative work',jsonb_build_object('companyId',v_company_id,'contactId',v_contact_id,'transactionId',v_tx_id,'submissionId',v_submission,'financeLedgerWritten',false));
  return jsonb_build_object('leadId',p_lead_id,'companyId',v_company_id,'contactId',v_contact_id,'transactionId',v_tx_id,'wasDuplicate',false);
end; $$;

revoke all on function private.require_crm_member_v1(uuid) from public,anon;
revoke all on function private.intake_token_hash_v1(text) from public,anon;
revoke all on function private.require_live_intake_link_v1(text) from public,anon;
revoke all on function private.enforce_public_intake_rate_v1(uuid,text) from public,anon;
revoke all on function private.validate_intake_payload_v1(uuid,uuid,jsonb,jsonb,boolean) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.require_crm_member_v1(uuid) to authenticated;

revoke all on function public.get_crm_intake_context_v1(uuid) from public,anon;
revoke all on function public.save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean) from public,anon;
revoke all on function public.create_crm_lead_v1(uuid,text,text,text,text,text,uuid) from public,anon;
revoke all on function public.advance_crm_lead_v1(uuid,uuid,integer,text,text) from public,anon;
revoke all on function public.create_crm_service_request_v1(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb) from public,anon;
revoke all on function public.approve_crm_quotation_v1(uuid,uuid,integer) from public,anon;
revoke all on function public.accept_crm_quotation_v1(uuid,uuid,integer) from public,anon;
revoke all on function public.save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb) from public,anon;
revoke all on function public.issue_intake_link_v1(uuid,uuid,uuid,integer) from public,anon;
revoke all on function public.revoke_intake_link_v1(uuid,uuid) from public,anon;
revoke all on function public.review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text) from public,anon;
revoke all on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.get_crm_intake_context_v1(uuid) to authenticated;
grant execute on function public.save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.create_crm_lead_v1(uuid,text,text,text,text,text,uuid) to authenticated;
grant execute on function public.advance_crm_lead_v1(uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.create_crm_service_request_v1(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb) to authenticated;
grant execute on function public.approve_crm_quotation_v1(uuid,uuid,integer) to authenticated;
grant execute on function public.accept_crm_quotation_v1(uuid,uuid,integer) to authenticated;
grant execute on function public.save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb) to authenticated;
grant execute on function public.issue_intake_link_v1(uuid,uuid,uuid,integer) to authenticated;
grant execute on function public.revoke_intake_link_v1(uuid,uuid) to authenticated;
grant execute on function public.review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text) to authenticated;
grant execute on function public.convert_crm_lead_v1(uuid,uuid,uuid,text,text) to authenticated;

revoke all on function public.get_public_intake_v1(text) from public,authenticated;
revoke all on function public.save_public_intake_v1(text,jsonb,jsonb,boolean) from public,authenticated;
grant execute on function public.get_public_intake_v1(text) to anon;
grant execute on function public.save_public_intake_v1(text,jsonb,jsonb,boolean) to anon;

alter table public.service_catalog_items enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_service_requests enable row level security;
alter table public.crm_quotations enable row level security;
alter table public.crm_quotation_items enable row level security;
alter table public.intake_forms enable row level security;
alter table public.intake_form_fields enable row level security;
alter table public.intake_links enable row level security;
alter table public.intake_public_events enable row level security;
alter table public.intake_submissions enable row level security;
alter table public.intake_submission_files enable row level security;
alter table public.crm_conversion_audits enable row level security;

create policy service_catalog_select_workspace on public.service_catalog_items for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy crm_leads_select_workspace on public.crm_leads for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy crm_service_requests_select_workspace on public.crm_service_requests for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy crm_quotations_select_workspace on public.crm_quotations for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy crm_quotation_items_select_workspace on public.crm_quotation_items for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy intake_forms_select_workspace on public.intake_forms for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy intake_form_fields_select_workspace on public.intake_form_fields for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy intake_links_select_workspace on public.intake_links for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy intake_submissions_select_workspace on public.intake_submissions for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy intake_submission_files_select_workspace on public.intake_submission_files for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));
create policy crm_conversion_audits_select_workspace on public.crm_conversion_audits for select to authenticated using ((select auth.uid()) is not null and workspace_id in (select wm.workspace_id from public.workspace_memberships wm where wm.user_id=(select auth.uid())));

revoke all on table public.service_catalog_items,public.crm_leads,public.crm_service_requests,public.crm_quotations,public.crm_quotation_items,public.intake_forms,public.intake_form_fields,public.intake_links,public.intake_public_events,public.intake_submissions,public.intake_submission_files,public.crm_conversion_audits from anon,authenticated;
grant select on table public.service_catalog_items,public.crm_leads,public.crm_service_requests,public.crm_quotations,public.crm_quotation_items,public.intake_forms,public.intake_form_fields,public.intake_links,public.intake_submissions,public.intake_submission_files,public.crm_conversion_audits to authenticated;

commit;
