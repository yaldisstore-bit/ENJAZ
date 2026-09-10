-- ENJAZ Phase 9.2 — Permission-scoped global search read model
-- Read-only derived index: no shadow entity store, no source-business writes.
-- Owner-only legacy domains preserve their existing workspace_memberships authority;
-- transaction results reuse M15 scoped transaction authority for workforce actors.

begin;

create or replace function private.global_search_v1_impl(
  p_workspace_id uuid,
  p_query text,
  p_limit_per_domain integer default 8
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_owner boolean;
  v_query text := regexp_replace(btrim(coalesce(p_query,'')), '[[:space:]]+', ' ', 'g');
  v_limit integer := coalesce(p_limit_per_domain,8);
  v_results jsonb := '[]'::jsonb;
begin
  if v_actor is null then
    raise insufficient_privilege using message='ENJAZ_GLOBAL_SEARCH_AUTH_REQUIRED';
  end if;
  if p_workspace_id is null then
    raise invalid_parameter_value using message='ENJAZ_GLOBAL_SEARCH_WORKSPACE_REQUIRED';
  end if;
  if v_limit < 1 or v_limit > 10 then
    raise invalid_parameter_value using message='ENJAZ_GLOBAL_SEARCH_LIMIT_INVALID';
  end if;
  if char_length(v_query) < 2 or char_length(v_query) > 120 then
    return '[]'::jsonb;
  end if;

  -- This verifies the caller belongs to the requested workspace either as owner
  -- or through the isolated M15 workforce authority. It does not widen any legacy RLS.
  perform private.require_organization_actor_v1(p_workspace_id);
  v_owner := private.is_organization_owner_v1(p_workspace_id);

  -- Transactions are special: M15 already owns the permission-scoped read model.
  -- Reuse it rather than reading public.transactions under a broader definer bypass.
  v_results := v_results || coalesce((
    select jsonb_agg(jsonb_build_object(
      'schema','enjaz.global-search-result.v1',
      'domain','transactions',
      'entityId',x.item->>'transactionId',
      'title','#'||left(x.item->>'transactionId',8)||' · '||coalesce(x.item->>'type','معاملة'),
      'subtitle',nullif(concat_ws(' · ',nullif(x.item->>'companyName',''),nullif(x.item->>'status','')),''),
      'destination','/app/transactions/'||(x.item->>'transactionId')
    ) order by x.ord)
    from (
      select item,ord
      from jsonb_array_elements(private.organization_scoped_transactions_v1(p_workspace_id)) with ordinality as r(item,ord)
      where position(lower(v_query) in lower(concat_ws(' ',
        r.item->>'transactionId',
        r.item->>'companyName',
        r.item->>'type',
        r.item->>'status',
        r.item->>'priority'
      ))) > 0
      order by ord
      limit v_limit
    ) x
  ),'[]'::jsonb);

  -- Companies, people, procedures and documents keep the legacy owner-only
  -- workspace authority. Non-owner M15 workforce gets no metadata from them.
  if v_owner then
    v_results := v_results || coalesce((
      select jsonb_agg(jsonb_build_object(
        'schema','enjaz.global-search-result.v1',
        'domain','companies',
        'entityId',c.id::text,
        'title',coalesce(nullif(btrim(c.display_name),''),c.legal_name),
        'subtitle',nullif(concat_ws(' · ',nullif(c.registration_number,''),nullif(c.address,'')),''),
        'destination','/app/companies?entity='||c.id::text
      ) order by c.updated_at desc,c.id)
      from (
        select * from public.companies
        where workspace_id=p_workspace_id and deleted_at is null
          and position(lower(v_query) in lower(concat_ws(' ',id::text,legal_name,display_name,registration_number,address,activities,legal_status))) > 0
        order by updated_at desc,id
        limit v_limit
      ) c
    ),'[]'::jsonb);

    v_results := v_results || coalesce((
      select jsonb_agg(jsonb_build_object(
        'schema','enjaz.global-search-result.v1',
        'domain','people',
        'entityId',p.id::text,
        'title',p.display_name,
        'subtitle',nullif(concat_ws(' · ',nullif(p.contact_type,''),nullif(p.phone,''),nullif(p.email,'')),''),
        'destination','/app/people?entity='||p.id::text
      ) order by p.updated_at desc,p.id)
      from (
        select * from public.contacts
        where workspace_id=p_workspace_id and deleted_at is null and status<>'merged'
          and position(lower(v_query) in lower(concat_ws(' ',id::text,display_name,contact_type,phone,email,notes))) > 0
        order by updated_at desc,id
        limit v_limit
      ) p
    ),'[]'::jsonb);

    v_results := v_results || coalesce((
      select jsonb_agg(jsonb_build_object(
        'schema','enjaz.global-search-result.v1',
        'domain','procedures',
        'entityId',g.id::text,
        'title',g.name,
        'subtitle',nullif(concat_ws(' · ',nullif(g.code,''),nullif(e.name,'')),''),
        'destination','/app/workflow?procedure='||g.id::text
      ) order by g.updated_at desc,g.id)
      from (
        select p.* from public.government_procedures p
        where p.workspace_id=p_workspace_id and p.active=true
          and position(lower(v_query) in lower(concat_ws(' ',p.id::text,p.code,p.name,p.description))) > 0
        order by p.updated_at desc,p.id
        limit v_limit
      ) g
      join public.government_entities e
        on e.workspace_id=g.workspace_id and e.id=g.government_entity_id and e.active=true
    ),'[]'::jsonb);

    v_results := v_results || coalesce((
      select jsonb_agg(jsonb_build_object(
        'schema','enjaz.global-search-result.v1',
        'domain','documents',
        'entityId',d.id::text,
        'title',d.title,
        'subtitle',nullif(concat_ws(' · ',nullif(d.document_type,''),nullif(d.status,'')),''),
        'destination','/app/documents?entity='||d.id::text
      ) order by d.updated_at desc,d.id)
      from (
        select * from public.documents
        where workspace_id=p_workspace_id
          and position(lower(v_query) in lower(concat_ws(' ',id::text,title,document_type,mime_type,status))) > 0
        order by updated_at desc,id
        limit v_limit
      ) d
    ),'[]'::jsonb);
  end if;

  return coalesce(v_results,'[]'::jsonb);
end;
$$;

create or replace function public.global_search_v1(
  p_workspace_id uuid,
  p_query text,
  p_limit_per_domain integer default 8
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.global_search_v1_impl(p_workspace_id,p_query,p_limit_per_domain);
$$;

revoke all on function private.global_search_v1_impl(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.global_search_v1(uuid,text,integer) from public,anon;
grant execute on function public.global_search_v1(uuid,text,integer) to authenticated;

commit;
