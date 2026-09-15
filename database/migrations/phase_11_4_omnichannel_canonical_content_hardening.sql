-- ENJAZ Phase 11.4-B — canonical communication content hardening
-- `summary` remains a short preview/search field. Full human-readable message truth
-- stays on the canonical `communications` row as subject + plain-text body, never in
-- a provider-specific shadow store. Once transport begins, the canonical envelope
-- and content become immutable; governed relinking remains a separate authority.

begin;

alter table public.communications
  add column subject text,
  add column body_text text;

alter table public.communications
  add constraint communications_subject_check check (
    subject is null or char_length(btrim(subject)) between 1 and 998
  ),
  add constraint communications_body_text_check check (
    body_text is null or char_length(body_text) between 1 and 200000
  );

comment on column public.communications.summary is
  'Short canonical preview/search summary only; not the full message body.';
comment on column public.communications.subject is
  'Canonical human-readable subject when the channel supports one.';
comment on column public.communications.body_text is
  'Canonical sanitized plain-text message body. Provider raw payload/HTML is not authoritative here.';

create or replace function private.guard_communication_content_immutability_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if exists (
    select 1
    from public.communication_transport_attempts a
    where a.workspace_id=old.workspace_id
      and a.communication_id=old.id
    limit 1
  ) and (
    new.channel is distinct from old.channel
    or new.direction is distinct from old.direction
    or new.summary is distinct from old.summary
    or new.subject is distinct from old.subject
    or new.body_text is distinct from old.body_text
    or new.occurred_at is distinct from old.occurred_at
    or new.metadata is distinct from old.metadata
  ) then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_CONTENT_IMMUTABLE_AFTER_TRANSPORT';
  end if;
  return new;
end;
$$;

create trigger communications_content_immutability_guard
before update of channel,direction,summary,subject,body_text,occurred_at,metadata
on public.communications
for each row execute function private.guard_communication_content_immutability_v1();

revoke all on function private.guard_communication_content_immutability_v1() from public,anon,authenticated;

commit;
