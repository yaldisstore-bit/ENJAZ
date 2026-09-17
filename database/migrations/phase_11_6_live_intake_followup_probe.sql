-- ENJAZ Phase 11.6-B — authenticated Real Cloud intake follow-up / Portal reconciliation probe
-- Applies only after the two Phase 11.6-B authority migrations. Creates temporary fixtures and removes them before commit.
begin;

do $$
declare v_users uuid[];
begin
  select array_agg(id order by created_at,id) into v_users
  from (select id,created_at from auth.users order by created_at,id limit 2) u;
  if cardinality(v_users)<2 then raise exception 'P116B_TWO_AUTH_USERS_REQUIRED'; end if;
  perform set_config('p116b.actor',v_users[1]::text,true);
  perform set_config('p116b.client',v_users[2]::text,true);
end $$;

insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency) values
('11620000-0000-4000-8000-000000000001',current_setting('p116b.actor')::uuid,'__ENJAZ_P116B_A__','Asia/Baghdad','ar-IQ','IQD'),
('11620000-0000-4000-8000-000000000002',current_setting('p116b.actor')::uuid,'__ENJAZ_P116B_B__','Asia/Baghdad','ar-IQ','IQD');
insert into public.workspace_memberships(workspace_id,user_id,role) values
('11620000-0000-4000-8000-000000000001',current_setting('p116b.actor')::uuid,'owner'),
('11620000-0000-4000-8000-000000000002',current_setting('p116b.actor')::uuid,'owner');

insert into public.companies(id,workspace_id,legal_name,status) values
('11620000-0000-4000-8000-000000000101','11620000-0000-4000-8000-000000000001','__P116B_COMPANY__','active');
insert into public.transactions(id,workspace_id,company_id,type,status,priority,current_fee) values
('11620000-0000-4000-8000-000000000201','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000101','P116B intake follow-up','active','normal',1),
('11620000-0000-4000-8000-000000000202','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000101','P116B unrelated transaction','active','normal',1);

insert into public.crm_leads(id,workspace_id,display_name,source,stage,converted_company_id,converted_transaction_id,created_by) values
('11620000-0000-4000-8000-000000000301','11620000-0000-4000-8000-000000000001','__P116B_CONVERTED_LEAD__','probe','converted','11620000-0000-4000-8000-000000000101','11620000-0000-4000-8000-000000000201',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000302','11620000-0000-4000-8000-000000000001','__P116B_UNBOUND_LEAD__','probe','inquiry',null,null,current_setting('p116b.actor')::uuid);

insert into public.intake_forms(id,workspace_id,name,public_title,public_description,active,created_by) values
('11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000001','__P116B_FORM_A__','اختبار استكمال البيانات','اختبار حي مؤقت',true,current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000402','11620000-0000-4000-8000-000000000002','__P116B_FORM_B__','اختبار عزل مساحة العمل','اختبار حي مؤقت',true,current_setting('p116b.actor')::uuid);
insert into public.intake_form_fields(id,workspace_id,form_id,field_key,label,field_type,required,position,config) values
('11620000-0000-4000-8000-000000000411','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','phone','الهاتف','phone',true,1,'{}'),
('11620000-0000-4000-8000-000000000412','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','email','البريد الإلكتروني','email',false,2,'{}'),
('11620000-0000-4000-8000-000000000413','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','note','ملاحظة','textarea',false,3,'{}'),
('11620000-0000-4000-8000-000000000421','11620000-0000-4000-8000-000000000002','11620000-0000-4000-8000-000000000402','phone','الهاتف','phone',true,1,'{}');

insert into public.intake_links(id,workspace_id,form_id,lead_id,token_hash,expires_at,issued_by) values
('11620000-0000-4000-8000-000000000501','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401',null,repeat('1',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000502','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401',null,repeat('2',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000503','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401',null,repeat('3',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000504','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000301',repeat('4',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000505','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000301',repeat('5',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000506','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000302',repeat('6',64),now()+interval '7 days',current_setting('p116b.actor')::uuid),
('11620000-0000-4000-8000-000000000507','11620000-0000-4000-8000-000000000002','11620000-0000-4000-8000-000000000402',null,repeat('7',64),now()+interval '7 days',current_setting('p116b.actor')::uuid);
insert into public.intake_submissions(id,workspace_id,form_id,link_id,status,answers,submitted_at) values
('11620000-0000-4000-8000-000000000601','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000501','submitted','{"phone":"07700000000"}',now()),
('11620000-0000-4000-8000-000000000602','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000502','submitted','{"phone":"07700000002"}',now()),
('11620000-0000-4000-8000-000000000603','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000503','submitted','{"phone":"07700000003"}',now()),
('11620000-0000-4000-8000-000000000604','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000504','submitted','{"email":"old@example.com"}',now()),
('11620000-0000-4000-8000-000000000605','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000505','submitted','{"email":"old2@example.com"}',now()),
('11620000-0000-4000-8000-000000000606','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000401','11620000-0000-4000-8000-000000000506','submitted','{"email":"unbound@example.com"}',now()),
('11620000-0000-4000-8000-000000000607','11620000-0000-4000-8000-000000000002','11620000-0000-4000-8000-000000000402','11620000-0000-4000-8000-000000000507','submitted','{"phone":"07800000000"}',now());

insert into public.client_portal_principals(id,workspace_id,user_id,status,activated_at,version,created_by) values
('11620000-0000-4000-8000-000000000701','11620000-0000-4000-8000-000000000001',current_setting('p116b.client')::uuid,'active',now(),1,current_setting('p116b.actor')::uuid);
insert into public.client_portal_grants(id,workspace_id,principal_id,target_type,transaction_id,permissions,valid_from,version,created_by) values
('11620000-0000-4000-8000-000000000702','11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000701','transaction','11620000-0000-4000-8000-000000000201',array['view','message','upload_requested_document'],now()-interval '1 minute',1,current_setting('p116b.actor')::uuid);

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116b.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116b.actor'),true);
set local role authenticated;

do $$
declare v jsonb; v_token text; v_fid uuid;
begin
  if auth.uid() is distinct from current_setting('p116b.actor')::uuid then raise exception 'P116B_STAFF_AUTH_UID_MISMATCH'; end if;

  begin
    insert into private.intake_followup_requests(
      workspace_id,submission_id,mode,request_kind,title,requested_fields,token_hash,source_submission_version,expected_submission_version,expires_at,idempotency_key,requested_by
    ) values(
      '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000601','secure_link','information','FORBIDDEN','["phone"]',repeat('f',64),1,1,now()+interval '1 hour','11620000-0000-4000-8000-000000009999',current_setting('p116b.actor')::uuid
    );
    raise exception 'P116B_PRIVATE_DIRECT_INSERT_NOT_BLOCKED';
  exception when insufficient_privilege then null; end;

  begin
    perform public.issue_intake_followup_v1(
      '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000607',1,
      'secure_link','information','["phone"]','Cross workspace','forbidden',24,'11620000-0000-4000-8000-000000000801',null,null,null
    );
    raise exception 'P116B_CROSS_WORKSPACE_SUBMISSION_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_SUBMISSION_NOT_FOUND%' then raise; end if;
  end;

  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000601',1,
    'secure_link','information','["phone","email"]','استكمال البيانات','يرجى تحديث البيانات',24,
    '11620000-0000-4000-8000-000000000802',null,null,null
  );
  if v->>'mode'<>'secure_link' or v->>'status'<>'open' or (v->>'submissionVersion')::int<>2 or v->>'token' !~ '^[0-9a-f]{64}$' then raise exception 'P116B_SECURE_ISSUE_INVALID %',v; end if;
  v_token:=v->>'token'; v_fid:=(v->>'followupId')::uuid;
  perform set_config('p116b.secure_token',v_token,true);
  perform set_config('p116b.secure_followup',v_fid::text,true);

  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000601',1,
    'secure_link','information','["phone","email"]','استكمال البيانات','يرجى تحديث البيانات',24,
    '11620000-0000-4000-8000-000000000802',null,null,null
  );
  if coalesce((v->>'wasDuplicate')::boolean,false) is not true or v->>'token'<>v_token or (v->>'followupId')::uuid<>v_fid then raise exception 'P116B_SECURE_RETRY_NOT_IDEMPOTENT %',v; end if;

  begin
    perform public.issue_intake_followup_v1(
      '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000601',1,
      'secure_link','information','["phone","email"]','CHANGED','يرجى تحديث البيانات',24,
      '11620000-0000-4000-8000-000000000802',null,null,null
    );
    raise exception 'P116B_IDEMPOTENCY_CONFLICT_NOT_REJECTED';
  exception when unique_violation then null; end;

  begin
    perform public.issue_intake_followup_v1(
      '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000601',2,
      'secure_link','information','["phone"]','Second open','forbidden',24,
      '11620000-0000-4000-8000-000000000803',null,null,null
    );
    raise exception 'P116B_SECOND_OPEN_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_ALREADY_OPEN%' then raise; end if;
  end;

  begin
    perform public.issue_intake_followup_v1(
      '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000606',1,
      'client_portal','information','["email"]','Unbound portal','forbidden',24,
      '11620000-0000-4000-8000-000000000804','11620000-0000-4000-8000-000000000701','11620000-0000-4000-8000-000000000201','11620000-0000-4000-8000-000000000901'
    );
    raise exception 'P116B_UNBOUND_PORTAL_TRANSACTION_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_PORTAL_TRANSACTION_UNBOUND%' then raise; end if;
  end;
end $$;

reset role;

do $$
declare v_hash text; v_expected text;
begin
  select token_hash into v_hash from private.intake_followup_requests where id=current_setting('p116b.secure_followup')::uuid;
  v_expected:=encode(extensions.digest(convert_to(current_setting('p116b.secure_token'),'UTF8'),'sha256'),'hex');
  if v_hash<>v_expected then raise exception 'P116B_TOKEN_HASH_NOT_CANONICAL'; end if;
  if exists(select 1 from information_schema.columns where table_schema='private' and table_name='intake_followup_requests' and column_name='token') then raise exception 'P116B_RAW_TOKEN_COLUMN_PRESENT'; end if;
  if (select status from public.intake_submissions where id='11620000-0000-4000-8000-000000000601')<>'under_review'
     or (select version from public.intake_submissions where id='11620000-0000-4000-8000-000000000601')<>2 then raise exception 'P116B_CANONICAL_SUBMISSION_NOT_IN_REVIEW'; end if;
end $$;

-- Anonymous capability: draft must not mutate canonical answers; finalize must update the same submission only.
set local role anon;
do $$
declare v jsonb; v_before jsonb;
begin
  select answers into v_before from public.intake_submissions where id='11620000-0000-4000-8000-000000000601';
  v:=public.get_public_intake_followup_v1(current_setting('p116b.secure_token'));
  if v->>'publicAuthority'<>'non_authoritative_followup_input' or v->>'status'<>'open' then raise exception 'P116B_PUBLIC_VIEW_INVALID %',v; end if;

  begin
    perform public.save_public_intake_followup_v1(current_setting('p116b.secure_token'),' {"note":"out of scope"}'::jsonb,false);
    raise exception 'P116B_OUT_OF_SCOPE_PATCH_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_PATCH_SCOPE_INVALID%' then raise; end if;
  end;

  v:=public.save_public_intake_followup_v1(current_setting('p116b.secure_token'),' {"phone":"07711111111"}'::jsonb,false);
  if v->>'status'<>'open' or (v->>'submissionVersion')::int<>2 then raise exception 'P116B_DRAFT_SAVE_INVALID %',v; end if;
  if (select answers from public.intake_submissions where id='11620000-0000-4000-8000-000000000601')<>v_before then raise exception 'P116B_DRAFT_MUTATED_CANONICAL_SUBMISSION'; end if;

  v:=public.save_public_intake_followup_v1(current_setting('p116b.secure_token'),' {"phone":"07711111111","email":"probe@example.com"}'::jsonb,true);
  if v->>'status'<>'responded' or (v->>'submissionVersion')::int<>3 or coalesce((v->>'wasDuplicate')::boolean,false) then raise exception 'P116B_FINALIZE_INVALID %',v; end if;
  if (select status from public.intake_submissions where id='11620000-0000-4000-8000-000000000601')<>'under_review' then raise exception 'P116B_FOLLOWUP_AUTO_APPROVED_INTAKE'; end if;
  if (select answers->>'phone' from public.intake_submissions where id='11620000-0000-4000-8000-000000000601')<>'07711111111' then raise exception 'P116B_FINAL_PATCH_NOT_MERGED'; end if;

  v:=public.save_public_intake_followup_v1(current_setting('p116b.secure_token'),' {"phone":"07711111111","email":"probe@example.com"}'::jsonb,true);
  if coalesce((v->>'wasDuplicate')::boolean,false) is not true or (v->>'submissionVersion')::int<>3 then raise exception 'P116B_FINALIZE_REPLAY_NOT_IDEMPOTENT %',v; end if;
end $$;
reset role;

-- Revocation and expiry capabilities.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116b.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116b.actor'),true);
set local role authenticated;
do $$
declare v jsonb;
begin
  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000602',1,'secure_link','information','["phone"]','Revoke probe',null,24,
    '11620000-0000-4000-8000-000000000805',null,null,null
  );
  perform set_config('p116b.revoke_token',v->>'token',true);
  perform set_config('p116b.revoke_followup',v->>'followupId',true);
  v:=public.revoke_intake_followup_v1('11620000-0000-4000-8000-000000000001',(v->>'followupId')::uuid,1,'probe revocation');
  if v->>'status'<>'revoked' then raise exception 'P116B_REVOKE_FAILED %',v; end if;

  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000603',1,'secure_link','information','["phone"]','Expiry probe',null,24,
    '11620000-0000-4000-8000-000000000806',null,null,null
  );
  perform set_config('p116b.expire_token',v->>'token',true);
  perform set_config('p116b.expire_followup',v->>'followupId',true);
end $$;
reset role;
update private.intake_followup_requests set expires_at=now()-interval '1 minute' where id=current_setting('p116b.expire_followup')::uuid;
set local role anon;
do $$
begin
  begin perform public.get_public_intake_followup_v1(current_setting('p116b.revoke_token')); raise exception 'P116B_REVOKED_TOKEN_NOT_REJECTED';
  exception when others then if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_REVOKED%' then raise; end if; end;
  begin perform public.get_public_intake_followup_v1(current_setting('p116b.expire_token')); raise exception 'P116B_EXPIRED_TOKEN_NOT_REJECTED';
  exception when others then if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_EXPIRED%' then raise; end if; end;
end $$;
reset role;

-- Portal information path: M3 request is created first; reconciliation is impossible until real client evidence fulfills it.
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116b.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116b.actor'),true);
set local role authenticated;
do $$
declare v jsonb;
begin
  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000604',1,
    'client_portal','information','["email"]','Portal info probe','أرسل البريد الصحيح',24,
    '11620000-0000-4000-8000-000000000807','11620000-0000-4000-8000-000000000701','11620000-0000-4000-8000-000000000201','11620000-0000-4000-8000-000000000901'
  );
  if v->>'mode'<>'client_portal' or v->>'portalRequestId'<>'11620000-0000-4000-8000-000000000901' or v->>'token' is not null then raise exception 'P116B_PORTAL_ISSUE_INVALID %',v; end if;
  perform set_config('p116b.portal_followup',v->>'followupId',true);

  begin
    perform public.reconcile_portal_intake_followup_v1(
      '11620000-0000-4000-8000-000000000001',(v->>'followupId')::uuid,1,2,'{"email":"client@example.com"}'
    );
    raise exception 'P116B_PORTAL_RECONCILED_WITHOUT_RESPONSE';
  exception when others then
    if sqlerrm not like '%ENJAZ_INTAKE_FOLLOWUP_PORTAL_REQUEST_NOT_FULFILLED%' then raise; end if;
  end;
end $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116b.client'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116b.client'),true);
set local role authenticated;
do $$
declare v jsonb;
begin
  if auth.uid() is distinct from current_setting('p116b.client')::uuid then raise exception 'P116B_CLIENT_AUTH_UID_MISMATCH'; end if;
  v:=public.send_client_portal_message_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000201','11620000-0000-4000-8000-000000000901','11620000-0000-4000-8000-000000000911','client@example.com'
  );
  if v->>'requestId'<>'11620000-0000-4000-8000-000000000901' then raise exception 'P116B_CLIENT_MESSAGE_FAILED %',v; end if;
end $$;
reset role;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',current_setting('p116b.actor'))::text,true);
select set_config('request.jwt.claim.sub',current_setting('p116b.actor'),true);
set local role authenticated;
do $$
declare v jsonb;
begin
  v:=public.reconcile_portal_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001',current_setting('p116b.portal_followup')::uuid,1,2,'{"email":"client@example.com"}'
  );
  if v->>'status'<>'responded' or (v->>'submissionVersion')::int<>3 then raise exception 'P116B_PORTAL_RECONCILE_FAILED %',v; end if;
  if (select status from public.client_portal_requests where id='11620000-0000-4000-8000-000000000901')<>'fulfilled' then raise exception 'P116B_M3_REQUEST_NOT_FULFILLED'; end if;
  if (select answers->>'email' from public.intake_submissions where id='11620000-0000-4000-8000-000000000604')<>'client@example.com' then raise exception 'P116B_PORTAL_PATCH_NOT_RECONCILED'; end if;

  v:=public.issue_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000605',1,
    'client_portal','document','[]','Portal document probe','ارفع المستند المطلوب',24,
    '11620000-0000-4000-8000-000000000808','11620000-0000-4000-8000-000000000701','11620000-0000-4000-8000-000000000201','11620000-0000-4000-8000-000000000902'
  );
  if v->>'requestKind'<>'document' or (select request_type from public.client_portal_requests where id='11620000-0000-4000-8000-000000000902')<>'document' then raise exception 'P116B_DOCUMENT_NOT_DELEGATED_TO_M3 %',v; end if;
  perform set_config('p116b.document_followup',v->>'followupId',true);

  v:=public.revoke_intake_followup_v1(
    '11620000-0000-4000-8000-000000000001',(v->>'followupId')::uuid,1,'probe cleanup revocation'
  );
  if v->>'status'<>'revoked' or (select revoked_at from public.client_portal_requests where id='11620000-0000-4000-8000-000000000902') is null then raise exception 'P116B_PORTAL_REVOKE_NOT_PROPAGATED %',v; end if;
end $$;
reset role;

-- Audit and cleanup evidence.
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.audit_events
  where workspace_id='11620000-0000-4000-8000-000000000001'
    and action in ('intake.followup.requested','intake.followup.responded','intake.followup.portal_reconciled','intake.followup.revoked');
  if v_count<7 then raise exception 'P116B_AUDIT_EVIDENCE_INCOMPLETE %',v_count; end if;
end $$;

delete from public.workspaces where id in ('11620000-0000-4000-8000-000000000001','11620000-0000-4000-8000-000000000002');

do $$
begin
  if exists(select 1 from public.workspaces where id::text like '11620000-0000-4000-8000-%') then raise exception 'P116B_WORKSPACE_RESIDUE'; end if;
  if exists(select 1 from private.intake_followup_requests where workspace_id::text like '11620000-0000-4000-8000-%') then raise exception 'P116B_FOLLOWUP_RESIDUE'; end if;
  if exists(select 1 from public.client_portal_requests where workspace_id::text like '11620000-0000-4000-8000-%') then raise exception 'P116B_PORTAL_REQUEST_RESIDUE'; end if;
  if exists(select 1 from public.intake_submissions where workspace_id::text like '11620000-0000-4000-8000-%') then raise exception 'P116B_SUBMISSION_RESIDUE'; end if;
  if exists(select 1 from public.audit_events where workspace_id::text like '11620000-0000-4000-8000-%') then raise exception 'P116B_AUDIT_RESIDUE'; end if;
end $$;

commit;
