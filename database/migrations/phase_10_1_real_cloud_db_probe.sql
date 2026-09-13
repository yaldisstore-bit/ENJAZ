-- ENJAZ Phase 10.1 — real production DB destructive certification probe.
-- All fixture writes are inside a PL/pgSQL subtransaction deliberately rolled back.

do $outer$
declare
  v_owner uuid;
  v_outsider uuid := gen_random_uuid();
  v_ws_a uuid := gen_random_uuid();
  v_ws_b uuid := gen_random_uuid();
  v_op1 uuid := gen_random_uuid();
  v_op2 uuid := gen_random_uuid();
  v_op3 uuid := gen_random_uuid();
  v_claim1 jsonb;
  v_claim1_dup jsonb;
  v_claim2 jsonb;
  v_claim3 jsonb;
  v_ack1 jsonb;
  v_ack1_dup jsonb;
  v_ack2 jsonb;
  v_detail jsonb;
  v_list jsonb;
  v_download1 jsonb;
  v_download2 jsonb;
  v_doc uuid;
  v_path1 text;
  v_path2 text;
  v_marker constant text := 'ENJAZ_P101_PROBE_ROLLBACK';
begin
  select w.owner_user_id into v_owner
  from public.workspaces w
  join public.workspace_memberships wm
    on wm.workspace_id=w.id and wm.user_id=w.owner_user_id and wm.role='owner'
  where w.owner_user_id is not null
  order by w.created_at
  limit 1;

  if v_owner is null then
    raise exception 'ENJAZ_P101_PROBE: owner missing';
  end if;

  -- ACL contract: browser cannot mutate truth tables or call service-only acknowledgement.
  if has_table_privilege('authenticated','public.documents','INSERT')
     or has_table_privilege('authenticated','public.documents','UPDATE')
     or has_table_privilege('authenticated','public.documents','DELETE')
     or has_table_privilege('authenticated','public.document_versions','INSERT')
     or has_table_privilege('authenticated','public.document_versions','UPDATE')
     or has_table_privilege('authenticated','public.document_versions','DELETE') then
    raise exception 'ENJAZ_P101_PROBE: direct document mutation grant';
  end if;
  if not has_function_privilege('authenticated','public.prepare_document_upload_v1(uuid,uuid,text,text,text,bigint,uuid,text,uuid,uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.prepare_document_upload_v1(uuid,uuid,text,text,text,bigint,uuid,text,uuid,uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.acknowledge_document_upload_v1(uuid,text,bigint,text)','EXECUTE')
     or not has_function_privilege('service_role','public.acknowledge_document_upload_v1(uuid,text,bigint,text)','EXECUTE') then
    raise exception 'ENJAZ_P101_PROBE: RPC ACL';
  end if;

  begin
    insert into public.workspaces(id,owner_user_id,name) values
      (v_ws_a,v_owner,'__P101_A__'),
      (v_ws_b,v_owner,'__P101_B__');
    insert into public.workspace_memberships(workspace_id,user_id,role) values
      (v_ws_a,v_owner,'owner'),
      (v_ws_b,v_owner,'owner');

    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_owner::text)::text,true);
    perform set_config('request.jwt.claim.sub',v_owner::text,true);

    -- Input boundaries reject invalid MIME and oversize payload before authority mutation.
    begin
      perform public.prepare_document_upload_v1(v_ws_a,gen_random_uuid(),'bad mime','bad.exe','application/x-msdownload',100,null,null,null,null,null);
      raise exception 'ENJAZ_P101_PROBE: invalid MIME accepted';
    exception when invalid_parameter_value then
      if sqlerrm<>'ENJAZ_VAULT_MIME_INVALID' then raise; end if;
    end;
    begin
      perform public.prepare_document_upload_v1(v_ws_a,gen_random_uuid(),'too large','large.pdf','application/pdf',52428801,null,null,null,null,null);
      raise exception 'ENJAZ_P101_PROBE: oversize accepted';
    exception when invalid_parameter_value then
      if sqlerrm<>'ENJAZ_VAULT_SIZE_INVALID' then raise; end if;
    end;

    -- New document prepare and replay-safe duplicate.
    v_claim1:=public.prepare_document_upload_v1(v_ws_a,v_op1,'وثيقة اختبار 10.1','probe-v1.pdf','application/pdf',1234,null,'certificate',null,null,null);
    v_claim1_dup:=public.prepare_document_upload_v1(v_ws_a,v_op1,'وثيقة اختبار 10.1','probe-v1.pdf','application/pdf',1234,null,'certificate',null,null,null);
    v_doc:=(v_claim1->>'documentId')::uuid;
    v_path1:=v_claim1->>'path';
    if (v_claim1->>'versionNumber')::int<>1
       or (v_claim1->>'binaryAuthoritative')::boolean<>false
       or coalesce((v_claim1_dup->>'wasDuplicate')::boolean,false)<>true
       or v_path1 like '%probe-v1.pdf%'
       or v_path1 not like v_ws_a::text||'/'||v_doc::text||'/v1/%' then
      raise exception 'ENJAZ_P101_PROBE: prepare/idempotency/path contract';
    end if;
    if not exists(select 1 from public.documents where workspace_id=v_ws_a and id=v_doc and status='processing')
       or exists(select 1 from public.document_versions where workspace_id=v_ws_a and document_id=v_doc) then
      raise exception 'ENJAZ_P101_PROBE: pre-ack authority leak';
    end if;

    -- Wrong workspace member is rejected even with an authenticated-shaped claim.
    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_outsider::text)::text,true);
    perform set_config('request.jwt.claim.sub',v_outsider::text,true);
    begin
      perform public.prepare_document_upload_v1(v_ws_a,gen_random_uuid(),'forbidden','x.pdf','application/pdf',10,null,null,null,null,null);
      raise exception 'ENJAZ_P101_PROBE: outsider prepare accepted';
    exception when insufficient_privilege then
      if sqlerrm<>'ENJAZ_VAULT_WORKSPACE_FORBIDDEN' then raise; end if;
    end;

    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_owner::text)::text,true);
    perform set_config('request.jwt.claim.sub',v_owner::text,true);

    -- Service-side acknowledgement promotes exactly one authoritative version.
    v_ack1:=public.acknowledge_document_upload_v1(v_op1,v_path1,1234,'application/pdf');
    v_ack1_dup:=public.acknowledge_document_upload_v1(v_op1,v_path1,1234,'application/pdf');
    if coalesce((v_ack1->>'wasDuplicate')::boolean,true)<>false
       or coalesce((v_ack1_dup->>'wasDuplicate')::boolean,false)<>true
       or (select count(*) from public.document_versions where workspace_id=v_ws_a and document_id=v_doc)<>1
       or not exists(select 1 from public.documents where workspace_id=v_ws_a and id=v_doc and status='ready' and storage_path=v_path1) then
      raise exception 'ENJAZ_P101_PROBE: acknowledgement authority';
    end if;

    -- Failed later upload never becomes a version and does not damage the ready current document.
    v_claim3:=public.prepare_document_upload_v1(v_ws_a,v_op3,'وثيقة اختبار 10.1','probe-failed.pdf','application/pdf',1777,v_doc,'certificate',null,null,null);
    perform public.fail_document_upload_v1(v_op3,'PROBE_FAILURE');
    if exists(select 1 from public.document_versions where workspace_id=v_ws_a and document_id=v_doc and version_number=2)
       or not exists(select 1 from public.document_upload_sessions where id=v_op3 and state='failed')
       or not exists(select 1 from public.documents where workspace_id=v_ws_a and id=v_doc and status='ready' and storage_path=v_path1) then
      raise exception 'ENJAZ_P101_PROBE: failed upload became authoritative';
    end if;

    -- A subsequent genuine version reuses version 2, gets a new path and preserves v1.
    v_claim2:=public.prepare_document_upload_v1(v_ws_a,v_op2,'وثيقة اختبار 10.1 - محدثة','probe-v2.pdf','application/pdf',2222,v_doc,'certificate',null,null,null);
    v_path2:=v_claim2->>'path';
    if (v_claim2->>'versionNumber')::int<>2 or v_path2=v_path1 or v_path2 not like v_ws_a::text||'/'||v_doc::text||'/v2/%' then
      raise exception 'ENJAZ_P101_PROBE: second version path/version';
    end if;
    v_ack2:=public.acknowledge_document_upload_v1(v_op2,v_path2,2222,'application/pdf');
    if (select count(*) from public.document_versions where workspace_id=v_ws_a and document_id=v_doc)<>2
       or not exists(select 1 from public.document_versions where workspace_id=v_ws_a and document_id=v_doc and version_number=1 and storage_path=v_path1)
       or not exists(select 1 from public.document_versions where workspace_id=v_ws_a and document_id=v_doc and version_number=2 and storage_path=v_path2)
       or not exists(select 1 from public.documents where workspace_id=v_ws_a and id=v_doc and status='ready' and storage_path=v_path2 and size_bytes=2222) then
      raise exception 'ENJAZ_P101_PROBE: version history/current pointer';
    end if;

    v_download1:=public.get_document_download_claim_v1(v_ws_a,v_doc,1);
    v_download2:=public.get_document_download_claim_v1(v_ws_a,v_doc,2);
    if v_download1->>'path'<>v_path1 or v_download2->>'path'<>v_path2 then
      raise exception 'ENJAZ_P101_PROBE: download version resolution';
    end if;

    v_detail:=public.get_document_detail_v1(v_ws_a,v_doc);
    if jsonb_array_length(v_detail->'versions')<>2 then
      raise exception 'ENJAZ_P101_PROBE: detail version history';
    end if;

    perform public.archive_document_v1(v_ws_a,v_doc);
    if not exists(select 1 from public.documents where workspace_id=v_ws_a and id=v_doc and status='archived' and archived_at is not null)
       or (select count(*) from public.document_versions where workspace_id=v_ws_a and document_id=v_doc)<>2 then
      raise exception 'ENJAZ_P101_PROBE: archive destroyed history';
    end if;
    v_list:=public.get_document_vault_v1(v_ws_a,null,false,100,0);
    if (v_list->>'total')::int<>0 then raise exception 'ENJAZ_P101_PROBE: archived leaked into active vault'; end if;
    v_list:=public.get_document_vault_v1(v_ws_a,null,true,100,0);
    if (v_list->>'total')::int<>1 then raise exception 'ENJAZ_P101_PROBE: archived missing from inclusive vault'; end if;

    -- Force rollback of every fixture write while preserving successful proof execution.
    raise exception '%',v_marker;
  exception when others then
    if sqlerrm<>v_marker then raise; end if;
  end;

  if exists(select 1 from public.workspaces where id in (v_ws_a,v_ws_b))
     or exists(select 1 from public.document_upload_sessions where id in (v_op1,v_op2,v_op3)) then
    raise exception 'ENJAZ_P101_PROBE: rollback residue';
  end if;
end;
$outer$;
