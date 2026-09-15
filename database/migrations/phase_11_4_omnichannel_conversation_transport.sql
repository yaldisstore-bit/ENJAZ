-- ENJAZ Phase 11.4-B — Omnichannel Communications Hub M4
-- Canonical conversation + transport evidence model.
-- `communications` remains the one business communication truth. Provider transport
-- attempts/events, endpoint fingerprints, consent and relink evidence are supporting
-- authority only; provider credentials/raw webhook payloads are intentionally absent.

begin;

-- -----------------------------------------------------------------------------
-- Canonical conversation grouping. A conversation may exist before deterministic
-- entity matching; ambiguous/unmatched inbound is therefore allowed to remain unlinked.
-- -----------------------------------------------------------------------------

create table public.communication_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_id uuid,
  contact_id uuid,
  transaction_id uuid,
  subject text,
  status text not null default 'open' check (status in ('open','closed')),
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_conversations_workspace_id_id_key unique(workspace_id,id),
  constraint communication_conversations_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on delete restrict,
  constraint communication_conversations_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint communication_conversations_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint communication_conversations_subject_check check (
    subject is null or (char_length(btrim(subject)) between 1 and 300)
  )
);

create index communication_conversations_company_idx
  on public.communication_conversations(workspace_id,company_id,updated_at desc)
  where company_id is not null;
create index communication_conversations_contact_idx
  on public.communication_conversations(workspace_id,contact_id,updated_at desc)
  where contact_id is not null;
create index communication_conversations_transaction_idx
  on public.communication_conversations(workspace_id,transaction_id,updated_at desc)
  where transaction_id is not null;
create index communication_conversations_open_idx
  on public.communication_conversations(workspace_id,updated_at desc)
  where status='open';

create trigger communication_conversations_set_updated_at
before update on public.communication_conversations
for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Provider account identity only. No access token, refresh token, API secret,
-- webhook secret, signing secret or raw provider configuration is stored here.
-- -----------------------------------------------------------------------------

create table public.communication_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp','sms')),
  provider text not null check (char_length(btrim(provider)) between 1 and 80),
  external_account_ref text not null check (char_length(btrim(external_account_ref)) between 1 and 500),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 200),
  capabilities text[] not null default '{}'::text[] check (
    capabilities <@ array['send','receive','delivery_receipts','read_receipts','attachments']::text[]
  ),
  enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_provider_accounts_workspace_id_id_key unique(workspace_id,id),
  constraint communication_provider_accounts_identity_key unique(workspace_id,channel,provider,external_account_ref)
);

create index communication_provider_accounts_enabled_idx
  on public.communication_provider_accounts(workspace_id,channel,enabled);

create trigger communication_provider_accounts_set_updated_at
before update on public.communication_provider_accounts
for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Opaque endpoint fingerprints. Raw phone numbers/email addresses are never copied
-- into this matching table. Multiple active candidates are allowed intentionally so
-- the matching layer can fail closed into review instead of guessing.
-- -----------------------------------------------------------------------------

create table public.communication_endpoint_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_account_id uuid not null,
  endpoint_fingerprint text not null check (endpoint_fingerprint ~ '^[a-f0-9]{64}$'),
  fingerprint_scheme text not null default 'hmac-sha256-v1' check (fingerprint_scheme='hmac-sha256-v1'),
  company_id uuid,
  contact_id uuid,
  transaction_id uuid,
  source text not null check (source in ('explicit','import','verified_reply','manual_review')),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_endpoint_bindings_workspace_id_id_key unique(workspace_id,id),
  constraint communication_endpoint_bindings_provider_fk foreign key(workspace_id,provider_account_id)
    references public.communication_provider_accounts(workspace_id,id) on delete cascade,
  constraint communication_endpoint_bindings_company_fk foreign key(workspace_id,company_id)
    references public.companies(workspace_id,id) on delete restrict,
  constraint communication_endpoint_bindings_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint communication_endpoint_bindings_transaction_fk foreign key(workspace_id,transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint communication_endpoint_bindings_target_check check (
    company_id is not null or contact_id is not null or transaction_id is not null
  )
);

create index communication_endpoint_bindings_lookup_idx
  on public.communication_endpoint_bindings(workspace_id,provider_account_id,endpoint_fingerprint)
  where active;
create index communication_endpoint_bindings_contact_idx
  on public.communication_endpoint_bindings(workspace_id,contact_id)
  where contact_id is not null and active;

create trigger communication_endpoint_bindings_set_updated_at
before update on public.communication_endpoint_bindings
for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Channel consent / eligibility authority. Missing rows are UNKNOWN and must fail
-- closed in outbound command logic. Endpoint identity is an opaque fingerprint only.
-- -----------------------------------------------------------------------------

create table public.communication_channel_consents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid,
  channel text not null check (channel in ('email','whatsapp','sms')),
  endpoint_fingerprint text not null check (endpoint_fingerprint ~ '^[a-f0-9]{64}$'),
  fingerprint_scheme text not null default 'hmac-sha256-v1' check (fingerprint_scheme='hmac-sha256-v1'),
  status text not null check (status in ('granted','withdrawn','not_required')),
  source text not null check (char_length(btrim(source)) between 1 and 120),
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  version integer not null default 1 check (version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_channel_consents_workspace_id_id_key unique(workspace_id,id),
  constraint communication_channel_consents_contact_fk foreign key(workspace_id,contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint communication_channel_consents_identity_key unique(workspace_id,channel,endpoint_fingerprint),
  constraint communication_channel_consents_expiry_check check (expires_at is null or expires_at > effective_at)
);

create index communication_channel_consents_contact_idx
  on public.communication_channel_consents(workspace_id,contact_id,channel)
  where contact_id is not null;
create index communication_channel_consents_active_idx
  on public.communication_channel_consents(workspace_id,channel,status,effective_at desc);

create trigger communication_channel_consents_set_updated_at
before update on public.communication_channel_consents
for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Evolve canonical communications in-place. Existing legacy/manual channels remain
-- valid while provider-native channels become first-class. Transport status is NOT
-- stored here; transport truth belongs to attempts/events below.
-- -----------------------------------------------------------------------------

alter table public.communications drop constraint communications_channel_check;
alter table public.communications add constraint communications_channel_check
  check (channel in ('call','message','email','meeting','other','sms','whatsapp','client_portal'));

alter table public.communications
  add column conversation_id uuid,
  add column link_status text not null default 'unmatched',
  add column link_version integer not null default 1;

alter table public.communications
  add constraint communications_conversation_fk foreign key(workspace_id,conversation_id)
    references public.communication_conversations(workspace_id,id) on delete restrict,
  add constraint communications_link_status_check check (link_status in ('unmatched','review_required','linked')),
  add constraint communications_link_version_check check (link_version > 0);

create index communications_conversation_time_idx
  on public.communications(workspace_id,conversation_id,occurred_at desc)
  where conversation_id is not null;
create index communications_review_queue_idx
  on public.communications(workspace_id,occurred_at desc)
  where link_status='review_required';

-- -----------------------------------------------------------------------------
-- Transport attempt evidence. Inbound requires a provider message identity;
-- outbound requires an explicit idempotency key. A unique provider message index
-- deduplicates webhook retries; a unique outbound command index prevents double send.
-- -----------------------------------------------------------------------------

create table public.communication_transport_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  communication_id uuid not null,
  provider_account_id uuid not null,
  direction text not null check (direction in ('incoming','outgoing')),
  idempotency_key text,
  provider_message_id text,
  status text not null check (status in ('received','queued','accepted','sent','delivered','read','failed','cancelled')),
  attempt_no integer not null default 1 check (attempt_no > 0),
  error_code text check (error_code is null or char_length(btrim(error_code)) between 1 and 120),
  requested_at timestamptz not null default now(),
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_transport_attempts_workspace_id_id_key unique(workspace_id,id),
  constraint communication_transport_attempts_workspace_id_id_provider_key unique(workspace_id,id,provider_account_id),
  constraint communication_transport_attempts_communication_fk foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint communication_transport_attempts_provider_fk foreign key(workspace_id,provider_account_id)
    references public.communication_provider_accounts(workspace_id,id) on delete restrict,
  constraint communication_transport_attempts_identity_check check (
    (direction='incoming' and provider_message_id is not null and char_length(btrim(provider_message_id)) between 1 and 500)
    or
    (direction='outgoing' and idempotency_key is not null and char_length(btrim(idempotency_key)) between 1 and 300)
  ),
  constraint communication_transport_attempts_provider_message_check check (
    provider_message_id is null or char_length(btrim(provider_message_id)) between 1 and 500
  ),
  constraint communication_transport_attempts_idempotency_check check (
    idempotency_key is null or char_length(btrim(idempotency_key)) between 1 and 300
  ),
  constraint communication_transport_attempts_event_time_check check (
    last_event_at is null or last_event_at >= requested_at
  )
);

create unique index communication_transport_attempts_outbound_idempotency_key
  on public.communication_transport_attempts(workspace_id,provider_account_id,idempotency_key)
  where direction='outgoing' and idempotency_key is not null;
create unique index communication_transport_attempts_provider_message_key
  on public.communication_transport_attempts(workspace_id,provider_account_id,provider_message_id)
  where provider_message_id is not null;
create index communication_transport_attempts_communication_idx
  on public.communication_transport_attempts(workspace_id,communication_id,requested_at desc);
create index communication_transport_attempts_status_idx
  on public.communication_transport_attempts(workspace_id,status,requested_at desc);

create trigger communication_transport_attempts_set_updated_at
before update on public.communication_transport_attempts
for each row execute function private.set_updated_at();

-- Provider account channel and canonical communication channel must agree.
create or replace function private.validate_communication_transport_scope_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_account_channel text;
  v_communication_channel text;
begin
  select pa.channel into v_account_channel
  from public.communication_provider_accounts pa
  where pa.workspace_id=new.workspace_id and pa.id=new.provider_account_id;

  select c.channel into v_communication_channel
  from public.communications c
  where c.workspace_id=new.workspace_id and c.id=new.communication_id;

  if v_account_channel is null or v_communication_channel is null then
    raise foreign_key_violation using message='ENJAZ_COMMUNICATION_TRANSPORT_SCOPE_INVALID';
  end if;
  if v_account_channel<>v_communication_channel then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger communication_transport_attempts_scope_guard
before insert or update of workspace_id,communication_id,provider_account_id
on public.communication_transport_attempts
for each row execute function private.validate_communication_transport_scope_v1();

-- -----------------------------------------------------------------------------
-- Append-only provider event evidence. No raw webhook payload/header/body column is
-- present. Provider event identity is unique within provider-account scope.
-- -----------------------------------------------------------------------------

create table public.communication_transport_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  attempt_id uuid not null,
  provider_account_id uuid not null,
  provider_event_id text not null check (char_length(btrim(provider_event_id)) between 1 and 500),
  event_type text not null check (event_type in ('received','accepted','sent','delivered','read','failed','cancelled')),
  error_code text check (error_code is null or char_length(btrim(error_code)) between 1 and 120),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint communication_transport_events_workspace_id_id_key unique(workspace_id,id),
  constraint communication_transport_events_attempt_fk foreign key(workspace_id,attempt_id,provider_account_id)
    references public.communication_transport_attempts(workspace_id,id,provider_account_id) on delete restrict,
  constraint communication_transport_events_provider_fk foreign key(workspace_id,provider_account_id)
    references public.communication_provider_accounts(workspace_id,id) on delete restrict,
  constraint communication_transport_events_provider_event_key unique(workspace_id,provider_account_id,provider_event_id)
);

create index communication_transport_events_attempt_idx
  on public.communication_transport_events(workspace_id,attempt_id,occurred_at desc);
create index communication_transport_events_time_idx
  on public.communication_transport_events(workspace_id,occurred_at desc);

-- -----------------------------------------------------------------------------
-- Immutable manual relink evidence. The actual governed relink command arrives in
-- 11.4-C; this table records old/new scope + optimistic version transition.
-- -----------------------------------------------------------------------------

create table public.communication_relink_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  communication_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  old_conversation_id uuid,
  new_conversation_id uuid,
  old_company_id uuid,
  new_company_id uuid,
  old_contact_id uuid,
  new_contact_id uuid,
  old_transaction_id uuid,
  new_transaction_id uuid,
  reason text not null check (char_length(btrim(reason)) between 3 and 800),
  expected_version integer not null check (expected_version > 0),
  resulting_version integer not null check (resulting_version = expected_version + 1),
  occurred_at timestamptz not null default now(),
  constraint communication_relink_events_workspace_id_id_key unique(workspace_id,id),
  constraint communication_relink_events_communication_fk foreign key(workspace_id,communication_id)
    references public.communications(workspace_id,id) on delete restrict,
  constraint communication_relink_events_old_conversation_fk foreign key(workspace_id,old_conversation_id)
    references public.communication_conversations(workspace_id,id) on delete restrict,
  constraint communication_relink_events_new_conversation_fk foreign key(workspace_id,new_conversation_id)
    references public.communication_conversations(workspace_id,id) on delete restrict,
  constraint communication_relink_events_old_company_fk foreign key(workspace_id,old_company_id)
    references public.companies(workspace_id,id) on delete restrict,
  constraint communication_relink_events_new_company_fk foreign key(workspace_id,new_company_id)
    references public.companies(workspace_id,id) on delete restrict,
  constraint communication_relink_events_old_contact_fk foreign key(workspace_id,old_contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint communication_relink_events_new_contact_fk foreign key(workspace_id,new_contact_id)
    references public.contacts(workspace_id,id) on delete restrict,
  constraint communication_relink_events_old_transaction_fk foreign key(workspace_id,old_transaction_id)
    references public.transactions(workspace_id,id) on delete restrict,
  constraint communication_relink_events_new_transaction_fk foreign key(workspace_id,new_transaction_id)
    references public.transactions(workspace_id,id) on delete restrict
);

create index communication_relink_events_communication_idx
  on public.communication_relink_events(workspace_id,communication_id,occurred_at desc);
create index communication_relink_events_actor_idx
  on public.communication_relink_events(actor_user_id,occurred_at desc);

-- Append-only evidence may never be updated/deleted through ordinary SQL paths.
create or replace function private.reject_communication_evidence_mutation_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  raise insufficient_privilege using message='ENJAZ_COMMUNICATION_EVIDENCE_APPEND_ONLY';
end;
$$;

create trigger communication_transport_events_append_only
before update or delete on public.communication_transport_events
for each row execute function private.reject_communication_evidence_mutation_v1();

create trigger communication_relink_events_append_only
before update or delete on public.communication_relink_events
for each row execute function private.reject_communication_evidence_mutation_v1();

-- -----------------------------------------------------------------------------
-- RLS + explicit Data API privilege boundary.
-- All support tables are backend-only in 11.4-B. There are deliberately no anon or
-- authenticated grants/policies. 11.4-C/D will expose only governed RPC/projections.
-- -----------------------------------------------------------------------------

alter table public.communication_conversations enable row level security;
alter table public.communication_provider_accounts enable row level security;
alter table public.communication_endpoint_bindings enable row level security;
alter table public.communication_channel_consents enable row level security;
alter table public.communication_transport_attempts enable row level security;
alter table public.communication_transport_events enable row level security;
alter table public.communication_relink_events enable row level security;

revoke all on table
  public.communication_conversations,
  public.communication_provider_accounts,
  public.communication_endpoint_bindings,
  public.communication_channel_consents,
  public.communication_transport_attempts,
  public.communication_transport_events,
  public.communication_relink_events
from public,anon,authenticated;

-- The canonical table also stays non-direct-browser authority for M4. Existing RLS
-- remains defense-in-depth, but browser roles receive no direct table privilege.
revoke all on table public.communications from public,anon,authenticated;

-- Explicit server-side privileges for Edge/provider integration in 11.4-C.
grant select,insert,update on table public.communications to service_role;
grant select,insert,update,delete on table
  public.communication_conversations,
  public.communication_provider_accounts,
  public.communication_endpoint_bindings,
  public.communication_channel_consents,
  public.communication_transport_attempts
  to service_role;
grant select,insert on table
  public.communication_transport_events,
  public.communication_relink_events
  to service_role;
revoke delete on table public.communications from service_role;
revoke update,delete on table public.communication_transport_events,public.communication_relink_events from service_role;

-- Internal trigger helpers are not callable by API roles.
revoke all on function private.validate_communication_transport_scope_v1() from public,anon,authenticated;
revoke all on function private.reject_communication_evidence_mutation_v1() from public,anon,authenticated;

commit;
