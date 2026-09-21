import {randomUUID} from 'node:crypto';

// N02: prove that a real same-workspace workforce identity which is visible in
// organization_members but has NO legacy workspace_memberships authority cannot
// mutate any of the eleven Phase 14.1 business domains. The enclosing runner
// owns all fixture lifecycle and zero-residue cleanup.
export async function checkSameWorkspaceRoleNegativeMatrix({
  owner,member,admin,workspaceId,companyId,procedureId,templateVersionId,readCount,verify,
}) {
  const ws=workspaceId;
  const [org,legacy,workspace]=await Promise.all([
    admin.from('organization_members').select('user_id,status')
      .eq('workspace_id',ws).eq('user_id',member.id).single(),
    admin.from('workspace_memberships').select('user_id,role')
      .eq('workspace_id',ws).eq('user_id',member.id),
    admin.from('workspaces').select('id,owner_user_id').eq('id',ws).single(),
  ]);
  verify(!org.error&&org.data?.status==='active'&&!legacy.error&&legacy.data?.length===0&&
    !workspace.error&&workspace.data?.owner_user_id===owner.id&&member.id!==owner.id,
    'N02_REAL_SAME_WORKSPACE_NON_AUTHORIZED_WORKFORCE_PRINCIPAL');

  // A clean owner-created control transaction ensures J03-J06/J09 probes target
  // a valid active record with no pre-existing workflow/field/followup/payment state.
  const control=await owner.client.from('transactions').insert({
    workspace_id:ws,company_id:companyId,type:'phase14_1_n02_control',current_fee:1,
  }).select('id,workspace_id,company_id,archived_at,updated_at').single();
  verify(!control.error&&Boolean(control.data?.id)&&control.data?.workspace_id===ws&&
    control.data?.company_id===companyId&&control.data?.archived_at===null,
    'N02_OWNER_CONTROL_TRANSACTION_VALID');
  const tx=control.data.id;

  let before=await readCount('companies',ws);
  const j01=await member.client.from('companies').insert({
    workspace_id:ws,legal_name:'N02 forbidden workforce company',
  }).select('id');
  verify(Boolean(j01.error)&&await readCount('companies',ws)===before,
    'N02_J01_COMPANY_MUTATION_DENIED_NO_ROW');

  before=await readCount('transactions',ws);
  const j02=await member.client.from('transactions').insert({
    workspace_id:ws,company_id:companyId,type:'phase14_1_n02_forbidden',current_fee:1,
  }).select('id');
  verify(Boolean(j02.error)&&await readCount('transactions',ws)===before,
    'N02_J02_TRANSACTION_MUTATION_DENIED_NO_ROW');

  before=await readCount('workflow_instances',ws);
  const j03=await member.client.rpc('start_government_procedure_v1',{
    p_workspace_id:ws,p_transaction_id:tx,p_procedure_id:procedureId,
    p_branch_id:null,p_idempotency_key:randomUUID(),
  });
  verify(Boolean(j03.error)&&await readCount('workflow_instances',ws)===before,
    'N02_J03_PROCEDURE_MUTATION_DENIED_NO_ROW');

  before=await readCount('field_assignments',ws);
  const j04=await member.client.rpc('upsert_field_assignment_v1',{
    p_workspace_id:ws,p_assignment_id:null,p_expected_version:null,
    p_transaction_id:tx,p_assigned_user_id:owner.id,p_scheduled_for:'2026-09-22',
    p_destination_label:'N02 forbidden workforce assignment',
    p_department:'QA',p_priority:'normal',
  });
  verify(Boolean(j04.error)&&await readCount('field_assignments',ws)===before,
    'N02_J04_FIELD_MUTATION_DENIED_NO_ROW');

  before=await readCount('transaction_followups',ws);
  const j05=await member.client.rpc('create_transaction_followup_v1',{
    p_workspace_id:ws,p_transaction_id:tx,p_followup_id:randomUUID(),
    p_title:'N02 forbidden workforce followup',
    p_due_at:new Date(Date.now()+86400000).toISOString(),
  });
  verify(Boolean(j05.error)&&await readCount('transaction_followups',ws)===before,
    'N02_J05_FOLLOWUP_MUTATION_DENIED_NO_ROW');

  before=await readCount('payments',ws);
  const j06=await member.client.rpc('post_payment_v1',{
    p_workspace_id:ws,p_transaction_id:tx,p_amount:'1.00',p_method:'transfer',
    p_paid_at:new Date().toISOString(),p_note:'N02 forbidden workforce payment',
    p_idempotency_key:randomUUID(),p_cashbox_id:null,p_engagement_id:null,
  });
  verify(Boolean(j06.error)&&await readCount('payments',ws)===before,
    'N02_J06_FINANCE_MUTATION_DENIED_NO_ROW');

  before=await readCount('document_drafts',ws);
  const j07=await member.client.rpc('generate_document_draft_v1',{
    p_workspace_id:ws,p_request_id:randomUUID(),p_template_version_id:templateVersionId,
    p_title:'N02 forbidden workforce draft',p_company_id:companyId,p_transaction_id:tx,
    p_contact_id:null,p_ocr_analysis_id:null,
  });
  verify(Boolean(j07.error)&&await readCount('document_drafts',ws)===before,
    'N02_J07_DOCUMENT_MUTATION_DENIED_NO_ROW');

  before=await readCount('client_portal_principals',ws);
  const j08=await member.client.from('client_portal_principals').insert({
    id:randomUUID(),workspace_id:ws,user_id:member.id,status:'invited',created_by:owner.id,
  }).select('id');
  verify(Boolean(j08.error)&&await readCount('client_portal_principals',ws)===before,
    'N02_J08_CLIENT_PORTAL_AUTHORITY_MUTATION_DENIED_NO_ROW');

  const beforeArchive=await admin.from('transactions')
    .select('archived_at,updated_at').eq('id',tx).eq('workspace_id',ws).single();
  if(beforeArchive.error)throw Error('N02_J09_CONTROL_READ_DENIED');
  const stamp=new Date(Date.now()+2000).toISOString();
  const j09=await member.client.from('transactions')
    .update({archived_at:stamp,updated_at:stamp,last_activity_at:stamp})
    .eq('id',tx).eq('workspace_id',ws).select('id');
  const afterArchive=await admin.from('transactions')
    .select('archived_at,updated_at').eq('id',tx).eq('workspace_id',ws).single();
  verify((Boolean(j09.error)||j09.data?.length===0)&&!afterArchive.error&&
    afterArchive.data?.archived_at===beforeArchive.data?.archived_at&&
    afterArchive.data?.updated_at===beforeArchive.data?.updated_at,
    'N02_J09_ARCHIVE_MUTATION_DENIED_SOURCE_UNCHANGED');

  before=await readCount('corporate_resolutions',ws);
  const j10=await member.client.rpc('record_company_resolution_v1',{
    p_workspace_id:ws,p_company_id:companyId,p_expected_version:1,
    p_operation_id:randomUUID(),p_resolution_number:'N02-'+randomUUID().slice(0,8),
    p_title:'N02 forbidden workforce resolution',p_resolution_type:'authorization',
    p_effective_on:'2026-09-21',p_notes:'Disposable negative authorization probe',
  });
  verify(j10.error?.code==='42501'&&await readCount('corporate_resolutions',ws)===before,
    'N02_J10_GOVERNANCE_MUTATION_DENIED_NO_ROW');

  before=await readCount('commercial_engagements',ws);
  const j11=await member.client.rpc('create_billing_engagement_v1',{
    p_workspace_id:ws,p_company_id:companyId,p_transaction_id:tx,
    p_title:'N02 forbidden workforce engagement',p_engagement_type:'retainer',
    p_billing_mode:'retainer',p_reference:'N02-'+randomUUID(),
    p_start_on:'2026-09-21',p_end_on:'2026-12-31',p_idempotency_key:randomUUID(),
  });
  verify(j11.error?.code==='42501'&&await readCount('commercial_engagements',ws)===before,
    'N02_J11_ENGAGEMENT_MUTATION_DENIED_NO_ROW');

  verify(true,'N02_SAME_WORKSPACE_NON_AUTHORIZED_ROLE_ALL_ELEVEN_DOMAINS_PASS');
}
