import { randomUUID } from 'node:crypto';

// N02: a real authenticated workforce member belongs to the SAME workspace but
// has no owner mutation authority. Every probe uses valid same-workspace source
// identifiers from the linked J01-J11 journey, then proves no unauthorized
// domain mutation is persisted. The enclosing runner owns fixture cleanup.
export async function checkSameWorkspaceRoleMatrix({
  member, fresh, workspaceId, companyId, transactionId, procedureId,
  templateVersionId, readCount, verify,
}) {
  const ws=workspaceId;
  const unchanged=async(table,expected)=>await readCount(table,ws)===expected;

  // J01 company
  const company=await member.client.from('companies').insert({
    workspace_id:ws,legal_name:'DENIED N02 workforce company',capital:1,
  }).select('id');
  verify(Boolean(company.error)&&await unchanged('companies',1),
    'N02_J01_WORKFORCE_COMPANY_MUTATION_DENIED');

  // J02 transaction
  const transaction=await member.client.from('transactions').insert({
    workspace_id:ws,company_id:companyId,type:'denied_n02',current_fee:1,
  }).select('id');
  verify(Boolean(transaction.error)&&await unchanged('transactions',1),
    'N02_J02_WORKFORCE_TRANSACTION_MUTATION_DENIED');

  // J03 procedure/workflow
  const procedure=await member.client.rpc('start_government_procedure_v1',{
    p_workspace_id:ws,p_transaction_id:transactionId,p_procedure_id:procedureId,
    p_branch_id:null,p_idempotency_key:randomUUID(),
  });
  verify(Boolean(procedure.error)&&await unchanged('workflow_instances',1),
    'N02_J03_WORKFORCE_PROCEDURE_MUTATION_DENIED');

  // J04 field
  const field=await member.client.rpc('upsert_field_assignment_v1',{
    p_workspace_id:ws,p_assignment_id:null,p_expected_version:null,
    p_transaction_id:transactionId,p_assigned_user_id:member.id,
    p_scheduled_for:'2026-09-21',p_destination_label:'DENIED N02',
    p_department:'QA',p_priority:'normal',
  });
  verify(Boolean(field.error)&&await unchanged('field_assignments',1),
    'N02_J04_WORKFORCE_FIELD_MUTATION_DENIED');

  // J05 follow-up
  const followup=await member.client.rpc('create_transaction_followup_v1',{
    p_workspace_id:ws,p_transaction_id:transactionId,p_followup_id:randomUUID(),
    p_title:'DENIED N02 workforce followup',
    p_due_at:new Date(Date.now()+86400000).toISOString(),
  });
  verify(Boolean(followup.error)&&await unchanged('transaction_followups',1),
    'N02_J05_WORKFORCE_FOLLOWUP_MUTATION_DENIED');

  // J06 finance
  const payment=await member.client.rpc('post_payment_v1',{
    p_workspace_id:ws,p_transaction_id:transactionId,p_amount:'1.00',
    p_method:'transfer',p_paid_at:new Date().toISOString(),
    p_note:'DENIED N02 workforce payment',p_idempotency_key:randomUUID(),
    p_cashbox_id:null,p_engagement_id:null,
  });
  verify(Boolean(payment.error)&&await unchanged('payments',1)&&
    await unchanged('payment_reversals',1),
    'N02_J06_WORKFORCE_FINANCE_MUTATION_DENIED');

  // J07 documents: use the already-published valid template version, so a
  // rejection cannot be explained by a malformed or foreign template.
  const draft=await member.client.rpc('generate_document_draft_v1',{
    p_workspace_id:ws,p_request_id:randomUUID(),
    p_template_version_id:templateVersionId,p_title:'DENIED N02 workforce draft',
    p_company_id:companyId,p_transaction_id:transactionId,
    p_contact_id:null,p_ocr_analysis_id:null,
  });
  verify(Boolean(draft.error)&&await unchanged('document_drafts',1)&&
    await unchanged('documents',1),
    'N02_J07_WORKFORCE_DOCUMENT_MUTATION_DENIED');

  // J08 client portal: workforce membership must not be usable as a client
  // principal or invitation authority.
  const portal=await member.client.rpc('activate_client_portal_invitation_v1',{
    p_workspace_id:ws,p_expected_version:1,
  });
  verify(Boolean(portal.error)&&await unchanged('client_portal_principals',1),
    'N02_J08_WORKFORCE_CLIENT_PORTAL_ESCALATION_DENIED');

  // J09 archive / restore lifecycle. UPDATE under RLS can legitimately return
  // zero rows instead of an error, so verify both the response and owner source.
  const stamp=new Date().toISOString();
  const archive=await member.client.from('transactions')
    .update({archived_at:stamp,updated_at:stamp,last_activity_at:stamp})
    .eq('id',transactionId).eq('workspace_id',ws).select('id');
  const source=await fresh.from('transactions')
    .select('id,archived_at,deleted_at').eq('id',transactionId).single();
  verify((Boolean(archive.error)||archive.data?.length===0)&&
    !source.error&&source.data?.id===transactionId&&
    source.data?.archived_at===null&&source.data?.deleted_at===null&&
    await unchanged('transactions',1),
    'N02_J09_WORKFORCE_LIFECYCLE_MUTATION_DENIED');

  // J10 governance. This deliberately repeats the same-workspace mutation
  // boundary after all prior domains have run.
  const governance=await member.client.rpc('record_company_resolution_v1',{
    p_workspace_id:ws,p_company_id:companyId,p_expected_version:1,
    p_operation_id:randomUUID(),p_resolution_number:'DENIED-N02',
    p_title:'DENIED N02 workforce resolution',p_resolution_type:'authorization',
    p_effective_on:'2026-02-01',p_notes:'must not persist',
  });
  verify(Boolean(governance.error)&&await unchanged('corporate_resolutions',1),
    'N02_J10_WORKFORCE_GOVERNANCE_MUTATION_DENIED');

  // J11 engagement/contract domain.
  const engagement=await member.client.rpc('create_billing_engagement_v1',{
    p_workspace_id:ws,p_company_id:companyId,p_transaction_id:transactionId,
    p_title:'DENIED N02 workforce engagement',p_engagement_type:'retainer',
    p_billing_mode:'retainer',p_reference:'DENIED-'+randomUUID(),
    p_start_on:'2026-01-01',p_end_on:'2026-12-31',
    p_idempotency_key:randomUUID(),
  });
  verify(Boolean(engagement.error)&&await unchanged('commercial_engagements',1)&&
    await unchanged('engagement_contract_revisions',2),
    'N02_J11_WORKFORCE_ENGAGEMENT_MUTATION_DENIED');

  verify(true,'N02_SAME_WORKSPACE_ROLE_ALL_DOMAINS');
}
