-- ENJAZ Phase 1.2 — Relational Database Baseline
-- Source of truth: Phase 0 contracts. This is a BASELINE DDL, not yet an applied migration.
-- Apply only to a dedicated Enjaz Supabase project after creating a migration via Supabase CLI.
-- PostgreSQL / Supabase target: PostgreSQL 15+ (security_invoker views if added later).

begin;

create schema if not exists private;
revoke all on schema private from public;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

-- -----------------------------------------------------------------------------
-- Identity / Workspace
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  address text,
  timezone text not null default 'Asia/Baghdad' check (char_length(timezone) between 1 and 80),
  locale text not null default 'ar-IQ' check (char_length(locale) between 2 and 32),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_workspace_id_id_key unique (id, owner_user_id)
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- -----------------------------------------------------------------------------
-- Entities
-- -----------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 240),
  contact_type text not null check (contact_type in ('lawyer','client','representative','other')),
  phone text,
  email text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive','merged')),
  merged_into_id uuid,
  legacy_id text,
  legacy_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint contacts_workspace_id_id_key unique (workspace_id, id),
  constraint contacts_merge_not_self check (merged_into_id is null or merged_into_id <> id),
  constraint contacts_merge_target_fk foreign key (workspace_id, merged_into_id)
    references public.contacts(workspace_id, id) on delete restrict
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legal_name text not null check (char_length(btrim(legal_name)) between 1 and 400),
  display_name text,
  capital numeric(18,2) check (capital is null or capital >= 0),
  address text,
  activities text,
  registration_number text,
  legal_status text,
  primary_contact_id uuid,
  status text not null default 'active' check (status in ('active','inactive','merged')),
  merged_into_id uuid,
  legacy_id text,
  legacy_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint companies_workspace_id_id_key unique (workspace_id, id),
  constraint companies_primary_contact_fk foreign key (workspace_id, primary_contact_id)
    references public.contacts(workspace_id, id) on delete restrict,
  constraint companies_merge_target_fk foreign key (workspace_id, merged_into_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint companies_merge_not_self check (merged_into_id is null or merged_into_id <> id)
);

create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null,
  contact_id uuid not null,
  relation_type text not null check (relation_type in ('primary','lawyer','representative','other')),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  constraint company_contacts_workspace_id_id_key unique (workspace_id, id),
  constraint company_contacts_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete cascade,
  constraint company_contacts_contact_fk foreign key (workspace_id, contact_id)
    references public.contacts(workspace_id, id) on delete cascade,
  constraint company_contacts_unique_relation unique (workspace_id, company_id, contact_id, relation_type),
  constraint company_contacts_valid_range check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.entity_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('company','contact')),
  entity_id uuid not null,
  event_type text not null check (char_length(btrim(event_type)) between 1 and 120),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  note text,
  state_snapshot jsonb,
  source text not null default 'manual' check (source in ('manual','import','system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint entity_lifecycle_events_workspace_id_id_key unique (workspace_id, id)
);

-- -----------------------------------------------------------------------------
-- Transactions
-- -----------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid not null,
  primary_contact_id uuid,
  type text not null check (char_length(btrim(type)) between 1 and 180),
  department text,
  status text not null default 'active' check (status in ('active','stalled','completed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  current_fee numeric(18,2) not null check (current_fee > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  deletion_reason text,
  legacy_id text,
  legacy_source text,
  constraint transactions_workspace_id_id_key unique (workspace_id, id),
  constraint transactions_workspace_tx_company_key unique (workspace_id, id, company_id),
  constraint transactions_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint transactions_primary_contact_fk foreign key (workspace_id, primary_contact_id)
    references public.contacts(workspace_id, id) on delete restrict,
  constraint transactions_completion_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  ),
  constraint transactions_deletion_reason_check check (deleted_at is null or char_length(btrim(coalesce(deletion_reason,''))) > 0)
);

create table public.transaction_routes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  station_name text not null check (char_length(btrim(station_name)) between 1 and 240),
  assigned_to_text text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  legacy_id text,
  legacy_source text,
  constraint transaction_routes_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_routes_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

create table public.transaction_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  legacy_id text,
  legacy_source text,
  constraint transaction_notes_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_notes_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

create table public.transaction_followups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  snoozed_until timestamptz,
  legacy_id text,
  legacy_source text,
  constraint transaction_followups_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_followups_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint transaction_followups_completion_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.transaction_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  event_type text not null check (char_length(btrim(event_type)) between 1 and 160),
  summary text not null check (char_length(btrim(summary)) between 1 and 600),
  occurred_at timestamptz not null default now(),
  source_entity_type text,
  source_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  actor_user_id uuid references auth.users(id) on delete set null,
  legacy_id text,
  legacy_source text,
  constraint transaction_activity_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_activity_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

create table public.transaction_blockers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  severity text not null check (severity in ('low','medium','high','critical')),
  note text,
  status text not null default 'open' check (status in ('open','resolved')),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint transaction_blockers_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_blockers_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint transaction_blockers_resolution_check check (
    (status = 'resolved' and resolved_at is not null)
    or (status = 'open' and resolved_at is null)
  )
);

create table public.transaction_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  depends_on_transaction_id uuid not null,
  dependency_type text,
  status text not null default 'active' check (status in ('active','satisfied','cancelled')),
  created_at timestamptz not null default now(),
  constraint transaction_dependencies_workspace_id_id_key unique (workspace_id, id),
  constraint transaction_dependencies_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete cascade,
  constraint transaction_dependencies_target_fk foreign key (workspace_id, depends_on_transaction_id)
    references public.transactions(workspace_id, id) on delete cascade,
  constraint transaction_dependencies_not_self check (transaction_id <> depends_on_transaction_id),
  constraint transaction_dependencies_unique unique (workspace_id, transaction_id, depends_on_transaction_id)
);

-- -----------------------------------------------------------------------------
-- Finance
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  company_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  method text not null check (method in ('cash','transfer','card','other')),
  paid_at timestamptz not null,
  status text not null default 'posted' check (status in ('posted','reversed')),
  receipt_ref text not null check (char_length(btrim(receipt_ref)) between 1 and 120),
  note text,
  legacy_id text,
  legacy_source text,
  created_at timestamptz not null default now(),
  constraint payments_workspace_id_id_key unique (workspace_id, id),
  constraint payments_receipt_unique unique (workspace_id, receipt_ref),
  constraint payments_transaction_company_fk foreign key (workspace_id, transaction_id, company_id)
    references public.transactions(workspace_id, id, company_id) on delete restrict
);

create table public.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_id uuid not null,
  reversed_at timestamptz not null default now(),
  reason text not null check (char_length(btrim(reason)) between 1 and 600),
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint payment_reversals_workspace_id_id_key unique (workspace_id, id),
  constraint payment_reversals_payment_fk foreign key (workspace_id, payment_id)
    references public.payments(workspace_id, id) on delete restrict,
  constraint payment_reversals_one_per_payment unique (workspace_id, payment_id)
);

create table public.fee_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  previous_fee numeric(18,2) not null check (previous_fee > 0),
  new_fee numeric(18,2) not null check (new_fee > 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 600),
  effective_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint fee_changes_workspace_id_id_key unique (workspace_id, id),
  constraint fee_changes_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint fee_changes_actual_change check (previous_fee <> new_fee)
);

create table public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid,
  company_id uuid,
  entry_type text not null check (entry_type in ('expense','advance','refund','adjustment','opening_balance')),
  direction text not null check (direction in ('in','out')),
  amount numeric(18,2) not null check (amount > 0),
  method text,
  category text,
  source text,
  occurred_at timestamptz not null,
  status text not null default 'posted' check (status in ('posted','reversed')),
  note text,
  reversal_reason text,
  reversed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint financial_ledger_entries_workspace_id_id_key unique (workspace_id, id),
  constraint financial_ledger_entries_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint financial_ledger_entries_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint financial_ledger_reversal_check check (
    (status = 'reversed' and reversed_at is not null and char_length(btrim(coalesce(reversal_reason,''))) > 0)
    or (status = 'posted' and reversed_at is null)
  )
);

create table public.cashbox_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  opening_balance numeric(18,2) not null default 0,
  opened_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cashbox_accounts_workspace_id_id_key unique (workspace_id, id),
  constraint cashbox_accounts_name_unique unique (workspace_id, name)
);

-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  transaction_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  document_type text,
  mime_type text not null check (char_length(btrim(mime_type)) between 1 and 120),
  storage_path text not null check (char_length(btrim(storage_path)) between 1 and 1200),
  size_bytes bigint not null check (size_bytes >= 0),
  original_size_bytes bigint check (original_size_bytes is null or original_size_bytes >= 0),
  checksum text,
  status text not null default 'processing' check (status in ('ready','processing','needs_review','failed','archived')),
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legacy_id text,
  legacy_source text,
  constraint documents_workspace_id_id_key unique (workspace_id, id),
  constraint documents_storage_path_unique unique (workspace_id, storage_path),
  constraint documents_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint documents_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null,
  version_number integer not null check (version_number > 0),
  storage_path text not null check (char_length(btrim(storage_path)) between 1 and 1200),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text,
  created_at timestamptz not null default now(),
  constraint document_versions_workspace_id_id_key unique (workspace_id, id),
  constraint document_versions_document_fk foreign key (workspace_id, document_id)
    references public.documents(workspace_id, id) on delete cascade,
  constraint document_versions_number_unique unique (workspace_id, document_id, version_number),
  constraint document_versions_path_unique unique (workspace_id, storage_path)
);

create table public.document_analysis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid not null,
  analysis_version integer not null default 1 check (analysis_version > 0),
  ocr_text text,
  extracted_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_fields) = 'object'),
  classification text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  duplicate_of_document_id uuid,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','approved','rejected')),
  analyzed_at timestamptz not null default now(),
  provider text,
  constraint document_analysis_workspace_id_id_key unique (workspace_id, id),
  constraint document_analysis_document_fk foreign key (workspace_id, document_id)
    references public.documents(workspace_id, id) on delete cascade,
  constraint document_analysis_duplicate_fk foreign key (workspace_id, duplicate_of_document_id)
    references public.documents(workspace_id, id) on delete restrict,
  constraint document_analysis_version_unique unique (workspace_id, document_id, analysis_version),
  constraint document_analysis_not_self_duplicate check (duplicate_of_document_id is null or duplicate_of_document_id <> document_id)
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  kind text not null check (char_length(btrim(kind)) between 1 and 120),
  body_source text not null,
  token_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(token_schema) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_templates_workspace_id_id_key unique (workspace_id, id)
);

create table public.correspondence_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  direction text not null check (direction in ('incoming','outgoing')),
  kind text not null check (char_length(btrim(kind)) between 1 and 120),
  correspondence_number text not null check (char_length(btrim(correspondence_number)) between 1 and 120),
  correspondence_date date not null,
  company_id uuid,
  transaction_id uuid,
  subject text not null check (char_length(btrim(subject)) between 1 and 600),
  sender text,
  recipient text,
  document_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint correspondence_registry_workspace_id_id_key unique (workspace_id, id),
  constraint correspondence_registry_number_unique unique (workspace_id, direction, correspondence_number),
  constraint correspondence_registry_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint correspondence_registry_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint correspondence_registry_document_fk foreign key (workspace_id, document_id)
    references public.documents(workspace_id, id) on delete restrict
);

create table public.document_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid,
  transaction_id uuid,
  company_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  compiled_content text not null default '',
  variables jsonb not null default '{}'::jsonb check (jsonb_typeof(variables) = 'object'),
  status text not null default 'draft' check (status in ('draft','registered','final')),
  correspondence_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_drafts_workspace_id_id_key unique (workspace_id, id),
  constraint document_drafts_template_fk foreign key (workspace_id, template_id)
    references public.document_templates(workspace_id, id) on delete restrict,
  constraint document_drafts_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint document_drafts_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint document_drafts_correspondence_fk foreign key (workspace_id, correspondence_id)
    references public.correspondence_registry(workspace_id, id) on delete restrict
);

create table public.pdf_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_document_id uuid,
  job_type text not null check (job_type in ('merge','reorder','rotate','redact','extract','export')),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  output_document_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pdf_jobs_workspace_id_id_key unique (workspace_id, id),
  constraint pdf_jobs_source_document_fk foreign key (workspace_id, source_document_id)
    references public.documents(workspace_id, id) on delete restrict,
  constraint pdf_jobs_output_document_fk foreign key (workspace_id, output_document_id)
    references public.documents(workspace_id, id) on delete restrict,
  constraint pdf_jobs_completion_check check (
    (status in ('succeeded','failed','cancelled') and completed_at is not null)
    or (status in ('queued','running') and completed_at is null)
  )
);

-- Workspace settings comes after documents because signature_document_id is a real FK.
create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  report_name text,
  report_address text,
  signature_document_id uuid,
  theme_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(theme_preferences) = 'object'),
  notification_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(notification_defaults) = 'object'),
  updated_at timestamptz not null default now(),
  constraint workspace_settings_signature_document_fk foreign key (workspace_id, signature_document_id)
    references public.documents(workspace_id, id) on delete restrict
);

-- -----------------------------------------------------------------------------
-- Workflow / Operations
-- -----------------------------------------------------------------------------
create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  description text,
  version integer not null default 1 check (version > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_templates_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_templates_name_version_unique unique (workspace_id, name, version)
);

create table public.workflow_template_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_template_id uuid not null,
  position integer not null check (position > 0),
  name text not null check (char_length(btrim(name)) between 1 and 240),
  description text,
  due_offset_days integer check (due_offset_days is null or due_offset_days >= 0),
  constraint workflow_template_stages_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_template_stages_template_fk foreign key (workspace_id, workflow_template_id)
    references public.workflow_templates(workspace_id, id) on delete cascade,
  constraint workflow_template_stages_position_unique unique (workspace_id, workflow_template_id, position)
);

create table public.workflow_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage_id uuid not null,
  position integer not null check (position > 0),
  item_type text not null check (item_type in ('check','document','action')),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  required boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  constraint workflow_template_items_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_template_items_stage_fk foreign key (workspace_id, stage_id)
    references public.workflow_template_stages(workspace_id, id) on delete cascade,
  constraint workflow_template_items_position_unique unique (workspace_id, stage_id, position)
);

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid not null,
  workflow_template_id uuid,
  template_snapshot jsonb not null check (jsonb_typeof(template_snapshot) = 'object'),
  current_stage_position integer not null default 1 check (current_stage_position > 0),
  status text not null default 'active' check (status in ('active','completed','removed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint workflow_instances_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_instances_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint workflow_instances_template_fk foreign key (workspace_id, workflow_template_id)
    references public.workflow_templates(workspace_id, id) on delete restrict,
  constraint workflow_instances_completion_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed')
  )
);

create table public.workflow_stage_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_instance_id uuid not null,
  stage_position integer not null check (stage_position > 0),
  status text not null default 'pending' check (status in ('pending','active','completed','reopened')),
  started_at timestamptz,
  completed_at timestamptz,
  override_used boolean not null default false,
  override_reason text,
  constraint workflow_stage_states_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_stage_states_instance_fk foreign key (workspace_id, workflow_instance_id)
    references public.workflow_instances(workspace_id, id) on delete cascade,
  constraint workflow_stage_states_unique unique (workspace_id, workflow_instance_id, stage_position),
  constraint workflow_stage_states_override_reason check (not override_used or char_length(btrim(coalesce(override_reason,''))) > 0)
);

create table public.workflow_item_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  workflow_instance_id uuid not null,
  template_item_key text not null check (char_length(btrim(template_item_key)) between 1 and 180),
  status text not null default 'pending' check (status in ('pending','done','waived')),
  completed_at timestamptz,
  note text,
  constraint workflow_item_states_workspace_id_id_key unique (workspace_id, id),
  constraint workflow_item_states_instance_fk foreign key (workspace_id, workflow_instance_id)
    references public.workflow_instances(workspace_id, id) on delete cascade,
  constraint workflow_item_states_unique unique (workspace_id, workflow_instance_id, template_item_key)
);

-- -----------------------------------------------------------------------------
-- Calendar / Communication
-- -----------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid,
  company_id uuid,
  contact_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  event_type text not null check (char_length(btrim(event_type)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  reminder_offsets integer[],
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_workspace_id_id_key unique (workspace_id, id),
  constraint calendar_events_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict,
  constraint calendar_events_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint calendar_events_contact_fk foreign key (workspace_id, contact_id)
    references public.contacts(workspace_id, id) on delete restrict,
  constraint calendar_events_time_range check (ends_at is null or ends_at >= starts_at)
);

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  transaction_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 320),
  due_date date not null,
  recurrence_rule text,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint renewals_workspace_id_id_key unique (workspace_id, id),
  constraint renewals_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint renewals_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  contact_id uuid,
  transaction_id uuid,
  channel text not null check (channel in ('call','message','email','meeting','other')),
  direction text not null check (direction in ('incoming','outgoing','internal')),
  summary text not null check (char_length(btrim(summary)) between 1 and 1200),
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint communications_workspace_id_id_key unique (workspace_id, id),
  constraint communications_company_fk foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete restrict,
  constraint communications_contact_fk foreign key (workspace_id, contact_id)
    references public.contacts(workspace_id, id) on delete restrict,
  constraint communications_transaction_fk foreign key (workspace_id, transaction_id)
    references public.transactions(workspace_id, id) on delete restrict
);

-- -----------------------------------------------------------------------------
-- Search / Automation / Intelligence
-- -----------------------------------------------------------------------------
create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  surface text not null check (char_length(btrim(surface)) between 1 and 120),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  sort jsonb not null default '{}'::jsonb check (jsonb_typeof(sort) = 'object'),
  pinned boolean not null default false,
  position integer check (position is null or position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_views_workspace_id_id_key unique (workspace_id, id),
  constraint saved_views_name_surface_unique unique (workspace_id, surface, name)
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 240),
  enabled boolean not null default true,
  trigger_config jsonb not null check (jsonb_typeof(trigger_config) = 'object'),
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions) = 'array'),
  actions jsonb not null check (jsonb_typeof(actions) = 'array'),
  throttle_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(throttle_policy) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_rules_workspace_id_id_key unique (workspace_id, id)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rule_id uuid not null,
  trigger_event_id uuid,
  status text not null default 'started' check (status in ('started','succeeded','skipped','failed')),
  receipt_key text,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint automation_runs_workspace_id_id_key unique (workspace_id, id),
  constraint automation_runs_rule_fk foreign key (workspace_id, rule_id)
    references public.automation_rules(workspace_id, id) on delete restrict
);

create table public.intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scope_type text not null check (char_length(btrim(scope_type)) between 1 and 120),
  scope_id uuid,
  snapshot_type text not null check (snapshot_type in ('risk','predictive','portfolio')),
  model_version text not null check (char_length(btrim(model_version)) between 1 and 120),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint intelligence_snapshots_workspace_id_id_key unique (workspace_id, id),
  constraint intelligence_snapshots_expiry_check check (expires_at is null or expires_at > generated_at)
);

-- -----------------------------------------------------------------------------
-- Notifications / Governance
-- -----------------------------------------------------------------------------
create table public.notification_preferences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminders_enabled boolean not null default false,
  remind_overdue boolean not null default true,
  remind_due_soon boolean not null default true,
  remind_stalled boolean not null default true,
  remind_stale boolean not null default true,
  daily_brief_enabled boolean not null default true,
  daily_brief_time time not null default '08:00',
  timezone text not null default 'Asia/Baghdad',
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint notification_preferences_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_memberships(workspace_id, user_id) on delete cascade
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (char_length(btrim(type)) between 1 and 120),
  dedupe_key text,
  channel text not null check (channel in ('in_app','push','email')),
  status text not null default 'scheduled' check (status in ('scheduled','sent','failed','cancelled')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  constraint notification_deliveries_workspace_id_id_key unique (workspace_id, id),
  constraint notification_deliveries_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_memberships(workspace_id, user_id) on delete cascade,
  constraint notification_deliveries_sent_check check ((status = 'sent' and sent_at is not null) or status <> 'sent')
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_device_id uuid,
  action text not null check (char_length(btrim(action)) between 1 and 180),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 120),
  entity_id uuid,
  summary text not null check (char_length(btrim(summary)) between 1 and 800),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint audit_events_workspace_id_id_key unique (workspace_id, id)
);

create table public.sync_devices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_label text,
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  app_version text,
  created_at timestamptz not null default now(),
  constraint sync_devices_workspace_id_id_key unique (workspace_id, id),
  constraint sync_devices_membership_fk foreign key (workspace_id, user_id)
    references public.workspace_memberships(workspace_id, user_id) on delete cascade
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null check (source in ('moaqib_backup','csv','other')),
  status text not null default 'started' check (status in ('started','validating','importing','succeeded','failed','cancelled')),
  counts jsonb not null default '{}'::jsonb check (jsonb_typeof(counts) = 'object'),
  reconciliation jsonb not null default '{}'::jsonb check (jsonb_typeof(reconciliation) = 'object'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint import_jobs_workspace_id_id_key unique (workspace_id, id),
  constraint import_jobs_finish_check check (
    (status in ('succeeded','failed','cancelled') and finished_at is not null)
    or (status in ('started','validating','importing') and finished_at is null)
  )
);

-- -----------------------------------------------------------------------------
-- Indexes: ownership, foreign keys, operational queues, finance, document lookup
-- -----------------------------------------------------------------------------
create index workspace_memberships_user_idx on public.workspace_memberships(user_id, workspace_id);
create index contacts_workspace_status_idx on public.contacts(workspace_id, status) where deleted_at is null;
create index contacts_workspace_name_idx on public.contacts(workspace_id, display_name) where deleted_at is null;
create index companies_workspace_status_idx on public.companies(workspace_id, status) where deleted_at is null;
create index companies_workspace_name_idx on public.companies(workspace_id, legal_name) where deleted_at is null;
create index company_contacts_contact_idx on public.company_contacts(workspace_id, contact_id);
create index lifecycle_entity_idx on public.entity_lifecycle_events(workspace_id, entity_type, entity_id, effective_at desc);
create index transactions_workspace_status_idx on public.transactions(workspace_id, status, last_activity_at desc) where deleted_at is null;
create index transactions_workspace_company_idx on public.transactions(workspace_id, company_id, created_at desc) where deleted_at is null;
create index transactions_workspace_priority_idx on public.transactions(workspace_id, priority, last_activity_at desc) where deleted_at is null;
create index transaction_routes_tx_idx on public.transaction_routes(workspace_id, transaction_id, occurred_at desc);
create index transaction_notes_tx_idx on public.transaction_notes(workspace_id, transaction_id, created_at desc);
create index followups_due_open_idx on public.transaction_followups(workspace_id, due_at) where status = 'open';
create index transaction_activity_tx_idx on public.transaction_activity(workspace_id, transaction_id, occurred_at desc);
create index transaction_blockers_open_idx on public.transaction_blockers(workspace_id, transaction_id, severity) where status = 'open';
create index dependencies_target_idx on public.transaction_dependencies(workspace_id, depends_on_transaction_id) where status = 'active';
create index payments_tx_paid_idx on public.payments(workspace_id, transaction_id, paid_at desc) where status = 'posted';
create index payments_company_paid_idx on public.payments(workspace_id, company_id, paid_at desc) where status = 'posted';
create index payment_reversals_payment_idx on public.payment_reversals(workspace_id, payment_id);
create index fee_changes_tx_idx on public.fee_changes(workspace_id, transaction_id, effective_at desc);
create index ledger_occurred_idx on public.financial_ledger_entries(workspace_id, occurred_at desc) where status = 'posted';
create index ledger_tx_idx on public.financial_ledger_entries(workspace_id, transaction_id, occurred_at desc) where transaction_id is not null;
create index documents_tx_idx on public.documents(workspace_id, transaction_id, created_at desc) where transaction_id is not null;
create index documents_company_idx on public.documents(workspace_id, company_id, created_at desc) where company_id is not null;
create index documents_status_idx on public.documents(workspace_id, status, created_at desc);
create index document_analysis_review_idx on public.document_analysis(workspace_id, review_status, analyzed_at desc);
create index correspondence_date_idx on public.correspondence_registry(workspace_id, correspondence_date desc);
create index workflow_instances_tx_idx on public.workflow_instances(workspace_id, transaction_id, status);
create unique index workflow_one_active_per_transaction_idx on public.workflow_instances(workspace_id, transaction_id) where status = 'active';
create index workflow_stage_active_idx on public.workflow_stage_states(workspace_id, workflow_instance_id, stage_position) where status in ('active','reopened');
create index calendar_events_start_idx on public.calendar_events(workspace_id, starts_at) where status = 'scheduled';
create index renewals_due_idx on public.renewals(workspace_id, due_date) where status = 'active';
create index communications_entity_time_idx on public.communications(workspace_id, transaction_id, occurred_at desc);
create index automation_rules_enabled_idx on public.automation_rules(workspace_id, enabled);
create index automation_runs_rule_idx on public.automation_runs(workspace_id, rule_id, started_at desc);
create unique index automation_runs_receipt_unique_idx on public.automation_runs(workspace_id, receipt_key) where receipt_key is not null;
create index intelligence_scope_idx on public.intelligence_snapshots(workspace_id, scope_type, scope_id, snapshot_type, generated_at desc);
create index notification_schedule_idx on public.notification_deliveries(workspace_id, scheduled_for) where status = 'scheduled';
create unique index notification_dedupe_unique_idx on public.notification_deliveries(workspace_id, user_id, dedupe_key) where dedupe_key is not null;
create index audit_entity_idx on public.audit_events(workspace_id, entity_type, entity_id, occurred_at desc);
create index audit_time_idx on public.audit_events(workspace_id, occurred_at desc);
create index import_jobs_status_idx on public.import_jobs(workspace_id, status, started_at desc);

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function private.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function private.set_updated_at();
create trigger companies_set_updated_at before update on public.companies for each row execute function private.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function private.set_updated_at();
create trigger cashbox_accounts_set_updated_at before update on public.cashbox_accounts for each row execute function private.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function private.set_updated_at();
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function private.set_updated_at();
create trigger document_drafts_set_updated_at before update on public.document_drafts for each row execute function private.set_updated_at();
create trigger workspace_settings_set_updated_at before update on public.workspace_settings for each row execute function private.set_updated_at();
create trigger workflow_templates_set_updated_at before update on public.workflow_templates for each row execute function private.set_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events for each row execute function private.set_updated_at();
create trigger renewals_set_updated_at before update on public.renewals for each row execute function private.set_updated_at();
create trigger saved_views_set_updated_at before update on public.saved_views for each row execute function private.set_updated_at();
create trigger automation_rules_set_updated_at before update on public.automation_rules for each row execute function private.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — every public table is explicitly enabled.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.contacts enable row level security;
alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.entity_lifecycle_events enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_routes enable row level security;
alter table public.transaction_notes enable row level security;
alter table public.transaction_followups enable row level security;
alter table public.transaction_activity enable row level security;
alter table public.transaction_blockers enable row level security;
alter table public.transaction_dependencies enable row level security;
alter table public.payments enable row level security;
alter table public.payment_reversals enable row level security;
alter table public.fee_changes enable row level security;
alter table public.financial_ledger_entries enable row level security;
alter table public.cashbox_accounts enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_analysis enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_drafts enable row level security;
alter table public.correspondence_registry enable row level security;
alter table public.pdf_jobs enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_stages enable row level security;
alter table public.workflow_template_items enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_stage_states enable row level security;
alter table public.workflow_item_states enable row level security;
alter table public.calendar_events enable row level security;
alter table public.renewals enable row level security;
alter table public.communications enable row level security;
alter table public.saved_views enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;
alter table public.intelligence_snapshots enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.audit_events enable row level security;
alter table public.sync_devices enable row level security;
alter table public.import_jobs enable row level security;

-- Profiles: self only.
create policy profiles_select_self on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check ((select auth.uid()) is not null and id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()))
  with check ((select auth.uid()) is not null and id = (select auth.uid()));

-- Workspace bootstrap: owner identity is immutable from the client.
create policy workspaces_select_member on public.workspaces for select to authenticated
  using (
    (select auth.uid()) is not null
    and (
      owner_user_id = (select auth.uid())
      or id in (
        select wm.workspace_id from public.workspace_memberships wm
        where wm.user_id = (select auth.uid())
      )
    )
  );
create policy workspaces_insert_owner on public.workspaces for insert to authenticated
  with check ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));
create policy workspaces_update_owner on public.workspaces for update to authenticated
  using ((select auth.uid()) is not null and owner_user_id = (select auth.uid()))
  with check ((select auth.uid()) is not null and owner_user_id = (select auth.uid()));

-- Memberships: 1.0 is owner-only; no client UPDATE/DELETE policy.
create policy workspace_memberships_select_self on public.workspace_memberships for select to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));
create policy workspace_memberships_insert_owner_self on public.workspace_memberships for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and role = 'owner'
    and workspace_id in (
      select w.id from public.workspaces w
      where w.owner_user_id = (select auth.uid())
    )
  );

-- workspace_settings
create policy workspace_settings_select_workspace on public.workspace_settings for select to authenticated
  using ((select auth.uid()) is not null
    and workspace_settings.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workspace_settings_insert_workspace on public.workspace_settings for insert to authenticated
  with check ((select auth.uid()) is not null
    and workspace_settings.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workspace_settings_update_workspace on public.workspace_settings for update to authenticated
  using ((select auth.uid()) is not null
    and workspace_settings.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workspace_settings.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- contacts
create policy contacts_select_workspace on public.contacts for select to authenticated
  using ((select auth.uid()) is not null
    and contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy contacts_insert_workspace on public.contacts for insert to authenticated
  with check ((select auth.uid()) is not null
    and contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy contacts_update_workspace on public.contacts for update to authenticated
  using ((select auth.uid()) is not null
    and contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- companies
create policy companies_select_workspace on public.companies for select to authenticated
  using ((select auth.uid()) is not null
    and companies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy companies_insert_workspace on public.companies for insert to authenticated
  with check ((select auth.uid()) is not null
    and companies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy companies_update_workspace on public.companies for update to authenticated
  using ((select auth.uid()) is not null
    and companies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and companies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- company_contacts
create policy company_contacts_select_workspace on public.company_contacts for select to authenticated
  using ((select auth.uid()) is not null
    and company_contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy company_contacts_insert_workspace on public.company_contacts for insert to authenticated
  with check ((select auth.uid()) is not null
    and company_contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy company_contacts_update_workspace on public.company_contacts for update to authenticated
  using ((select auth.uid()) is not null
    and company_contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and company_contacts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- entity_lifecycle_events
create policy entity_lifecycle_events_select_workspace on public.entity_lifecycle_events for select to authenticated
  using ((select auth.uid()) is not null
    and entity_lifecycle_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy entity_lifecycle_events_insert_workspace on public.entity_lifecycle_events for insert to authenticated
  with check ((select auth.uid()) is not null
    and entity_lifecycle_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and entity_lifecycle_events.actor_user_id = (select auth.uid())
    and entity_lifecycle_events.source = 'manual');

-- transactions
create policy transactions_select_workspace on public.transactions for select to authenticated
  using ((select auth.uid()) is not null
    and transactions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transactions_insert_workspace on public.transactions for insert to authenticated
  with check ((select auth.uid()) is not null
    and transactions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transactions_update_workspace on public.transactions for update to authenticated
  using ((select auth.uid()) is not null
    and transactions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transactions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- transaction_routes
create policy transaction_routes_select_workspace on public.transaction_routes for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_routes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_routes_insert_workspace on public.transaction_routes for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_routes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and transaction_routes.created_by = (select auth.uid()));
create policy transaction_routes_update_workspace on public.transaction_routes for update to authenticated
  using ((select auth.uid()) is not null
    and transaction_routes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transaction_routes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- transaction_notes
create policy transaction_notes_select_workspace on public.transaction_notes for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_notes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_notes_insert_workspace on public.transaction_notes for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_notes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and transaction_notes.created_by = (select auth.uid()));
create policy transaction_notes_update_workspace on public.transaction_notes for update to authenticated
  using ((select auth.uid()) is not null
    and transaction_notes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transaction_notes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- transaction_followups
create policy transaction_followups_select_workspace on public.transaction_followups for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_followups.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_followups_insert_workspace on public.transaction_followups for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_followups.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_followups_update_workspace on public.transaction_followups for update to authenticated
  using ((select auth.uid()) is not null
    and transaction_followups.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transaction_followups.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- transaction_activity
create policy transaction_activity_select_workspace on public.transaction_activity for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_activity.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_activity_insert_workspace on public.transaction_activity for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_activity.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and transaction_activity.actor_user_id = (select auth.uid()));

-- transaction_blockers
create policy transaction_blockers_select_workspace on public.transaction_blockers for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_blockers.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_blockers_insert_workspace on public.transaction_blockers for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_blockers.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_blockers_update_workspace on public.transaction_blockers for update to authenticated
  using ((select auth.uid()) is not null
    and transaction_blockers.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transaction_blockers.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- transaction_dependencies
create policy transaction_dependencies_select_workspace on public.transaction_dependencies for select to authenticated
  using ((select auth.uid()) is not null
    and transaction_dependencies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_dependencies_insert_workspace on public.transaction_dependencies for insert to authenticated
  with check ((select auth.uid()) is not null
    and transaction_dependencies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy transaction_dependencies_update_workspace on public.transaction_dependencies for update to authenticated
  using ((select auth.uid()) is not null
    and transaction_dependencies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and transaction_dependencies.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- payments
create policy payments_select_workspace on public.payments for select to authenticated
  using ((select auth.uid()) is not null
    and payments.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy payments_insert_workspace on public.payments for insert to authenticated
  with check ((select auth.uid()) is not null
    and payments.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and payments.status = 'posted');

-- payment_reversals
create policy payment_reversals_select_workspace on public.payment_reversals for select to authenticated
  using ((select auth.uid()) is not null
    and payment_reversals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy payment_reversals_insert_workspace on public.payment_reversals for insert to authenticated
  with check ((select auth.uid()) is not null
    and payment_reversals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and payment_reversals.actor_user_id = (select auth.uid()));

-- fee_changes
create policy fee_changes_select_workspace on public.fee_changes for select to authenticated
  using ((select auth.uid()) is not null
    and fee_changes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy fee_changes_insert_workspace on public.fee_changes for insert to authenticated
  with check ((select auth.uid()) is not null
    and fee_changes.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and fee_changes.actor_user_id = (select auth.uid()));

-- financial_ledger_entries
create policy financial_ledger_entries_select_workspace on public.financial_ledger_entries for select to authenticated
  using ((select auth.uid()) is not null
    and financial_ledger_entries.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy financial_ledger_entries_insert_workspace on public.financial_ledger_entries for insert to authenticated
  with check ((select auth.uid()) is not null
    and financial_ledger_entries.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    )
    and financial_ledger_entries.status = 'posted'
    and financial_ledger_entries.reversed_at is null
    and financial_ledger_entries.reversal_reason is null);

-- cashbox_accounts
create policy cashbox_accounts_select_workspace on public.cashbox_accounts for select to authenticated
  using ((select auth.uid()) is not null
    and cashbox_accounts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy cashbox_accounts_insert_workspace on public.cashbox_accounts for insert to authenticated
  with check ((select auth.uid()) is not null
    and cashbox_accounts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy cashbox_accounts_update_workspace on public.cashbox_accounts for update to authenticated
  using ((select auth.uid()) is not null
    and cashbox_accounts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and cashbox_accounts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- documents
create policy documents_select_workspace on public.documents for select to authenticated
  using ((select auth.uid()) is not null
    and documents.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy documents_insert_workspace on public.documents for insert to authenticated
  with check ((select auth.uid()) is not null
    and documents.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy documents_update_workspace on public.documents for update to authenticated
  using ((select auth.uid()) is not null
    and documents.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and documents.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- document_versions
create policy document_versions_select_workspace on public.document_versions for select to authenticated
  using ((select auth.uid()) is not null
    and document_versions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_versions_insert_workspace on public.document_versions for insert to authenticated
  with check ((select auth.uid()) is not null
    and document_versions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_versions_update_workspace on public.document_versions for update to authenticated
  using ((select auth.uid()) is not null
    and document_versions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and document_versions.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- document_analysis
create policy document_analysis_select_workspace on public.document_analysis for select to authenticated
  using ((select auth.uid()) is not null
    and document_analysis.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_analysis_insert_workspace on public.document_analysis for insert to authenticated
  with check ((select auth.uid()) is not null
    and document_analysis.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_analysis_update_workspace on public.document_analysis for update to authenticated
  using ((select auth.uid()) is not null
    and document_analysis.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and document_analysis.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- document_templates
create policy document_templates_select_workspace on public.document_templates for select to authenticated
  using ((select auth.uid()) is not null
    and document_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_templates_insert_workspace on public.document_templates for insert to authenticated
  with check ((select auth.uid()) is not null
    and document_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_templates_update_workspace on public.document_templates for update to authenticated
  using ((select auth.uid()) is not null
    and document_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and document_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- document_drafts
create policy document_drafts_select_workspace on public.document_drafts for select to authenticated
  using ((select auth.uid()) is not null
    and document_drafts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_drafts_insert_workspace on public.document_drafts for insert to authenticated
  with check ((select auth.uid()) is not null
    and document_drafts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy document_drafts_update_workspace on public.document_drafts for update to authenticated
  using ((select auth.uid()) is not null
    and document_drafts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and document_drafts.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- correspondence_registry
create policy correspondence_registry_select_workspace on public.correspondence_registry for select to authenticated
  using ((select auth.uid()) is not null
    and correspondence_registry.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy correspondence_registry_insert_workspace on public.correspondence_registry for insert to authenticated
  with check ((select auth.uid()) is not null
    and correspondence_registry.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy correspondence_registry_update_workspace on public.correspondence_registry for update to authenticated
  using ((select auth.uid()) is not null
    and correspondence_registry.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and correspondence_registry.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- pdf_jobs
create policy pdf_jobs_select_workspace on public.pdf_jobs for select to authenticated
  using ((select auth.uid()) is not null
    and pdf_jobs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy pdf_jobs_insert_workspace on public.pdf_jobs for insert to authenticated
  with check ((select auth.uid()) is not null
    and pdf_jobs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy pdf_jobs_update_workspace on public.pdf_jobs for update to authenticated
  using ((select auth.uid()) is not null
    and pdf_jobs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and pdf_jobs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_templates
create policy workflow_templates_select_workspace on public.workflow_templates for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_templates_insert_workspace on public.workflow_templates for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_templates_update_workspace on public.workflow_templates for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_templates.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_template_stages
create policy workflow_template_stages_select_workspace on public.workflow_template_stages for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_template_stages.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_template_stages_insert_workspace on public.workflow_template_stages for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_template_stages.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_template_stages_update_workspace on public.workflow_template_stages for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_template_stages.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_template_stages.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_template_items
create policy workflow_template_items_select_workspace on public.workflow_template_items for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_template_items.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_template_items_insert_workspace on public.workflow_template_items for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_template_items.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_template_items_update_workspace on public.workflow_template_items for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_template_items.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_template_items.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_instances
create policy workflow_instances_select_workspace on public.workflow_instances for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_instances.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_instances_insert_workspace on public.workflow_instances for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_instances.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_instances_update_workspace on public.workflow_instances for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_instances.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_instances.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_stage_states
create policy workflow_stage_states_select_workspace on public.workflow_stage_states for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_stage_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_stage_states_insert_workspace on public.workflow_stage_states for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_stage_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_stage_states_update_workspace on public.workflow_stage_states for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_stage_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_stage_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- workflow_item_states
create policy workflow_item_states_select_workspace on public.workflow_item_states for select to authenticated
  using ((select auth.uid()) is not null
    and workflow_item_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_item_states_insert_workspace on public.workflow_item_states for insert to authenticated
  with check ((select auth.uid()) is not null
    and workflow_item_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy workflow_item_states_update_workspace on public.workflow_item_states for update to authenticated
  using ((select auth.uid()) is not null
    and workflow_item_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and workflow_item_states.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- calendar_events
create policy calendar_events_select_workspace on public.calendar_events for select to authenticated
  using ((select auth.uid()) is not null
    and calendar_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy calendar_events_insert_workspace on public.calendar_events for insert to authenticated
  with check ((select auth.uid()) is not null
    and calendar_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy calendar_events_update_workspace on public.calendar_events for update to authenticated
  using ((select auth.uid()) is not null
    and calendar_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and calendar_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- renewals
create policy renewals_select_workspace on public.renewals for select to authenticated
  using ((select auth.uid()) is not null
    and renewals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy renewals_insert_workspace on public.renewals for insert to authenticated
  with check ((select auth.uid()) is not null
    and renewals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy renewals_update_workspace on public.renewals for update to authenticated
  using ((select auth.uid()) is not null
    and renewals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and renewals.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- communications
create policy communications_select_workspace on public.communications for select to authenticated
  using ((select auth.uid()) is not null
    and communications.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy communications_insert_workspace on public.communications for insert to authenticated
  with check ((select auth.uid()) is not null
    and communications.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy communications_update_workspace on public.communications for update to authenticated
  using ((select auth.uid()) is not null
    and communications.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and communications.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- saved_views
create policy saved_views_select_workspace on public.saved_views for select to authenticated
  using ((select auth.uid()) is not null
    and saved_views.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy saved_views_insert_workspace on public.saved_views for insert to authenticated
  with check ((select auth.uid()) is not null
    and saved_views.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy saved_views_update_workspace on public.saved_views for update to authenticated
  using ((select auth.uid()) is not null
    and saved_views.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and saved_views.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- automation_rules
create policy automation_rules_select_workspace on public.automation_rules for select to authenticated
  using ((select auth.uid()) is not null
    and automation_rules.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy automation_rules_insert_workspace on public.automation_rules for insert to authenticated
  with check ((select auth.uid()) is not null
    and automation_rules.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy automation_rules_update_workspace on public.automation_rules for update to authenticated
  using ((select auth.uid()) is not null
    and automation_rules.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and automation_rules.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- automation_runs
create policy automation_runs_select_workspace on public.automation_runs for select to authenticated
  using ((select auth.uid()) is not null
    and automation_runs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- intelligence_snapshots
create policy intelligence_snapshots_select_workspace on public.intelligence_snapshots for select to authenticated
  using ((select auth.uid()) is not null
    and intelligence_snapshots.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- notification_preferences
create policy notification_preferences_select_workspace on public.notification_preferences for select to authenticated
  using ((select auth.uid()) is not null
    and notification_preferences.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy notification_preferences_insert_workspace on public.notification_preferences for insert to authenticated
  with check ((select auth.uid()) is not null
    and notification_preferences.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy notification_preferences_update_workspace on public.notification_preferences for update to authenticated
  using ((select auth.uid()) is not null
    and notification_preferences.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and notification_preferences.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- notification_deliveries
create policy notification_deliveries_select_workspace on public.notification_deliveries for select to authenticated
  using ((select auth.uid()) is not null
    and notification_deliveries.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- audit_events
create policy audit_events_select_workspace on public.audit_events for select to authenticated
  using ((select auth.uid()) is not null
    and audit_events.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- sync_devices
create policy sync_devices_select_workspace on public.sync_devices for select to authenticated
  using ((select auth.uid()) is not null
    and sync_devices.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy sync_devices_insert_workspace on public.sync_devices for insert to authenticated
  with check ((select auth.uid()) is not null
    and sync_devices.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));
create policy sync_devices_update_workspace on public.sync_devices for update to authenticated
  using ((select auth.uid()) is not null
    and sync_devices.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ))
  with check ((select auth.uid()) is not null
    and sync_devices.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- import_jobs
create policy import_jobs_select_workspace on public.import_jobs for select to authenticated
  using ((select auth.uid()) is not null
    and import_jobs.workspace_id in (
      select wm.workspace_id from public.workspace_memberships wm
      where wm.user_id = (select auth.uid())
    ));

-- -----------------------------------------------------------------------------
-- Grants: anon receives no table privileges. RLS + grants are both required.
-- -----------------------------------------------------------------------------
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;
revoke all on table public.workspace_settings from anon, authenticated;
revoke all on table public.contacts from anon, authenticated;
revoke all on table public.companies from anon, authenticated;
revoke all on table public.company_contacts from anon, authenticated;
revoke all on table public.entity_lifecycle_events from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.transaction_routes from anon, authenticated;
revoke all on table public.transaction_notes from anon, authenticated;
revoke all on table public.transaction_followups from anon, authenticated;
revoke all on table public.transaction_activity from anon, authenticated;
revoke all on table public.transaction_blockers from anon, authenticated;
revoke all on table public.transaction_dependencies from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.payment_reversals from anon, authenticated;
revoke all on table public.fee_changes from anon, authenticated;
revoke all on table public.financial_ledger_entries from anon, authenticated;
revoke all on table public.cashbox_accounts from anon, authenticated;
revoke all on table public.documents from anon, authenticated;
revoke all on table public.document_versions from anon, authenticated;
revoke all on table public.document_analysis from anon, authenticated;
revoke all on table public.document_templates from anon, authenticated;
revoke all on table public.document_drafts from anon, authenticated;
revoke all on table public.correspondence_registry from anon, authenticated;
revoke all on table public.pdf_jobs from anon, authenticated;
revoke all on table public.workflow_templates from anon, authenticated;
revoke all on table public.workflow_template_stages from anon, authenticated;
revoke all on table public.workflow_template_items from anon, authenticated;
revoke all on table public.workflow_instances from anon, authenticated;
revoke all on table public.workflow_stage_states from anon, authenticated;
revoke all on table public.workflow_item_states from anon, authenticated;
revoke all on table public.calendar_events from anon, authenticated;
revoke all on table public.renewals from anon, authenticated;
revoke all on table public.communications from anon, authenticated;
revoke all on table public.saved_views from anon, authenticated;
revoke all on table public.automation_rules from anon, authenticated;
revoke all on table public.automation_runs from anon, authenticated;
revoke all on table public.intelligence_snapshots from anon, authenticated;
revoke all on table public.notification_preferences from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on table public.sync_devices from anon, authenticated;
revoke all on table public.import_jobs from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.workspaces to authenticated;
grant select, insert on public.workspace_memberships to authenticated;
grant select, insert, update on public.workspace_settings to authenticated;
grant select, insert, update on public.contacts to authenticated;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.company_contacts to authenticated;
grant select, insert on public.entity_lifecycle_events to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select, insert, update on public.transaction_routes to authenticated;
grant select, insert, update on public.transaction_notes to authenticated;
grant select, insert, update on public.transaction_followups to authenticated;
grant select, insert on public.transaction_activity to authenticated;
grant select, insert, update on public.transaction_blockers to authenticated;
grant select, insert, update on public.transaction_dependencies to authenticated;
grant select, insert on public.payments to authenticated;
grant select, insert on public.payment_reversals to authenticated;
grant select, insert on public.fee_changes to authenticated;
grant select, insert on public.financial_ledger_entries to authenticated;
grant select, insert, update on public.cashbox_accounts to authenticated;
grant select, insert, update on public.documents to authenticated;
grant select, insert, update on public.document_versions to authenticated;
grant select, insert, update on public.document_analysis to authenticated;
grant select, insert, update on public.document_templates to authenticated;
grant select, insert, update on public.document_drafts to authenticated;
grant select, insert, update on public.correspondence_registry to authenticated;
grant select, insert, update on public.pdf_jobs to authenticated;
grant select, insert, update on public.workflow_templates to authenticated;
grant select, insert, update on public.workflow_template_stages to authenticated;
grant select, insert, update on public.workflow_template_items to authenticated;
grant select, insert, update on public.workflow_instances to authenticated;
grant select, insert, update on public.workflow_stage_states to authenticated;
grant select, insert, update on public.workflow_item_states to authenticated;
grant select, insert, update on public.calendar_events to authenticated;
grant select, insert, update on public.renewals to authenticated;
grant select, insert, update on public.communications to authenticated;
grant select, insert, update on public.saved_views to authenticated;
grant select, insert, update on public.automation_rules to authenticated;
grant select on public.automation_runs to authenticated;
grant select on public.intelligence_snapshots to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notification_deliveries to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update on public.sync_devices to authenticated;
grant select on public.import_jobs to authenticated;

-- No table DELETE privilege is granted to authenticated in Phase 1.2.
-- Hard deletes are not a browser capability; domain-level soft delete/reversal comes later.

commit;
