begin;

-- Phase 9.4 / M8 — Regulatory / Knowledge Base persistence foundation.
-- Official truth is append-versioned and provenance-bound.
-- Workspace curation remains tenant-scoped. Derived/AI artifacts are never authoritative.
-- Browser roles receive SELECT only; all sensitive writes are RPC-bound.

create table public.regulatory_sources (
  id uuid primary key,
  scope text not null,
  workspace_id uuid references public.workspaces(id) on update cascade on delete restrict,
  kind text not null,
  jurisdiction text not null,
  issuer text not null,
  reference_code text not null,
  created_by uuid references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint regulatory_sources_scope_check check(scope in ('official_global','workspace_curated')),
  constraint regulatory_sources_kind_check check(kind in ('law','regulation','instruction','circular','official_notice','procedure')),
  constraint regulatory_sources_workspace_shape_check check(
    (scope='official_global' and workspace_id is null)
    or (scope='workspace_curated' and workspace_id is not null)
  ),
  constraint regulatory_sources_jurisdiction_check check(length(btrim(jurisdiction)) between 1 and 320),
  constraint regulatory_sources_issuer_check check(length(btrim(issuer)) between 1 and 320),
  constraint regulatory_sources_reference_code_check check(length(btrim(reference_code)) between 1 and 320),
  constraint regulatory_sources_operation_key unique(created_operation_id)
);

create unique index regulatory_sources_official_identity_key
  on public.regulatory_sources(kind,lower(jurisdiction),lower(issuer),lower(reference_code))
  where scope='official_global';

create unique index regulatory_sources_workspace_identity_key
  on public.regulatory_sources(workspace_id,kind,lower(jurisdiction),lower(issuer),lower(reference_code))
  where scope='workspace_curated';

create index regulatory_sources_workspace_scope_idx
  on public.regulatory_sources(workspace_id,scope,kind,created_at desc);

create table public.regulatory_source_versions (
  id uuid primary key,
  source_id uuid not null references public.regulatory_sources(id) on update cascade on delete restrict,
  revision integer not null,
  title_ar text not null,
  publication_date date not null,
  effective_from date not null,
  effective_to date,
  supersedes_version_id uuid references public.regulatory_source_versions(id) on update cascade on delete restrict,
  source_locator text not null,
  publisher text not null,
  source_url text not null,
  retrieved_on date not null,
  source_hash text not null,
  official_text text not null,
  authoritative boolean not null default true,
  created_by uuid references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  ended_by_operation_id uuid,
  created_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple'::regconfig,coalesce(title_ar,'')||' '||coalesce(official_text,''))
  ) stored,
  constraint regulatory_source_versions_source_id_id_key unique(source_id,id),
  constraint regulatory_source_versions_revision_key unique(source_id,revision),
  constraint regulatory_source_versions_hash_key unique(source_id,source_hash),
  constraint regulatory_source_versions_operation_key unique(created_operation_id),
  constraint regulatory_source_versions_revision_check check(revision between 1 and 1000000),
  constraint regulatory_source_versions_title_check check(length(btrim(title_ar)) between 1 and 320),
  constraint regulatory_source_versions_effective_check check(effective_to is null or effective_to>effective_from),
  constraint regulatory_source_versions_locator_check check(length(btrim(source_locator)) between 1 and 2048),
  constraint regulatory_source_versions_publisher_check check(length(btrim(publisher)) between 1 and 320),
  constraint regulatory_source_versions_url_check check(length(source_url)<=2048 and source_url ~ '^https://'),
  constraint regulatory_source_versions_hash_check check(source_hash ~ '^[0-9a-f]{64}$'),
  constraint regulatory_source_versions_text_check check(octet_length(official_text) between 1 and 2000000),
  constraint regulatory_source_versions_authoritative_check check(authoritative is true),
  constraint regulatory_source_versions_end_operation_check check(
    (effective_to is null and ended_by_operation_id is null)
    or (effective_to is not null and ended_by_operation_id is not null)
  )
);

create index regulatory_source_versions_asof_idx
  on public.regulatory_source_versions(source_id,effective_from,effective_to,revision desc);
create index regulatory_source_versions_search_idx
  on public.regulatory_source_versions using gin(search_document);

create table public.regulatory_derived_artifacts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on update cascade on delete restrict,
  kind text not null,
  source_id uuid not null,
  source_version_id uuid not null,
  body text not null,
  authoritative boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  constraint regulatory_derived_artifacts_source_version_fk foreign key(source_id,source_version_id)
    references public.regulatory_source_versions(source_id,id) on update cascade on delete restrict,
  constraint regulatory_derived_artifacts_kind_check check(kind in ('editorial_interpretation','ai_summary')),
  constraint regulatory_derived_artifacts_body_check check(octet_length(body) between 1 and 50000),
  constraint regulatory_derived_artifacts_authoritative_check check(authoritative is false),
  constraint regulatory_derived_artifacts_operation_key unique(workspace_id,operation_id)
);

create index regulatory_derived_artifacts_workspace_source_idx
  on public.regulatory_derived_artifacts(workspace_id,source_id,source_version_id,created_at desc);
create index regulatory_derived_artifacts_created_by_idx
  on public.regulatory_derived_artifacts(created_by);

alter table public.regulatory_sources enable row level security;
alter table public.regulatory_source_versions enable row level security;
alter table public.regulatory_derived_artifacts enable row level security;

create or replace function private.can_read_regulatory_workspace_v1(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_workspace_id is not null
    and (select auth.uid()) is not null
    and (
      private.is_organization_owner_v1(p_workspace_id)
      or private.current_organization_member_id_v1(p_workspace_id) is not null
    );
$$;

create or replace function private.can_read_regulatory_source_v1(p_source_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.regulatory_sources s
    where s.id=p_source_id
      and (
        s.scope='official_global'
        or (s.scope='workspace_curated' and private.can_read_regulatory_workspace_v1(s.workspace_id))
      )
  );
$$;

create policy regulatory_sources_select_authorized
on public.regulatory_sources for select to authenticated
using (
  scope='official_global'
  or (scope='workspace_curated' and private.can_read_regulatory_workspace_v1(workspace_id))
);

create policy regulatory_source_versions_select_authorized
on public.regulatory_source_versions for select to authenticated
using (private.can_read_regulatory_source_v1(source_id));

create policy regulatory_derived_artifacts_select_authorized
on public.regulatory_derived_artifacts for select to authenticated
using (private.can_read_regulatory_workspace_v1(workspace_id));

revoke all on table public.regulatory_sources from anon,authenticated;
revoke all on table public.regulatory_source_versions from anon,authenticated;
revoke all on table public.regulatory_derived_artifacts from anon,authenticated;
grant select on table public.regulatory_sources to authenticated;
grant select on table public.regulatory_source_versions to authenticated;
grant select on table public.regulatory_derived_artifacts to authenticated;

create or replace function private.reject_regulatory_source_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  raise check_violation using message='ENJAZ_REGULATORY_SOURCE_IDENTITY_IMMUTABLE';
end;
$$;

create trigger regulatory_sources_immutable_guard
before update or delete on public.regulatory_sources
for each row execute function private.reject_regulatory_source_mutation_v1();

create or replace function private.guard_regulatory_version_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    raise check_violation using message='ENJAZ_REGULATORY_VERSION_DELETE_FORBIDDEN';
  end if;

  if old.effective_to is null
     and new.effective_to is not null
     and new.effective_to>old.effective_from
     and old.ended_by_operation_id is null
     and new.ended_by_operation_id is not null
     and (to_jsonb(new)-'effective_to'-'ended_by_operation_id')=(to_jsonb(old)-'effective_to'-'ended_by_operation_id') then
    return new;
  end if;

  raise check_violation using message='ENJAZ_REGULATORY_VERSION_IMMUTABLE';
end;
$$;

create trigger regulatory_source_versions_immutable_guard
before update or delete on public.regulatory_source_versions
for each row execute function private.guard_regulatory_version_mutation_v1();

create or replace function private.reject_regulatory_artifact_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  raise check_violation using message='ENJAZ_REGULATORY_ARTIFACT_IMMUTABLE';
end;
$$;

create trigger regulatory_derived_artifacts_immutable_guard
before update or delete on public.regulatory_derived_artifacts
for each row execute function private.reject_regulatory_artifact_mutation_v1();

create or replace function private.reject_regulatory_version_overlap_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if exists(
    select 1
    from public.regulatory_source_versions v
    where v.source_id=new.source_id
      and v.id<>new.id
      and daterange(v.effective_from,v.effective_to,'[)') && daterange(new.effective_from,new.effective_to,'[)')
  ) then
    raise exclusion_violation using message='ENJAZ_REGULATORY_EFFECTIVE_PERIOD_CONFLICT';
  end if;
  return new;
end;
$$;

create trigger regulatory_source_versions_overlap_guard
before insert or update of source_id,effective_from,effective_to
on public.regulatory_source_versions
for each row execute function private.reject_regulatory_version_overlap_v1();

create or replace function private.guard_regulatory_version_lineage_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_previous public.regulatory_source_versions%rowtype;
begin
  select * into v_previous
  from public.regulatory_source_versions v
  where v.source_id=new.source_id
  order by v.revision desc
  limit 1;

  if not found then
    if new.revision<>1 or new.supersedes_version_id is not null then
      raise check_violation using message='ENJAZ_REGULATORY_LINEAGE_MUST_START_AT_ONE';
    end if;
    return new;
  end if;

  if new.revision<>v_previous.revision+1
     or new.supersedes_version_id is distinct from v_previous.id
     or new.effective_from<=v_previous.effective_from
     or v_previous.effective_to is null then
    raise check_violation using message='ENJAZ_REGULATORY_LINEAGE_BROKEN_OR_FORKED';
  end if;

  return new;
end;
$$;

create trigger regulatory_source_versions_lineage_guard
before insert on public.regulatory_source_versions
for each row execute function private.guard_regulatory_version_lineage_v1();

create or replace function private.append_regulatory_version_core_v1(
  p_scope text,
  p_workspace_id uuid,
  p_actor uuid,
  p_source_id uuid,
  p_version_id uuid,
  p_expected_revision integer,
  p_operation_id uuid,
  p_kind text,
  p_jurisdiction text,
  p_issuer text,
  p_reference_code text,
  p_title_ar text,
  p_publication_date date,
  p_effective_from date,
  p_source_locator text,
  p_publisher text,
  p_source_url text,
  p_retrieved_on date,
  p_source_hash text,
  p_official_text text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_source public.regulatory_sources%rowtype;
  v_previous public.regulatory_source_versions%rowtype;
  v_existing public.regulatory_source_versions%rowtype;
  v_new_revision integer;
  v_hash text;
begin
  if p_scope not in ('official_global','workspace_curated')
     or p_source_id is null or p_version_id is null or p_operation_id is null
     or p_expected_revision is null or p_expected_revision<0
     or p_kind not in ('law','regulation','instruction','circular','official_notice','procedure')
     or p_publication_date is null or p_effective_from is null or p_retrieved_on is null then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_INPUT_INVALID';
  end if;

  if (p_scope='official_global' and p_workspace_id is not null)
     or (p_scope='workspace_curated' and p_workspace_id is null) then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_SCOPE_INVALID';
  end if;

  if length(btrim(coalesce(p_jurisdiction,''))) not between 1 and 320
     or length(btrim(coalesce(p_issuer,''))) not between 1 and 320
     or length(btrim(coalesce(p_reference_code,''))) not between 1 and 320
     or length(btrim(coalesce(p_title_ar,''))) not between 1 and 320
     or length(btrim(coalesce(p_source_locator,''))) not between 1 and 2048
     or length(btrim(coalesce(p_publisher,''))) not between 1 and 320
     or length(coalesce(p_source_url,''))>2048
     or coalesce(p_source_url,'') !~ '^https://'
     or octet_length(coalesce(p_official_text,'')) not between 1 and 2000000 then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_TEXT_OR_PROVENANCE_INVALID';
  end if;

  v_hash:=lower(coalesce(p_source_hash,''));
  if v_hash !~ '^[0-9a-f]{64}$' then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_SOURCE_HASH_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext('enjaz-regulatory'),hashtext(p_source_id::text));

  select * into v_existing
  from public.regulatory_source_versions v
  where v.created_operation_id=p_operation_id
  limit 1;

  if found then
    select * into v_source from public.regulatory_sources s where s.id=v_existing.source_id;
    if v_existing.source_id=p_source_id
       and v_existing.id=p_version_id
       and v_source.scope=p_scope
       and v_source.workspace_id is not distinct from p_workspace_id
       and v_source.kind=p_kind
       and v_source.jurisdiction=btrim(p_jurisdiction)
       and v_source.issuer=btrim(p_issuer)
       and v_source.reference_code=btrim(p_reference_code)
       and v_existing.title_ar=btrim(p_title_ar)
       and v_existing.publication_date=p_publication_date
       and v_existing.effective_from=p_effective_from
       and v_existing.source_locator=btrim(p_source_locator)
       and v_existing.publisher=btrim(p_publisher)
       and v_existing.source_url=p_source_url
       and v_existing.retrieved_on=p_retrieved_on
       and v_existing.source_hash=v_hash
       and v_existing.official_text=p_official_text then
      return jsonb_build_object('sourceId',p_source_id,'versionId',p_version_id,'revision',v_existing.revision,'replayed',true);
    end if;
    raise unique_violation using message='ENJAZ_REGULATORY_OPERATION_REUSED';
  end if;

  select * into v_source
  from public.regulatory_sources s
  where s.id=p_source_id;

  if not found then
    if p_expected_revision<>0 then
      raise serialization_failure using message='ENJAZ_REGULATORY_STALE_REVISION';
    end if;

    insert into public.regulatory_sources(
      id,scope,workspace_id,kind,jurisdiction,issuer,reference_code,created_by,created_operation_id
    ) values(
      p_source_id,p_scope,p_workspace_id,p_kind,btrim(p_jurisdiction),btrim(p_issuer),btrim(p_reference_code),p_actor,p_operation_id
    );

    v_new_revision:=1;
    v_previous:=null;
  else
    if v_source.scope<>p_scope
       or v_source.workspace_id is distinct from p_workspace_id
       or v_source.kind<>p_kind
       or v_source.jurisdiction<>btrim(p_jurisdiction)
       or v_source.issuer<>btrim(p_issuer)
       or v_source.reference_code<>btrim(p_reference_code) then
      raise check_violation using message='ENJAZ_REGULATORY_SOURCE_IDENTITY_DRIFT';
    end if;

    select * into v_previous
    from public.regulatory_source_versions v
    where v.source_id=p_source_id
    order by v.revision desc
    limit 1
    for update;

    if not found then
      if p_expected_revision<>0 then
        raise serialization_failure using message='ENJAZ_REGULATORY_STALE_REVISION';
      end if;
      v_new_revision:=1;
    else
      if p_expected_revision<>v_previous.revision then
        raise serialization_failure using message='ENJAZ_REGULATORY_STALE_REVISION';
      end if;
      if v_previous.effective_to is not null or p_effective_from<=v_previous.effective_from then
        raise invalid_parameter_value using message='ENJAZ_REGULATORY_EFFECTIVE_ORDER_INVALID';
      end if;
      update public.regulatory_source_versions
      set effective_to=p_effective_from,
          ended_by_operation_id=p_operation_id
      where id=v_previous.id;
      v_new_revision:=v_previous.revision+1;
    end if;
  end if;

  insert into public.regulatory_source_versions(
    id,source_id,revision,title_ar,publication_date,effective_from,supersedes_version_id,
    source_locator,publisher,source_url,retrieved_on,source_hash,official_text,authoritative,
    created_by,created_operation_id
  ) values(
    p_version_id,p_source_id,v_new_revision,btrim(p_title_ar),p_publication_date,p_effective_from,
    case when v_new_revision=1 then null else v_previous.id end,
    btrim(p_source_locator),btrim(p_publisher),p_source_url,p_retrieved_on,v_hash,p_official_text,true,
    p_actor,p_operation_id
  );

  if p_workspace_id is not null then
    insert into public.audit_events(
      workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
    ) values(
      p_workspace_id,p_actor,'regulatory.version.append','regulatory_source',p_source_id,
      'Regulatory source version appended',
      jsonb_build_object('sourceId',p_source_id,'versionId',p_version_id,'revision',v_new_revision,'operationId',p_operation_id)
    );
  end if;

  return jsonb_build_object('sourceId',p_source_id,'versionId',p_version_id,'revision',v_new_revision,'replayed',false);
end;
$$;

create or replace function private.ingest_official_regulatory_version_v1_impl(
  p_source_id uuid,p_version_id uuid,p_expected_revision integer,p_operation_id uuid,
  p_kind text,p_jurisdiction text,p_issuer text,p_reference_code text,p_title_ar text,
  p_publication_date date,p_effective_from date,p_source_locator text,p_publisher text,
  p_source_url text,p_retrieved_on date,p_source_hash text,p_official_text text
)
returns jsonb
language sql
security definer
set search_path=''
as $$
  select private.append_regulatory_version_core_v1(
    'official_global',null,null,p_source_id,p_version_id,p_expected_revision,p_operation_id,
    p_kind,p_jurisdiction,p_issuer,p_reference_code,p_title_ar,p_publication_date,p_effective_from,
    p_source_locator,p_publisher,p_source_url,p_retrieved_on,p_source_hash,p_official_text
  );
$$;

create or replace function private.save_workspace_regulatory_version_v1_impl(
  p_workspace_id uuid,p_source_id uuid,p_version_id uuid,p_expected_revision integer,p_operation_id uuid,
  p_kind text,p_jurisdiction text,p_issuer text,p_reference_code text,p_title_ar text,
  p_publication_date date,p_effective_from date,p_source_locator text,p_publisher text,
  p_source_url text,p_retrieved_on date,p_source_hash text,p_official_text text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid;
begin
  v_actor:=private.require_organization_owner_v1(p_workspace_id);
  return private.append_regulatory_version_core_v1(
    'workspace_curated',p_workspace_id,v_actor,p_source_id,p_version_id,p_expected_revision,p_operation_id,
    p_kind,p_jurisdiction,p_issuer,p_reference_code,p_title_ar,p_publication_date,p_effective_from,
    p_source_locator,p_publisher,p_source_url,p_retrieved_on,p_source_hash,p_official_text
  );
end;
$$;

create or replace function public.ingest_official_regulatory_version_v1(
  p_source_id uuid,p_version_id uuid,p_expected_revision integer,p_operation_id uuid,
  p_kind text,p_jurisdiction text,p_issuer text,p_reference_code text,p_title_ar text,
  p_publication_date date,p_effective_from date,p_source_locator text,p_publisher text,
  p_source_url text,p_retrieved_on date,p_source_hash text,p_official_text text
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.ingest_official_regulatory_version_v1_impl(
    p_source_id,p_version_id,p_expected_revision,p_operation_id,p_kind,p_jurisdiction,p_issuer,
    p_reference_code,p_title_ar,p_publication_date,p_effective_from,p_source_locator,p_publisher,
    p_source_url,p_retrieved_on,p_source_hash,p_official_text
  );
$$;

create or replace function public.save_workspace_regulatory_version_v1(
  p_workspace_id uuid,p_source_id uuid,p_version_id uuid,p_expected_revision integer,p_operation_id uuid,
  p_kind text,p_jurisdiction text,p_issuer text,p_reference_code text,p_title_ar text,
  p_publication_date date,p_effective_from date,p_source_locator text,p_publisher text,
  p_source_url text,p_retrieved_on date,p_source_hash text,p_official_text text
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.save_workspace_regulatory_version_v1_impl(
    p_workspace_id,p_source_id,p_version_id,p_expected_revision,p_operation_id,p_kind,p_jurisdiction,
    p_issuer,p_reference_code,p_title_ar,p_publication_date,p_effective_from,p_source_locator,p_publisher,
    p_source_url,p_retrieved_on,p_source_hash,p_official_text
  );
$$;

create or replace function private.save_regulatory_derived_artifact_v1_impl(
  p_workspace_id uuid,p_artifact_id uuid,p_operation_id uuid,p_kind text,
  p_source_id uuid,p_source_version_id uuid,p_body text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_existing public.regulatory_derived_artifacts%rowtype;
  v_source public.regulatory_sources%rowtype;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  if p_artifact_id is null or p_operation_id is null or p_source_id is null or p_source_version_id is null
     or p_kind not in ('editorial_interpretation','ai_summary')
     or octet_length(coalesce(p_body,'')) not between 1 and 50000 then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_ARTIFACT_INPUT_INVALID';
  end if;

  select * into v_existing
  from public.regulatory_derived_artifacts a
  where a.workspace_id=p_workspace_id and a.operation_id=p_operation_id;
  if found then
    if v_existing.id=p_artifact_id and v_existing.kind=p_kind and v_existing.source_id=p_source_id
       and v_existing.source_version_id=p_source_version_id and v_existing.body=p_body then
      return jsonb_build_object('artifactId',p_artifact_id,'replayed',true);
    end if;
    raise unique_violation using message='ENJAZ_REGULATORY_ARTIFACT_OPERATION_REUSED';
  end if;

  select s.* into v_source
  from public.regulatory_sources s
  join public.regulatory_source_versions v on v.source_id=s.id and v.id=p_source_version_id
  where s.id=p_source_id;
  if not found then
    raise no_data_found using message='ENJAZ_REGULATORY_SOURCE_VERSION_NOT_FOUND';
  end if;
  if v_source.scope='workspace_curated' and v_source.workspace_id<>p_workspace_id then
    raise insufficient_privilege using message='ENJAZ_REGULATORY_CROSS_WORKSPACE_SOURCE_FORBIDDEN';
  end if;

  insert into public.regulatory_derived_artifacts(
    id,workspace_id,kind,source_id,source_version_id,body,authoritative,created_by,operation_id
  ) values(
    p_artifact_id,p_workspace_id,p_kind,p_source_id,p_source_version_id,p_body,false,v_actor,p_operation_id
  );

  insert into public.audit_events(
    workspace_id,actor_user_id,action,entity_type,entity_id,summary,details
  ) values(
    p_workspace_id,v_actor,'regulatory.derived_artifact.created','regulatory_source',p_source_id,
    'Derived regulatory knowledge artifact created',
    jsonb_build_object('artifactId',p_artifact_id,'kind',p_kind,'sourceVersionId',p_source_version_id,'operationId',p_operation_id)
  );

  return jsonb_build_object('artifactId',p_artifact_id,'replayed',false);
end;
$$;

create or replace function public.save_regulatory_derived_artifact_v1(
  p_workspace_id uuid,p_artifact_id uuid,p_operation_id uuid,p_kind text,
  p_source_id uuid,p_source_version_id uuid,p_body text
)
returns jsonb
language sql
security invoker
set search_path=''
as $$
  select private.save_regulatory_derived_artifact_v1_impl(
    p_workspace_id,p_artifact_id,p_operation_id,p_kind,p_source_id,p_source_version_id,p_body
  );
$$;

create or replace function private.get_regulatory_version_as_of_v1_impl(p_source_id uuid,p_as_of date)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_source public.regulatory_sources%rowtype;
  v_version public.regulatory_source_versions%rowtype;
  v_count integer;
  v_as_of date:=coalesce(p_as_of,current_date);
begin
  if not private.can_read_regulatory_source_v1(p_source_id) then
    raise insufficient_privilege using message='ENJAZ_REGULATORY_SOURCE_ACCESS_DENIED';
  end if;

  select * into v_source from public.regulatory_sources s where s.id=p_source_id;
  select count(*) into v_count
  from public.regulatory_source_versions v
  where v.source_id=p_source_id and v.effective_from<=v_as_of and (v.effective_to is null or v_as_of<v.effective_to);
  if v_count>1 then
    raise data_exception using message='ENJAZ_REGULATORY_ASOF_AMBIGUOUS';
  end if;
  if v_count=0 then
    return jsonb_build_object('schema','enjaz.regulatory-knowledge.v1','sourceId',p_source_id,'asOf',v_as_of,'configured',false,'version',null);
  end if;

  select * into v_version
  from public.regulatory_source_versions v
  where v.source_id=p_source_id and v.effective_from<=v_as_of and (v.effective_to is null or v_as_of<v.effective_to)
  limit 1;

  return jsonb_build_object(
    'schema','enjaz.regulatory-knowledge.v1',
    'sourceId',v_source.id,'scope',v_source.scope,'workspaceId',v_source.workspace_id,
    'kind',v_source.kind,'jurisdiction',v_source.jurisdiction,'issuer',v_source.issuer,
    'referenceCode',v_source.reference_code,'asOf',v_as_of,'configured',true,
    'version',jsonb_build_object(
      'versionId',v_version.id,'revision',v_version.revision,'titleAr',v_version.title_ar,
      'publicationDate',v_version.publication_date,'effectiveFrom',v_version.effective_from,
      'effectiveTo',v_version.effective_to,'supersedesVersionId',v_version.supersedes_version_id,
      'sourceLocator',v_version.source_locator,'publisher',v_version.publisher,'sourceUrl',v_version.source_url,
      'retrievedOn',v_version.retrieved_on,'sourceHash',v_version.source_hash,'officialText',v_version.official_text,
      'authoritative',true
    )
  );
end;
$$;

create or replace function public.get_regulatory_version_as_of_v1(p_source_id uuid,p_as_of date default null)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_regulatory_version_as_of_v1_impl(p_source_id,p_as_of);
$$;

-- Private helper execution is explicit and minimal.
revoke execute on function private.can_read_regulatory_workspace_v1(uuid) from public,anon,authenticated;
revoke execute on function private.can_read_regulatory_source_v1(uuid) from public,anon,authenticated;
revoke execute on function private.append_regulatory_version_core_v1(text,uuid,uuid,uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) from public,anon,authenticated,service_role;
revoke execute on function private.ingest_official_regulatory_version_v1_impl(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) from public,anon,authenticated,service_role;
revoke execute on function private.save_workspace_regulatory_version_v1_impl(uuid,uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) from public,anon,authenticated,service_role;
revoke execute on function private.save_regulatory_derived_artifact_v1_impl(uuid,uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function private.get_regulatory_version_as_of_v1_impl(uuid,date) from public,anon,authenticated;
revoke execute on function private.reject_regulatory_source_mutation_v1() from public,anon,authenticated;
revoke execute on function private.guard_regulatory_version_mutation_v1() from public,anon,authenticated;
revoke execute on function private.reject_regulatory_artifact_mutation_v1() from public,anon,authenticated;
revoke execute on function private.reject_regulatory_version_overlap_v1() from public,anon,authenticated;
revoke execute on function private.guard_regulatory_version_lineage_v1() from public,anon,authenticated;

grant execute on function private.can_read_regulatory_workspace_v1(uuid) to authenticated;
grant execute on function private.can_read_regulatory_source_v1(uuid) to authenticated;
grant execute on function private.ingest_official_regulatory_version_v1_impl(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) to service_role;
grant execute on function private.save_workspace_regulatory_version_v1_impl(uuid,uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) to authenticated;
grant execute on function private.save_regulatory_derived_artifact_v1_impl(uuid,uuid,uuid,text,uuid,uuid,text) to authenticated;
grant execute on function private.get_regulatory_version_as_of_v1_impl(uuid,date) to authenticated;

revoke execute on function public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) from public,anon,authenticated,service_role;
revoke execute on function public.save_workspace_regulatory_version_v1(uuid,uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) from public,anon,authenticated,service_role;
revoke execute on function public.save_regulatory_derived_artifact_v1(uuid,uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.get_regulatory_version_as_of_v1(uuid,date) from public,anon,authenticated;

grant execute on function public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) to service_role;
grant execute on function public.save_workspace_regulatory_version_v1(uuid,uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text) to authenticated;
grant execute on function public.save_regulatory_derived_artifact_v1(uuid,uuid,uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.get_regulatory_version_as_of_v1(uuid,date) to authenticated;

commit;
