-- ENJAZ Phase 9.4 / M8 — rollback-only Real Cloud destruction probe
-- Exercises the real persisted authority boundary and ends with ROLLBACK so no fixture can survive.
begin;

select set_config('p94.owner',(select w.owner_user_id::text from public.workspaces w join public.workspace_memberships wm on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner' order by w.created_at limit 1),true);
do $$ begin if nullif(current_setting('p94.owner',true),'') is null then raise exception 'ENJAZ_P94_PROBE: owner missing'; end if; end $$;

-- Fixed probe identities are pre-checked and exist only inside this transaction.
do $$ begin
  if exists(select 1 from public.workspaces where id in ('94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.regulatory_sources where id in ('94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000020'))
     or exists(select 1 from public.regulatory_derived_artifacts where id='94f00000-0000-4000-8000-000000000030') then
    raise exception 'ENJAZ_P94_PROBE: pre-existing residue';
  end if;
end $$;

insert into public.workspaces(id,owner_user_id,name) values
('94f00000-0000-4000-8000-000000000001',current_setting('p94.owner')::uuid,'__P94_A__'),
('94f00000-0000-4000-8000-000000000002',current_setting('p94.owner')::uuid,'__P94_B__');
insert into public.workspace_memberships(workspace_id,user_id,role) values
('94f00000-0000-4000-8000-000000000001',current_setting('p94.owner')::uuid,'owner'),
('94f00000-0000-4000-8000-000000000002',current_setting('p94.owner')::uuid,'owner');

-- Official-global truth: only service_role may ingest it.
set local role service_role;
select public.ingest_official_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000011',0,
  '94f00000-0000-4000-8000-000000000101','law','IQ','Official Publisher','LAW-94','القانون الرسمي - النسخة الأولى',
  date '2026-01-01',date '2026-01-10','Official Gazette / 94','Official Publisher','https://example.gov.iq/law/94',date '2026-01-11',
  repeat('a',64),'النص الرسمي الأول'
);
select public.ingest_official_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000011',0,
  '94f00000-0000-4000-8000-000000000101','law','IQ','Official Publisher','LAW-94','القانون الرسمي - النسخة الأولى',
  date '2026-01-01',date '2026-01-10','Official Gazette / 94','Official Publisher','https://example.gov.iq/law/94',date '2026-01-11',
  repeat('a',64),'النص الرسمي الأول'
);
select public.ingest_official_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000010','94f00000-0000-4000-8000-000000000012',1,
  '94f00000-0000-4000-8000-000000000102','law','IQ','Official Publisher','LAW-94','القانون الرسمي - النسخة الثانية',
  date '2026-06-01',date '2026-06-15','Official Gazette / 94 rev2','Official Publisher','https://example.gov.iq/law/94-v2',date '2026-06-16',
  repeat('b',64),'النص الرسمي الثاني'
);
reset role;

do $$ begin
  if (select count(*) from public.regulatory_source_versions where source_id='94f00000-0000-4000-8000-000000000010')<>2 then raise exception 'ENJAZ_P94_PROBE: official version count'; end if;
  if not exists(select 1 from public.regulatory_sources where id='94f00000-0000-4000-8000-000000000010' and scope='official_global' and workspace_id is null) then raise exception 'ENJAZ_P94_PROBE: official scope'; end if;
  if not exists(select 1 from public.regulatory_source_versions where id='94f00000-0000-4000-8000-000000000011' and revision=1 and effective_to=date '2026-06-15' and authoritative) then raise exception 'ENJAZ_P94_PROBE: official historical close'; end if;
  if not exists(select 1 from public.regulatory_source_versions where id='94f00000-0000-4000-8000-000000000012' and revision=2 and supersedes_version_id='94f00000-0000-4000-8000-000000000011' and effective_to is null and authoritative) then raise exception 'ENJAZ_P94_PROBE: official lineage'; end if;
  if has_function_privilege('authenticated','public.ingest_official_regulatory_version_v1(uuid,uuid,integer,uuid,text,text,text,text,text,date,date,text,text,text,date,text,text)','EXECUTE') then raise exception 'ENJAZ_P94_PROBE: authenticated official ingestion grant'; end if;
  if has_function_privilege('anon','public.get_regulatory_version_as_of_v1(uuid,date)','EXECUTE') then raise exception 'ENJAZ_P94_PROBE: anon reader grant'; end if;
end $$;

-- Workspace-curated truth: owner-only mutation, optimistic revisions and replay safety.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p94.owner'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p94.owner'),true);
set local role authenticated;
select public.save_workspace_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000021',0,
  '94f00000-0000-4000-8000-000000000201','instruction','IQ','Workspace Curator','CUR-94','تعليمات داخلية - النسخة الأولى',
  date '2026-02-01',date '2026-02-10','Workspace source / 94','Workspace Curator','https://example.com/curated/94',date '2026-02-11',
  repeat('c',64),'المحتوى المنظم الأول'
);
select public.save_workspace_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000021',0,
  '94f00000-0000-4000-8000-000000000201','instruction','IQ','Workspace Curator','CUR-94','تعليمات داخلية - النسخة الأولى',
  date '2026-02-01',date '2026-02-10','Workspace source / 94','Workspace Curator','https://example.com/curated/94',date '2026-02-11',
  repeat('c',64),'المحتوى المنظم الأول'
);

do $$ begin
  begin
    perform public.save_workspace_regulatory_version_v1(
      '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',0,
      '94f00000-0000-4000-8000-000000000202','instruction','IQ','Workspace Curator','CUR-94','تعليمات داخلية - stale',
      date '2026-06-01',date '2026-06-10','Workspace source / stale','Workspace Curator','https://example.com/curated/94-stale',date '2026-06-11',repeat('d',64),'stale');
    raise exception 'ENJAZ_P94_PROBE: stale revision accepted';
  exception when serialization_failure then
    if sqlerrm<>'ENJAZ_REGULATORY_STALE_REVISION' then raise; end if;
  end;
end $$;

select public.save_workspace_regulatory_version_v1(
  '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022',1,
  '94f00000-0000-4000-8000-000000000203','instruction','IQ','Workspace Curator','CUR-94','تعليمات داخلية - النسخة الثانية',
  date '2026-06-01',date '2026-06-10','Workspace source / 94 rev2','Workspace Curator','https://example.com/curated/94-v2',date '2026-06-11',
  repeat('e',64),'المحتوى المنظم الثاني'
);

-- Derived knowledge is explicitly non-authoritative and source-version bound.
select public.save_regulatory_derived_artifact_v1(
  '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000301',
  'ai_summary','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022','ملخص مشتق غير ملزم ولا يمثل النص الرسمي.'
);
select public.save_regulatory_derived_artifact_v1(
  '94f00000-0000-4000-8000-000000000001','94f00000-0000-4000-8000-000000000030','94f00000-0000-4000-8000-000000000301',
  'ai_summary','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022','ملخص مشتق غير ملزم ولا يمثل النص الرسمي.'
);

do $$ declare old_ctx jsonb; new_ctx jsonb; official_old jsonb; official_new jsonb; begin
  old_ctx:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-03-01');
  new_ctx:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-07-01');
  official_old:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000010',date '2026-03-01');
  official_new:=public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000010',date '2026-07-01');
  if old_ctx#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000021' or new_ctx#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000022' then raise exception 'ENJAZ_P94_PROBE: curated as-of'; end if;
  if official_old#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000011' or official_new#>>'{version,versionId}'<>'94f00000-0000-4000-8000-000000000012' then raise exception 'ENJAZ_P94_PROBE: official as-of'; end if;
end $$;

do $$ begin
  begin
    perform public.save_regulatory_derived_artifact_v1(
      '94f00000-0000-4000-8000-000000000002','94f00000-0000-4000-8000-000000000031','94f00000-0000-4000-8000-000000000302',
      'editorial_interpretation','94f00000-0000-4000-8000-000000000020','94f00000-0000-4000-8000-000000000022','cross workspace');
    raise exception 'ENJAZ_P94_PROBE: cross-workspace artifact accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_REGULATORY_CROSS_WORKSPACE_SOURCE_FORBIDDEN' then raise; end if;
  end;
end $$;

do $$ begin
  begin
    insert into public.regulatory_sources(id,scope,workspace_id,kind,jurisdiction,issuer,reference_code,created_by,created_operation_id)
    values(gen_random_uuid(),'workspace_curated','94f00000-0000-4000-8000-000000000001','law','IQ','x','x',auth.uid(),gen_random_uuid());
    raise exception 'ENJAZ_P94_PROBE: direct DML accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Persisted shape checks while still inside the probe transaction.
do $$ begin
  if (select count(*) from public.regulatory_source_versions where source_id='94f00000-0000-4000-8000-000000000020')<>2 then raise exception 'ENJAZ_P94_PROBE: curated version count'; end if;
  if not exists(select 1 from public.regulatory_sources where id='94f00000-0000-4000-8000-000000000020' and scope='workspace_curated' and workspace_id='94f00000-0000-4000-8000-000000000001') then raise exception 'ENJAZ_P94_PROBE: curated scope'; end if;
  if not exists(select 1 from public.regulatory_derived_artifacts where id='94f00000-0000-4000-8000-000000000030' and workspace_id='94f00000-0000-4000-8000-000000000001' and authoritative=false and kind='ai_summary' and source_version_id='94f00000-0000-4000-8000-000000000022') then raise exception 'ENJAZ_P94_PROBE: derived authority separation'; end if;
  if (select count(*) from public.regulatory_derived_artifacts where operation_id='94f00000-0000-4000-8000-000000000301')<>1 then raise exception 'ENJAZ_P94_PROBE: derived replay duplicated'; end if;
  if (select count(*) from public.audit_events where entity_id='94f00000-0000-4000-8000-000000000020')<3 then raise exception 'ENJAZ_P94_PROBE: audit trail missing'; end if;
end $$;

-- Outsider cannot read workspace-curated truth.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub','94f00000-0000-4000-8000-000000000099')::text,true);
select set_config('request.jwt.claim.sub','94f00000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $$ begin
  begin
    perform public.get_regulatory_version_as_of_v1('94f00000-0000-4000-8000-000000000020',date '2026-07-01');
    raise exception 'ENJAZ_P94_PROBE: outsider read accepted';
  exception when insufficient_privilege then
    if sqlerrm<>'ENJAZ_REGULATORY_SOURCE_ACCESS_DENIED' then raise; end if;
  end;
end $$;
reset role;

-- The transaction rollback is the zero-residue mechanism; immutable history needs no bypass.
rollback;
