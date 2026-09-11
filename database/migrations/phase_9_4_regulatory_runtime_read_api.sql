begin;

-- Phase 9.4 / M8 — bounded Runtime read/search API.
-- Browser runtime consumes RPCs only for Knowledge Center retrieval. Official source
-- truth and workspace-derived artifacts remain explicitly separated in every payload.

create or replace function private.search_regulatory_knowledge_v1_impl(
  p_workspace_id uuid,
  p_query text default null,
  p_kind text default null,
  p_scope text default null,
  p_as_of date default null,
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_query text:=btrim(coalesce(p_query,''));
  v_as_of date:=coalesce(p_as_of,current_date);
  v_limit integer:=coalesce(p_limit,30);
  v_items jsonb;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED';
  end if;
  if length(v_query)>160
     or (p_kind is not null and p_kind not in ('law','regulation','instruction','circular','official_notice','procedure'))
     or (p_scope is not null and p_scope not in ('official_global','workspace_curated'))
     or v_limit not between 1 and 50 then
    raise invalid_parameter_value using message='ENJAZ_REGULATORY_SEARCH_INPUT_INVALID';
  end if;

  with candidates as (
    select
      s.id as source_id,s.scope,s.workspace_id,s.kind,s.jurisdiction,s.issuer,s.reference_code,
      v.id as version_id,v.revision,v.title_ar,v.publication_date,v.effective_from,v.effective_to,
      v.source_locator,v.publisher,v.source_url,v.retrieved_on,v.source_hash,v.official_text,
      case when v_query='' then 0::real else
        ts_rank_cd(v.search_document,websearch_to_tsquery('simple'::regconfig,v_query))
      end as search_rank
    from public.regulatory_sources s
    join public.regulatory_source_versions v on v.source_id=s.id
    where (s.scope='official_global' or (s.scope='workspace_curated' and s.workspace_id=p_workspace_id))
      and v.effective_from<=v_as_of
      and (v.effective_to is null or v_as_of<v.effective_to)
      and (p_kind is null or s.kind=p_kind)
      and (p_scope is null or s.scope=p_scope)
      and (
        v_query=''
        or v.search_document @@ websearch_to_tsquery('simple'::regconfig,v_query)
        or v.title_ar ilike '%'||v_query||'%'
        or s.issuer ilike '%'||v_query||'%'
        or s.reference_code ilike '%'||v_query||'%'
      )
  ), bounded as (
    select * from candidates
    order by search_rank desc,effective_from desc,revision desc,source_id
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'schema','enjaz.regulatory-knowledge.search.v1',
    'sourceId',source_id,'scope',scope,'workspaceId',workspace_id,'kind',kind,
    'jurisdiction',jurisdiction,'issuer',issuer,'referenceCode',reference_code,
    'asOf',v_as_of,'versionId',version_id,'revision',revision,'titleAr',title_ar,
    'publicationDate',publication_date,'effectiveFrom',effective_from,'effectiveTo',effective_to,
    'sourceLocator',source_locator,'publisher',publisher,'sourceUrl',source_url,
    'retrievedOn',retrieved_on,'sourceHash',source_hash,'authoritative',true,
    'excerpt',left(regexp_replace(official_text,'[[:space:]]+',' ','g'),360)
  ) order by search_rank desc,effective_from desc,revision desc,source_id),'[]'::jsonb)
  into v_items from bounded;

  return jsonb_build_object(
    'schema','enjaz.regulatory-knowledge.search.v1',
    'workspaceId',p_workspace_id,'asOf',v_as_of,'query',v_query,'items',v_items
  );
end;
$$;

create or replace function public.search_regulatory_knowledge_v1(
  p_workspace_id uuid,
  p_query text default null,
  p_kind text default null,
  p_scope text default null,
  p_as_of date default null,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.search_regulatory_knowledge_v1_impl(
    p_workspace_id,p_query,p_kind,p_scope,p_as_of,p_limit
  );
$$;

create or replace function private.get_regulatory_knowledge_entry_v1_impl(
  p_workspace_id uuid,
  p_source_id uuid,
  p_as_of date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid;
  v_as_of date:=coalesce(p_as_of,current_date);
  v_source public.regulatory_sources%rowtype;
  v_version public.regulatory_source_versions%rowtype;
  v_count integer;
  v_artifacts jsonb;
begin
  v_actor:=private.require_organization_actor_v1(p_workspace_id);
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_REGULATORY_WORKSPACE_ACCESS_DENIED';
  end if;

  select * into v_source
  from public.regulatory_sources s
  where s.id=p_source_id
    and (s.scope='official_global' or (s.scope='workspace_curated' and s.workspace_id=p_workspace_id));
  if not found then
    raise no_data_found using message='ENJAZ_REGULATORY_SOURCE_NOT_FOUND';
  end if;

  select count(*) into v_count
  from public.regulatory_source_versions v
  where v.source_id=p_source_id
    and v.effective_from<=v_as_of
    and (v.effective_to is null or v_as_of<v.effective_to);
  if v_count>1 then
    raise data_exception using message='ENJAZ_REGULATORY_ASOF_AMBIGUOUS';
  end if;
  if v_count=0 then
    return jsonb_build_object(
      'schema','enjaz.regulatory-knowledge.entry.v1','sourceId',p_source_id,
      'workspaceId',p_workspace_id,'asOf',v_as_of,'configured',false,
      'official',null,'derivedArtifacts','[]'::jsonb
    );
  end if;

  select * into v_version
  from public.regulatory_source_versions v
  where v.source_id=p_source_id
    and v.effective_from<=v_as_of
    and (v.effective_to is null or v_as_of<v.effective_to)
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'artifactId',a.id,'kind',a.kind,'sourceId',a.source_id,'sourceVersionId',a.source_version_id,
    'body',a.body,'authoritative',false,'createdAt',a.created_at
  ) order by a.created_at desc,a.id),'[]'::jsonb)
  into v_artifacts
  from public.regulatory_derived_artifacts a
  where a.workspace_id=p_workspace_id
    and a.source_id=p_source_id
    and a.source_version_id=v_version.id;

  return jsonb_build_object(
    'schema','enjaz.regulatory-knowledge.entry.v1','sourceId',v_source.id,
    'workspaceId',p_workspace_id,'asOf',v_as_of,'configured',true,
    'official',jsonb_build_object(
      'scope',v_source.scope,'sourceWorkspaceId',v_source.workspace_id,'kind',v_source.kind,
      'jurisdiction',v_source.jurisdiction,'issuer',v_source.issuer,'referenceCode',v_source.reference_code,
      'versionId',v_version.id,'revision',v_version.revision,'titleAr',v_version.title_ar,
      'publicationDate',v_version.publication_date,'effectiveFrom',v_version.effective_from,
      'effectiveTo',v_version.effective_to,'supersedesVersionId',v_version.supersedes_version_id,
      'sourceLocator',v_version.source_locator,'publisher',v_version.publisher,'sourceUrl',v_version.source_url,
      'retrievedOn',v_version.retrieved_on,'sourceHash',v_version.source_hash,
      'officialText',v_version.official_text,'authoritative',true
    ),
    'derivedArtifacts',v_artifacts
  );
end;
$$;

create or replace function public.get_regulatory_knowledge_entry_v1(
  p_workspace_id uuid,
  p_source_id uuid,
  p_as_of date default null
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_regulatory_knowledge_entry_v1_impl(p_workspace_id,p_source_id,p_as_of);
$$;

revoke execute on function private.search_regulatory_knowledge_v1_impl(uuid,text,text,text,date,integer) from public,anon,authenticated;
revoke execute on function private.get_regulatory_knowledge_entry_v1_impl(uuid,uuid,date) from public,anon,authenticated;
grant execute on function private.search_regulatory_knowledge_v1_impl(uuid,text,text,text,date,integer) to authenticated;
grant execute on function private.get_regulatory_knowledge_entry_v1_impl(uuid,uuid,date) to authenticated;

revoke execute on function public.search_regulatory_knowledge_v1(uuid,text,text,text,date,integer) from public,anon,authenticated;
revoke execute on function public.get_regulatory_knowledge_entry_v1(uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.search_regulatory_knowledge_v1(uuid,text,text,text,date,integer) to authenticated;
grant execute on function public.get_regulatory_knowledge_entry_v1(uuid,uuid,date) to authenticated;

commit;
