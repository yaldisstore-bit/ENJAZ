-- Phase 9.4 Runtime — authenticated Real Cloud behavioral destruction probe.
-- Fixtures execute inside a deliberately rolled-back PL/pgSQL subtransaction.
do $outer$
declare
  v_owner uuid;
  v_a jsonb;
  v_b jsonb;
  v_entry jsonb;
  v_marker constant text := 'ENJAZ_P94_RUNTIME_PROBE_ROLLBACK';
begin
  select w.owner_user_id into v_owner
  from public.workspaces w
  join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
  order by w.created_at limit 1;
  if v_owner is null then raise exception 'ENJAZ_P94_RUNTIME_PROBE: owner missing'; end if;

  if exists(select 1 from public.workspaces where id in ('94e00000-0000-4000-8000-000000000001','94e00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.regulatory_sources where id in ('94e00000-0000-4000-8000-000000000010','94e00000-0000-4000-8000-000000000020')) then
    raise exception 'ENJAZ_P94_RUNTIME_PROBE: pre-existing residue';
  end if;

  begin
    insert into public.workspaces(id,owner_user_id,name) values
      ('94e00000-0000-4000-8000-000000000001',v_owner,'__P94_RUNTIME_A__'),
      ('94e00000-0000-4000-8000-000000000002',v_owner,'__P94_RUNTIME_B__');
    insert into public.workspace_memberships(workspace_id,user_id,role) values
      ('94e00000-0000-4000-8000-000000000001',v_owner,'owner'),
      ('94e00000-0000-4000-8000-000000000002',v_owner,'owner');

    if has_function_privilege('anon','public.search_regulatory_knowledge_v1(uuid,text,text,text,date,integer)','EXECUTE')
       or has_function_privilege('anon','public.get_regulatory_knowledge_entry_v1(uuid,uuid,date)','EXECUTE')
       or not has_function_privilege('authenticated','public.search_regulatory_knowledge_v1(uuid,text,text,text,date,integer)','EXECUTE')
       or not has_function_privilege('authenticated','public.get_regulatory_knowledge_entry_v1(uuid,uuid,date)','EXECUTE') then
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: runtime ACL drift';
    end if;

    -- Global official truth.
    perform public.ingest_official_regulatory_version_v1(
      '94e00000-0000-4000-8000-000000000010','94e00000-0000-4000-8000-000000000011',0,
      '94e00000-0000-4000-8000-000000000101','law','العراق','الجهة الرسمية','LAW-RUNTIME-94',
      'قانون اختبار مركز المعرفة',date '2026-01-01',date '2026-01-10','الجريدة الرسمية / اختبار 94',
      'الناشر الرسمي','https://example.gov.iq/runtime/94',date '2026-09-11',repeat('a',64),'النص الرسمي لاختبار مركز المعرفة التنظيمية');

    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_owner::text)::text,true);
    perform set_config('request.jwt.claim.sub',v_owner::text,true);

    -- Workspace A curated truth and a non-authoritative AI derivative.
    perform public.save_workspace_regulatory_version_v1(
      '94e00000-0000-4000-8000-000000000001','94e00000-0000-4000-8000-000000000020','94e00000-0000-4000-8000-000000000021',0,
      '94e00000-0000-4000-8000-000000000201','instruction','العراق','فريق مساحة العمل','CUR-RUNTIME-94',
      'تعليمات منسقة لمساحة العمل أ',date '2026-02-01',date '2026-02-10','مصدر مساحة العمل أ',
      'فريق مساحة العمل','https://example.com/runtime/curated-94',date '2026-09-11',repeat('b',64),'المحتوى المنسق الخاص بمساحة العمل أ');
    perform public.save_regulatory_derived_artifact_v1(
      '94e00000-0000-4000-8000-000000000001','94e00000-0000-4000-8000-000000000030','94e00000-0000-4000-8000-000000000301',
      'ai_summary','94e00000-0000-4000-8000-000000000020','94e00000-0000-4000-8000-000000000021',
      'ملخص مساعد غير رسمي ولا يملك أي سلطة تنظيمية.');

    v_a:=public.search_regulatory_knowledge_v1('94e00000-0000-4000-8000-000000000001',null,null,null,date '2026-09-11',50);
    if jsonb_array_length(v_a->'items')<>2
       or not exists(select 1 from jsonb_array_elements(v_a->'items') x where x->>'sourceId'='94e00000-0000-4000-8000-000000000010' and (x->>'authoritative')::boolean)
       or not exists(select 1 from jsonb_array_elements(v_a->'items') x where x->>'sourceId'='94e00000-0000-4000-8000-000000000020' and x->>'workspaceId'='94e00000-0000-4000-8000-000000000001') then
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: workspace A search truth';
    end if;

    v_entry:=public.get_regulatory_knowledge_entry_v1('94e00000-0000-4000-8000-000000000001','94e00000-0000-4000-8000-000000000020',date '2026-09-11');
    if v_entry#>>'{official,versionId}'<>'94e00000-0000-4000-8000-000000000021'
       or (v_entry#>>'{official,authoritative}')::boolean is distinct from true
       or jsonb_array_length(v_entry->'derivedArtifacts')<>1
       or (v_entry#>>'{derivedArtifacts,0,authoritative}')::boolean is distinct from false
       or v_entry#>>'{derivedArtifacts,0,sourceVersionId}'<>'94e00000-0000-4000-8000-000000000021' then
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: official/derived separation';
    end if;

    -- Workspace B sees global official truth but never Workspace A curated truth.
    v_b:=public.search_regulatory_knowledge_v1('94e00000-0000-4000-8000-000000000002',null,null,null,date '2026-09-11',50);
    if jsonb_array_length(v_b->'items')<>1
       or v_b#>>'{items,0,sourceId}'<>'94e00000-0000-4000-8000-000000000010' then
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: cross-workspace search leak';
    end if;
    begin
      perform public.get_regulatory_knowledge_entry_v1('94e00000-0000-4000-8000-000000000002','94e00000-0000-4000-8000-000000000020',date '2026-09-11');
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: cross-workspace detail accepted';
    exception when no_data_found then
      if sqlerrm<>'ENJAZ_REGULATORY_SOURCE_NOT_FOUND' then raise; end if;
    end;

    begin
      perform public.search_regulatory_knowledge_v1('94e00000-0000-4000-8000-000000000001',null,null,null,date '2026-09-11',51);
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: invalid limit accepted';
    exception when invalid_parameter_value then
      if sqlerrm<>'ENJAZ_REGULATORY_SEARCH_INPUT_INVALID' then raise; end if;
    end;

    -- Authenticated outsider without membership must fail before retrieval.
    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub','94e00000-0000-4000-8000-000000000099')::text,true);
    perform set_config('request.jwt.claim.sub','94e00000-0000-4000-8000-000000000099',true);
    begin
      perform public.search_regulatory_knowledge_v1('94e00000-0000-4000-8000-000000000001',null,null,null,date '2026-09-11',10);
      raise exception 'ENJAZ_P94_RUNTIME_PROBE: outsider search accepted';
    exception when insufficient_privilege then
      null;
    end;

    raise exception using errcode='P0001',message=v_marker;
  exception when raise_exception then
    if sqlerrm<>v_marker then raise; end if;
  end;

  if exists(select 1 from public.workspaces where id in ('94e00000-0000-4000-8000-000000000001','94e00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.regulatory_sources where id in ('94e00000-0000-4000-8000-000000000010','94e00000-0000-4000-8000-000000000020'))
     or exists(select 1 from public.regulatory_source_versions where id in ('94e00000-0000-4000-8000-000000000011','94e00000-0000-4000-8000-000000000021'))
     or exists(select 1 from public.regulatory_derived_artifacts where id='94e00000-0000-4000-8000-000000000030') then
    raise exception 'ENJAZ_P94_RUNTIME_PROBE: residue after rollback';
  end if;
end;
$outer$;
