-- Phase 9.4 / M8 — Real Cloud destructive certification probe.
-- All fixtures live in a PL/pgSQL subtransaction that is deliberately rolled back.
-- The migration commits only the proof execution itself; no probe data or helper objects survive.

do $outer$
declare
  v_owner uuid;
  v_old jsonb;
  v_new jsonb;
  v_official_old jsonb;
  v_official_new jsonb;
  v_marker constant text := 'ENJAZ_P94_PROBE_ROLLBACK';
begin
  select w.owner_user_id into v_owner
  from public.workspaces w
  join public.workspace_memberships wm
    on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
  order by w.created_at
  limit 1;

  if v_owner is null then
    raise exception 'ENJAZ_P94_PROBE: owner missing';
  end if;

  if exists(select 1 from public.workspaces where id in ('94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.regulatory_sources where id in ('94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000020'))
     or exists(select 1 from public.regulatory_derived_artifacts where id in ('94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000031')) then
    raise exception 'ENJAZ_P94_PROBE: pre-existing residue';
  end if;

  begin
    insert into public.workspaces(id,owner_user_id,name) values
      ('94f00000-0000-4000-8000-000000000001',v_owner,'__P94_A__'),
      ('94f00000-0000-4000-8000-000000000002',v_owner,'__P94_B__');
    insert into public.workspace_memberships(workspace_id,user_id,role) values
      ('94f00000-0000-4000-8000-000000000001',v_owner,'owner'),
      ('94f00000-0000-4000-8000-000000000002',v_owner,'owner');

    -- Public API privilege contract.
    if has_function_privilege('anon','public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text)','EXECUTE')
       or has_function_privilege('authenticated','public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text)','EXECUTE')
       or not has_function_privilege('service_role','public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text)','EXECUTE') then
      raise exception 'ENJAZ_P94_PROBE: official ingestion ACL';
    end if;
    if has_function_privilege('anon','public.get_regulatory_version_as_of_v1(uuid,date)','EXECUTE')
       or not has_function_privilege('authenticated','public.get_regulatory_version_as_of_v1(uuid,date)','EXECUTE') then
      raise exception 'ENJAZ_P94_PROBE: reader ACL';
    end if;
    if has_table_privilege('authenticated','public.regulatory_sources','INSERT')
       or has_table_privilege('authenticated','public.regulatory_source_versions','UPDATE')
       or has_table_privilege('authenticated','public.regulatory_derived_artifacts','DELETE') then
      raise exception 'ENJAZ_P94_PROBE: direct table DML grant';
    end if;

    -- Official-global lineage. Caller privilege is asserted above; postgres executes the behavior here.
    perform public.ingest_official_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000011',0,
      '94f00000-0000-4000-8000-000000000101','law','IQ','Official Publisher','LAW-94',
      'القانون الرسمي - النسخة الأولى',date '2026-01-01',date '2026-01-10','Official Gazette / 94',
      'Official Publisher','https://example.gov.iq/law/94',date '2026-01-11',repeat('a',64),'النص الرسمي الأول');
    perform public.ingest_official_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000011',0,
      '94f00000-0000-4000-8000-000000000101','law','IQ','Official Publisher','LAW-94',
      'القانون الرسمي - النسخة الأولى',date '2026-01-01',date '2026-01-10','Official Gazette / 94',
      'Official Publisher','https://example.gov.iq/law/94',date '2026-01-11',repeat('a',64),'النص الرسمي الأول');
    perform public.ingest_official_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000012',1,
      '94f00000-0000-4000-8000-000000000102','law','IQ','Official Publisher','LAW-94',
      'القانون الرسمي - النسخة الثانية',date '2026-06-01',date '2026-06-15','Official Gazette / 94 rev2',
      'Official Publisher','https://example.gov.iq/law/94-v2',date '2026-06-16',repeat('b',64),'النص الرسمي الثاني');

    if (select count(*) from public.regulatory_source_versions where source_id='94f00000-0000-4000-8000-000000000010')<>2
       or not exists(select 1 from public.regulatory_sources where id='94f00000-0000-4000-8000-000000000010' and scope='official_global' and workspace_id is null)
       or not exists(select 1 from public.regulatory_source_versions where id='94f00000-0000-4000-8000-000000000011' and revision=1 and effective_to=date '2026-06-15' and authoritative)
       or not exists(select 1 from public.regulatory_source_versions where id='94f00000-0000-4000-8000-000000000012' and revision=2 and supersedes_version_id='94f00000-0000-4000-8000-000000000011' and effective_to is null and authoritative) then
      raise exception 'ENJAZ_P94_PROBE: official lineage';
    end if;

    -- Owner-authenticated workspace-curated path.
    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_owner::text)::text,true);
    perform set_config('request.jwt.claim.sub',v_owner::text,true);

    perform public.save_workspace_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000021',0,
      '94f00000-0000-4000-8000-000000000201','instruction','IQ','Workspace Curator','CUR-94',
      'تعليمات داخلية - النسخة الأولى',date '2026-02-01',date '2026-02-10','Workspace source / 94',
      'Workspace Curator','https://example.com/curated/94',date '2026-02-11',repeat('c',64),'المحتوى المنظم الأول');
    perform public.save_workspace_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000021',0,
      '94f00000-0000-4000-8000-000000000201','instruction','IQ','Workspace Curator','CUR-94',
      'تعليمات داخلية - النسخة الأولى',date '2026-02-01',date '2026-02-10','Workspace source / 94',
      'Workspace Curator','https://example.com/curated/94',date '2026-02-11',repeat('c',64),'المحتوى المنظم الأول');

    begin
      perform public.save_workspace_regulatory_version_v1(
        '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',0,
        '94f00000-0000-4000-8000-000000000202','instruction','IQ','Workspace Curator','CUR-94',
        'تعليمات داخلية - stale',date '2026-06-01',date '2026-06-10','Workspace source / stale',
        'Workspace Curator','https://example.com/curated/94-stale',date '2026-06-11',repeat('d',64),'stale');
      raise exception 'ENJAZ_P94_PROBE: stale revision accepted';
    exception when serialization_failure then
      if sqlerrm<>'ENJAZ_REGULATORY_STALE_REVISION' then raise; end if;
    end;

    perform public.save_workspace_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',1,
      '94f00000-0000-4000-8000-000000000203','instruction','IQ','Workspace Curator','CUR-94',
      'تعليمات داخلية - النسخة الثانية',date '2026-06-01',date '2026-06-10','Workspace source / 94 rev2',
      'Workspace Curator','https://example.com/curated/94-v2',date '2026-06-11',repeat('e',64),'المحتوى المنظم الثاني');

    perform public.save_regulatory_derived_artifact_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000301',
      'ai_summary','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',
      'ملخص مشتق غير ملزم ولا يمثل النص الرسمي.');
    perform public.save_regulatory_derived_artifact_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000301',
      'ai_summary','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',
      'ملخص مشتق غير ملزم ولا يمثل النص الرسمي.');

    v_old:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-03-01');
    v_new:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-07-01');
    v_official_old:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000010',date '2026-03-01');
    v_official_new:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000010',date '2026-07-01');
    if v_old#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000021'
       or v_new#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000022'
       or v_official_old#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000011'
       or v_official_new#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000012' then
      raise exception 'ENJAZ_P94_PROBE: as-of resolution';
    end if;

    begin
      perform public.save_regulatory_derived_artifact_v1(
        '94f00000-0000-4000-8000-000000000002','94f00000-0000-4000-8000-000000000031','94f00000-0000-4000-8000-000000000302',
        'editorial_interpretation','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022','cross workspace');
      raise exception 'ENJAZ_P94_PROBE: cross-workspace artifact accepted';
    exception when insufficient_privilege then
      if sqlerrm<>'ENJAZ_REGULATORY_CROSS_WORKSPACE_SOURCE_FORBIDDEN' then raise; end if;
    end;

    if (select count(*) from public.regulatory_source_versions where source_id='94f00000-0000-4000-8000-000000000020')<>2
       or not exists(select 1 from public.regulatory_derived_artifacts where id='94f00000-0000-4000-8000-000000000030' and workspace_id='94f00000-0000-4000-8000-000000000001' and authoritative=false and kind='ai_summary' and source_version_id='94f00000-0000-4000-8000-000000000022')
       or (select count(*) from public.regulatory_derived_artifacts where operation_id='94f00000-0000-4000-8000-000000000301')<>1
       or (select count(*) from public.audit_events where entity_id='94f00000-0000-4000-8000-000000000020')<3 then
      raise exception 'ENJAZ_P94_PROBE: curated/artifact persistence';
    end if;

    -- Outsider can read official-global but cannot read workspace-curated truth.
    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub','94f00000-0000-4000-8000-000000000099')::text,true);
    perform set_config('request.jwt.claim.sub','94f00000-0000-4000-8000-000000000099',true);
    v_official_new:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000010',date '2026-07-01');
    if v_official_new#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000012' then
      raise exception 'ENJAZ_P94_PROBE: official authenticated read';
    end if;
    begin
      perform public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-07-01');
      raise exception 'ENJAZ_P94_PROBE: outsider curated read accepted';
    exception when insufficient_privilege then
      if sqlerrm<>'ENJAZ_REGULATORY_SOURCE_ACCESS_DENIED' then raise; end if;
    end;

    -- Force rollback of every fixture and audit row above.
    raise exception '%',v_marker;
  exception when raise_exception then
    if sqlerrm<>v_marker then raise; end if;
  end;

  -- The inner exception subtransaction must have removed absolutely everything.
  if exists(select 1 from public.workspaces where id in ('94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.workspace_memberships where workspace_id in ('94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.regulatory_sources where id in ('94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000020'))
     or exists(select 1 from public.regulatory_source_versions where id in ('94f00000-0000-4000-8000-000000000011','94f00000-0000-4000-8000-000000000012','94f00000-0000-4000-8000-000000000021','94f00000-0000-4000-8000-000000000022'))
     or exists(select 1 from public.regulatory_derived_artifacts where id in ('94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000031'))
     or exists(select 1 from public.audit_events where entity_id in ('94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000020')) then
    raise exception 'ENJAZ_P94_PROBE: rollback residue';
  end if;
end
$outer$;
