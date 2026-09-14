-- ENJAZ Phase 10.3 — workspace lifecycle hardening
-- Official artifacts remain immutable while their workspace exists.
-- A parent workspace deletion may cascade through immutable children so cleanup/retention policy can complete atomically.
begin;

create or replace function private.document_template_versions_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and old.status='published' then
    if exists(select 1 from public.workspaces w where w.id=old.workspace_id) then
      raise check_violation using message='ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE';
    end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.status='published' then
    raise check_violation using message='ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE';
  end if;
  if tg_op='UPDATE' and old.status='draft' then
    if new.workspace_id<>old.workspace_id or new.template_id<>old.template_id or new.version_number<>old.version_number
       or new.body_source<>old.body_source or new.token_schema<>old.token_schema or new.content_checksum<>old.content_checksum
       or new.created_by is distinct from old.created_by or new.created_at<>old.created_at then
      raise check_violation using message='ENJAZ_TEMPLATE_VERSION_CONTENT_IMMUTABLE';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;$$;
revoke all on function private.document_template_versions_immutable_v1() from public,anon,authenticated;

create or replace function private.document_drafts_final_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='final' then
    if tg_op='DELETE' and not exists(select 1 from public.workspaces w where w.id=old.workspace_id) then
      return old;
    end if;
    raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE';
  end if;
  if tg_op='UPDATE' and old.status<>new.status then
    if not (
      (old.status='draft' and new.status in ('review_required','failed'))
      or (old.status='review_required' and new.status in ('draft','approved','failed'))
      or (old.status='approved' and new.status in ('draft','final','failed'))
      or (old.status='registered' and new.status in ('draft','review_required','failed'))
      or (old.status='failed' and new.status='draft')
    ) then
      raise check_violation using message='ENJAZ_DOCUMENT_FACTORY_TRANSITION_INVALID';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;$$;
revoke all on function private.document_drafts_final_immutable_v1() from public,anon,authenticated;

commit;
