import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

// Never run destructive test fixtures against the live ENJAZ project.
// Obtain ENJAZ_A2_BRANCH_REF from the connected project's list_branches
// result and obtain ALL API credentials from that isolated branch only.
const PRODUCTION_PROJECT='juzxriirhkuzviwnhkbd';
const MARKER='phase13_4_a2_readback_real_cloud';
const DIR='artifacts/phase13-4-a2-real-cloud';
const OUT=DIR+'/evidence.json';
const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error('Missing '+name);return value};
const branchRef=required('ENJAZ_A2_BRANCH_REF');
const url=required('SUPABASE_URL').replace(/\/$/,'');
const pub=required('SUPABASE_PUBLISHABLE_KEY');
const secret=required('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES' ||
   process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES' ||
   !/^[a-z0-9]{20}$/.test(branchRef) || branchRef===PRODUCTION_PROJECT ||
   url!==`https://${branchRef}.supabase.co` ||
   secret===pub || secret.startsWith('sb_publishable_'))
  throw new Error('13.4 A2 isolated branch-only safety guard');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],createdWorkspaces=new Set(),pendingWorkspaces=new Set();
const evidence={schema:'enjaz.phase13-4.a2.real-cloud.v1',projectRef:branchRef,productionProjectRef:PRODUCTION_PROJECT,
  startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],cleanupPassed:false};
const uuid=()=>crypto.randomUUID();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const failIf=(condition,name,detail='')=>{
  if(condition) throw new Error('FAILED '+name+(detail?' '+detail:''));
  evidence.checks.push({name,passed:true});
  console.log('PASS 13.4 A2 '+name);
};
const errText=e=>[e?.message,e?.details,e?.hint,e?.code].filter(Boolean).join(' | ');

async function createUser(label){
  const email='enjaz-a2-'+label+'-'+Date.now()+'-'+uuid().slice(0,8)+'@example.com';
  const password='Enjaz!13.4-'+uuid()+'Aa9';
  const {data,error}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER,label}
  });
  if(error||!data?.user)throw error??new Error('createUser failed');
  const user={id:data.user.id,email,password,client:make(),workspaceId:null,token:null};
  users.push(user);
  const signIn=await user.client.auth.signInWithPassword({email,password});
  if(signIn.error||!signIn.data.session?.access_token)throw signIn.error??new Error('signIn failed');
  user.token=signIn.data.session.access_token;
  return user;
}
async function workspace(user){
  for(let attempt=0;attempt<60;attempt++){
    const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',user.id).limit(2);
    if(error)throw error;
    if(data?.length===1){
      user.workspaceId=data[0].id;
      createdWorkspaces.add(data[0].id);pendingWorkspaces.add(data[0].id);
      return data[0].id;
    }
    await sleep(250);
  }
  throw new Error('fresh workspace bootstrap failed');
}
const item=(ordinal,stage,sourceKey,targetTable,targetId,normalizedFields)=>({
  ordinal,stage,sourceKey,targetTable,targetId,normalizedFields,writeAllowed:false
});
const relation=(sourceKey,targetKey,targetField,sourceTargetId,targetTargetId,sourceTargetTable,targetTargetTable)=>({
  sourceKey,targetKey,targetField,sourceTargetId,targetTargetId,sourceTargetTable,targetTargetTable,
  assignmentPerformed:false,writeAllowed:false
});
function probe(ws){
  const contactId=uuid(),companyId=uuid(),transactionId=uuid(),batchId=uuid();
  const contactKey='contact:a2',companyKey='company:a2',transactionKey='transaction:a2';
  const manifest={
    schema:'enjaz.legacy.ordered-import.execution-manifest.v1',
    snapshotId:'a2-isolated-snapshot',mappingPlanId:'a2-reviewed-mapping',
    workspaceId:ws,batchId,idempotencyKey:'phase13_4_a2_'+uuid().replaceAll('-',''),
    stageOrder:['contacts','companies','transactions'],
    items:[
      item(1,1,contactKey,'contacts',contactId,{display_name:'اختبار مطابقة',contact_type:'client',phone:null,email:null,notes:'A2 isolated'}),
      item(2,2,companyKey,'companies',companyId,{legal_name:'شركة اختبار A2',display_name:'A2',capital:120.50,address:'Baghdad',activities:'isolated test',registration_number:null,legal_status:null}),
      item(3,3,transactionKey,'transactions',transactionId,{type:'test_import_reconciliation',department:'qa',current_fee:135.25}),
    ],
    relationshipBindings:[
      relation(companyKey,contactKey,'primary_contact_id',companyId,contactId,'companies','contacts'),
      relation(transactionKey,companyKey,'company_id',transactionId,companyId,'transactions','companies'),
      relation(transactionKey,contactKey,'primary_contact_id',transactionId,contactId,'transactions','contacts')
    ],
    deterministic:true,workspacePermissionVerified:false,idempotencyBound:true,
    idempotencyEnforcementPerformed:false,targetIdsGenerated:false,
    foreignKeyBindingPerformed:true,foreignKeyAssignmentPerformed:false,
    persistencePerformed:false,importExecutionAllowed:false,targetMutationPerformed:false,
    readyForA3ExecutionBoundary:true,
  };
  return {manifest,ids:{contactId,companyId,transactionId,batchId}};
}
const params=m=>({
  p_workspace_id:m.workspaceId,p_batch_id:m.batchId,
  p_idempotency_key:m.idempotencyKey,p_manifest:m
});
const read=(client,m)=>client.rpc('read_legacy_import_reconciliation_v1',params(m));
const compare=(client,m)=>client.rpc('compare_legacy_import_reconciliation_v1',params(m));
const hasCode=(report,ordinal,code)=>report?.rows?.[ordinal-1]?.differenceCodes?.includes(code)===true;
const importProbe=(client,m)=>client.rpc('execute_legacy_ordered_import_v1',params(m));
const clone=value=>structuredClone(value);

async function test(){
  const owner=await createUser('owner'),other=await createUser('outsider');
  const ws=await workspace(owner),foreignWs=await workspace(other);
  failIf(ws===foreignWs,'isolated_workspace_ids');

  const p=probe(ws),m=p.manifest;
  const missingJob=await read(owner.client,m);
  if(missingJob.error)throw missingJob.error;
  failIf(missingJob.data!==null,'missing_import_job_fails_closed');
  const missingJobComparison=await compare(owner.client,m);
  failIf(Boolean(missingJobComparison.error)||missingJobComparison.data!==null,
    'a3_missing_import_job_never_yields_comparison');

  const anonymous=await read(make(),m);
  failIf(!anonymous.error,'anonymous_execution_denied',errText(anonymous.error));
  const anonymousCompare=await compare(make(),m);
  failIf(!anonymousCompare.error,'a3_anonymous_execution_denied',errText(anonymousCompare.error));

  const outsider=await read(other.client,m);
  failIf(Boolean(outsider.error)||outsider.data!==null,'outsider_cannot_read_owner_ledger');
  const outsiderComparison=await compare(other.client,m);
  failIf(Boolean(outsiderComparison.error)||outsiderComparison.data!==null,
    'a3_outsider_cannot_compare_owner_ledger');
  const unrelated=await read(owner.client,{...m,workspaceId:foreignWs});
  failIf(Boolean(unrelated.error)||unrelated.data!==null,'owner_cannot_read_foreign_workspace');
  const unrelatedCompare=await compare(owner.client,{...m,workspaceId:foreignWs});
  failIf(Boolean(unrelatedCompare.error)||unrelatedCompare.data!==null,
    'a3_owner_cannot_compare_foreign_workspace');

  const inserted=await importProbe(owner.client,m);
  if(inserted.error)throw inserted.error;
  failIf(inserted.data?.atomic!==true||inserted.data?.counts?.total!==3,'isolated_certified_13_3_import');

  const ownerRead=await read(owner.client,m);
  if(ownerRead.error)throw ownerRead.error;
  const data=ownerRead.data;
  failIf(data?.schema!=='enjaz.legacy.reconciliation.readback.v1','readback_schema');
  failIf(data.workspaceId!==ws||data.batchId!==m.batchId||
    data.idempotencyKey!==m.idempotencyKey,'workspace_batch_idempotency_bound');
  failIf(data.job?.status!=='succeeded'||data.job.counts?.total!==3,'successful_ledger_required');
  failIf(data.expectedRowCount!==3||data.observedRows?.length!==3,'complete_one_snapshot_readback');
  failIf(data.reconciled!==false||data.mutated!==false,'no_premature_equivalence_or_mutation');
  const cleanComparison=await compare(owner.client,m);
  if(cleanComparison.error)throw cleanComparison.error;
  failIf(cleanComparison.data?.schema!=='enjaz.legacy.reconciliation.comparison.v1'||
    cleanComparison.data?.rowCount!==3||cleanComparison.data?.matchedCount!==3||
    cleanComparison.data?.mismatchCount!==0||
    cleanComparison.data?.allMatchedAtSnapshot!==true||
    cleanComparison.data?.rows?.some(r=>r.differenceCodes?.length!==0)||
    cleanComparison.data?.reconciled!==false||
    cleanComparison.data?.closureAuthorized!==false||
    cleanComparison.data?.mutated!==false,
    'a3_actual_phase13_3_import_matches_only_at_snapshot_without_closure');
  const rows=data.observedRows;
  failIf(rows.some((r,i)=>r.ordinal!==i+1||r.found!==true||
    r.targetId!==m.items[i].targetId||r.sourceKey!==m.items[i].sourceKey||
    r.record?.id!==m.items[i].targetId||r.record?.workspaceId!==ws||
    r.record?.legacyId!==m.items[i].sourceKey||
    r.record?.legacySource!=='phase13.3'),'exact_source_target_lineage');
  failIf(rows[1].record?.relationshipIds?.primary_contact_id!==p.ids.contactId||
    rows[2].record?.relationshipIds?.company_id!==p.ids.companyId||
    rows[2].record?.relationshipIds?.primary_contact_id!==p.ids.contactId,
    'exact_company_and_contact_fk_readback');
  failIf(rows[1].record?.fields?.capitalDecimal!=='120.50'||
    rows[2].record?.fields?.current_fee_decimal!=='135.25',
    'lossless_decimal_money_readback');

  // Permission tests before import do not prove the live successful ledger is isolated.
  const [anonymousExisting,outsiderExisting]=await Promise.all([
    read(make(),m),read(other.client,m),
  ]);
  failIf(!anonymousExisting.error,'anonymous_cannot_read_successful_ledger',
    errText(anonymousExisting.error));
  failIf(Boolean(outsiderExisting.error)||outsiderExisting.data!==null,
    'outsider_cannot_read_successful_ledger');

  // The real schema allows another user to hold an owner-labelled workspace
  // membership while the canonical workspaces.owner_user_id remains unchanged.
  // Even if table RLS grants membership-based ledger read, the A2 RPC must
  // require the canonical workspace owner, not merely membership or its role.
  const {data:addedMember,error:memberError}=await admin.from('workspace_memberships')
    .insert({workspace_id:ws,user_id:other.id,role:'owner'})
    .select('workspace_id,user_id');
  if(memberError||addedMember?.length!==1)
    throw memberError??new Error('isolated same-workspace membership insert failed');
  const memberLedger=await other.client.from('import_jobs')
    .select('id').eq('workspace_id',ws).eq('id',m.batchId);
  if(memberLedger.error)throw memberLedger.error;
  failIf(memberLedger.data?.length!==1,
    'same_workspace_member_can_read_base_ledger_via_existing_rls');
  const memberReadback=await read(other.client,m);
  failIf(Boolean(memberReadback.error)||memberReadback.data!==null,
    'same_workspace_member_cannot_bypass_canonical_owner_readback');
  const memberComparison=await compare(other.client,m);
  failIf(Boolean(memberComparison.error)||memberComparison.data!==null,
    'a3_same_workspace_member_cannot_compare_as_canonical_owner');

  // Alter ONLY fresh test rows. A2 must expose drift, not silently attest or repair it.
  const {data:changedCompany,error:companyError}=await admin.from('companies')
    .update({primary_contact_id:null}).eq('id',p.ids.companyId)
    .eq('workspace_id',ws).select('id');
  if(companyError||changedCompany?.length!==1)
    throw companyError??new Error('isolated company tamper did not update exactly one row');
  const changedFk=await read(owner.client,m);
  if(changedFk.error)throw changedFk.error;
  failIf(changedFk.data?.observedRows?.[1]?.record?.relationshipIds?.primary_contact_id!==null||
    changedFk.data?.observedRows?.[1]?.found!==true||
    changedFk.data?.reconciled!==false,
    'changed_fk_visible_without_silent_reconciliation');
  const fkComparison=await compare(owner.client,m);
  if(fkComparison.error)throw fkComparison.error;
  failIf(fkComparison.data?.allMatchedAtSnapshot!==false||
    fkComparison.data?.mismatchCount!==1||!hasCode(fkComparison.data,2,'RELATIONSHIP_DRIFT')||
    fkComparison.data?.closureAuthorized!==false,
    'a3_changed_company_fk_detected_without_closure');
  const {data:restoredCompany,error:restoreCompanyError}=await admin.from('companies')
    .update({primary_contact_id:p.ids.contactId}).eq('id',p.ids.companyId)
    .eq('workspace_id',ws).select('id');
  if(restoreCompanyError||restoredCompany?.length!==1)
    throw restoreCompanyError??new Error('isolated company restore did not update exactly one row');

  const {data:changedTransaction,error:feeError}=await admin.from('transactions')
    .update({current_fee:140.25}).eq('id',p.ids.transactionId)
    .eq('workspace_id',ws).select('id');
  if(feeError||changedTransaction?.length!==1)
    throw feeError??new Error('isolated fee tamper did not update exactly one row');
  const changedMoney=await read(owner.client,m);
  if(changedMoney.error)throw changedMoney.error;
  failIf(changedMoney.data?.observedRows?.[2]?.record?.fields?.current_fee_decimal!=='140.25'||
    changedMoney.data?.reconciled!==false,
    'changed_money_visible_as_exact_decimal_without_reconciliation');
  const moneyComparison=await compare(owner.client,m);
  if(moneyComparison.error)throw moneyComparison.error;
  failIf(moneyComparison.data?.allMatchedAtSnapshot!==false||
    moneyComparison.data?.mismatchCount!==1||!hasCode(moneyComparison.data,3,'MONEY_DRIFT'),
    'a3_changed_transaction_money_detected');
  const {data:restoredTransaction,error:restoreFeeError}=await admin.from('transactions')
    .update({current_fee:135.25}).eq('id',p.ids.transactionId)
    .eq('workspace_id',ws).select('id');
  if(restoreFeeError||restoredTransaction?.length!==1)
    throw restoreFeeError??new Error('isolated fee restore did not update exactly one row');
  const restoredRead=await read(owner.client,m);
  if(restoredRead.error)throw restoredRead.error;
  failIf(JSON.stringify(restoredRead.data?.observedRows)!==JSON.stringify(rows),
    'isolated_test_row_restoration_verified');

  // The durable import ledger must not conceal post-import source-lineage drift.
  // Mutate ONLY the contact belonging to this fresh, disposable test workspace.
  const changedLegacyId=m.items[0].sourceKey+'-tampered';
  const {data:changedContact,error:contactError}=await admin.from('contacts')
    .update({legacy_id:changedLegacyId,display_name:'A2 changed after import'})
    .eq('id',p.ids.contactId).eq('workspace_id',ws).select('id');
  if(contactError||changedContact?.length!==1)
    throw contactError??new Error('isolated contact tamper did not update exactly one row');
  const changedLineage=await read(owner.client,m);
  if(changedLineage.error)throw changedLineage.error;
  failIf(changedLineage.data?.observedRows?.[0]?.record?.legacyId!==changedLegacyId||
    changedLineage.data?.observedRows?.[0]?.record?.fields?.display_name!=='A2 changed after import'||
    changedLineage.data?.observedRows?.[0]?.sourceKey!==m.items[0].sourceKey||
    changedLineage.data?.reconciled!==false,
    'changed_source_lineage_and_fields_exposed_without_auto_repair');
  const lineageComparison=await compare(owner.client,m);
  if(lineageComparison.error)throw lineageComparison.error;
  failIf(lineageComparison.data?.allMatchedAtSnapshot!==false||
    lineageComparison.data?.mismatchCount!==1||
    !hasCode(lineageComparison.data,1,'IDENTITY_DRIFT')||
    !hasCode(lineageComparison.data,1,'FIELD_DRIFT'),
    'a3_source_lineage_and_normalized_fields_detected');
  const {data:restoredContact,error:restoreContactError}=await admin.from('contacts')
    .update({legacy_id:m.items[0].sourceKey,display_name:'اختبار مطابقة'})
    .eq('id',p.ids.contactId).eq('workspace_id',ws).select('id');
  if(restoreContactError||restoredContact?.length!==1)
    throw restoreContactError??new Error('isolated contact restore did not update exactly one row');
  const restoredLineage=await read(owner.client,m);
  if(restoredLineage.error)throw restoredLineage.error;
  failIf(JSON.stringify(restoredLineage.data?.observedRows)!==JSON.stringify(rows),
    'isolated_source_lineage_restoration_verified');

  // Hosted Supabase must expose lifecycle drift under the authenticated owner
  // and restore to the exact clean snapshot without granting closure authority.
  const {data:lifecycleContact,error:lifecycleError}=await admin.from('contacts')
    .update({deleted_at:new Date().toISOString()}).eq('id',p.ids.contactId)
    .eq('workspace_id',ws).select('id');
  if(lifecycleError||lifecycleContact?.length!==1)
    throw lifecycleError??new Error('isolated lifecycle tamper did not update exactly one row');
  const lifecycleComparison=await compare(owner.client,m);
  if(lifecycleComparison.error)throw lifecycleComparison.error;
  failIf(lifecycleComparison.data?.allMatchedAtSnapshot!==false||
    lifecycleComparison.data?.mismatchCount!==1||
    !hasCode(lifecycleComparison.data,1,'LIFECYCLE_DRIFT')||
    lifecycleComparison.data?.closureAuthorized!==false,
    'a3_deleted_lifecycle_drift_detected_without_closure');
  const {data:lifecycleRestored,error:lifecycleRestoreError}=await admin.from('contacts')
    .update({deleted_at:null}).eq('id',p.ids.contactId).eq('workspace_id',ws).select('id');
  if(lifecycleRestoreError||lifecycleRestored?.length!==1)
    throw lifecycleRestoreError??new Error('isolated lifecycle restore did not update exactly one row');

  // One hosted row carrying all five independent drift axes must preserve every
  // diagnostic code; restoration must return equality but still no closure.
  const fiveAxisLegacyId=m.items[1].sourceKey+'-five-axis';
  const {data:fiveAxisCompany,error:fiveAxisError}=await admin.from('companies')
    .update({
      legacy_id:fiveAxisLegacyId,
      deleted_at:new Date().toISOString(),
      legal_name:'A3 five-axis drift',
      capital:121.50,
      primary_contact_id:null,
    }).eq('id',p.ids.companyId).eq('workspace_id',ws).select('id');
  if(fiveAxisError||fiveAxisCompany?.length!==1)
    throw fiveAxisError??new Error('isolated five-axis company tamper did not update exactly one row');
  const fiveAxisComparison=await compare(owner.client,m);
  if(fiveAxisComparison.error)throw fiveAxisComparison.error;
  failIf(fiveAxisComparison.data?.allMatchedAtSnapshot!==false||
    fiveAxisComparison.data?.mismatchCount!==1||
    JSON.stringify(fiveAxisComparison.data?.rows?.[1]?.differenceCodes)!==
      '["IDENTITY_DRIFT","LIFECYCLE_DRIFT","FIELD_DRIFT","MONEY_DRIFT","RELATIONSHIP_DRIFT"]'||
    fiveAxisComparison.data?.reconciled!==false||
    fiveAxisComparison.data?.closureAuthorized!==false||
    fiveAxisComparison.data?.mutated!==false,
    'a3_same_row_five_axis_drift_preserves_all_codes');
  const {data:fiveAxisRestored,error:fiveAxisRestoreError}=await admin.from('companies')
    .update({
      legacy_id:m.items[1].sourceKey,
      deleted_at:null,
      legal_name:'شركة اختبار A2',
      capital:120.50,
      primary_contact_id:p.ids.contactId,
    }).eq('id',p.ids.companyId).eq('workspace_id',ws).select('id');
  if(fiveAxisRestoreError||fiveAxisRestored?.length!==1)
    throw fiveAxisRestoreError??new Error('isolated five-axis company restore did not update exactly one row');
  const fiveAxisRestoredComparison=await compare(owner.client,m);
  if(fiveAxisRestoredComparison.error)throw fiveAxisRestoredComparison.error;
  failIf(fiveAxisRestoredComparison.data?.allMatchedAtSnapshot!==true||
    fiveAxisRestoredComparison.data?.matchedCount!==3||
    fiveAxisRestoredComparison.data?.mismatchCount!==0||
    fiveAxisRestoredComparison.data?.closureAuthorized!==false,
    'a3_five_axis_restoration_returns_equality_without_closure');

  // Deliberately corrupt ONLY the durable ledger of this disposable import.
  // Readback must reject an inconsistent success record, not return misleading evidence.
  const {data:jobRows,error:jobReadError}=await admin.from('import_jobs')
    .select('id,counts,reconciliation').eq('id',m.batchId)
    .eq('workspace_id',ws).limit(2);
  if(jobReadError||jobRows?.length!==1)
    throw jobReadError??new Error('isolated import ledger missing or ambiguous');
  const originalCounts=clone(jobRows[0].counts);
  const originalReconciliation=clone(jobRows[0].reconciliation);
  async function replaceIsolatedLedger(patch,label){
    const {data:updated,error}=await admin.from('import_jobs')
      .update(patch).eq('id',m.batchId).eq('workspace_id',ws).select('id');
    if(error||updated?.length!==1)
      throw error??new Error('isolated '+label+' did not update exactly one ledger');
  }
  await replaceIsolatedLedger({counts:{...originalCounts,total:4}},'counts corruption');
  const badCounts=await read(owner.client,m);
  failIf(Boolean(badCounts.error)||badCounts.data!==null,
    'inconsistent_durable_import_counts_denied');
  const inconsistentComparison=await compare(owner.client,m);
  failIf(Boolean(inconsistentComparison.error)||inconsistentComparison.data!==null,
    'a3_corrupt_durable_ledger_cannot_attest');
  await replaceIsolatedLedger({counts:originalCounts},'counts restoration');

  // Two independently consistent ledger objects must not override the
  // hash-bound original manifest; count each stage, not only total.
  async function assertDualLedgerCountDrift(nextCounts,label){
    await replaceIsolatedLedger({
      counts:nextCounts,
      reconciliation:{
        ...originalReconciliation,
        result:{...originalReconciliation.result,counts:{
          ...originalReconciliation.result.counts,
          total:nextCounts.total,contacts:nextCounts.contacts,
          companies:nextCounts.companies,transactions:nextCounts.transactions,
        }},
      },
    },label+' fixture corruption');
    const inconsistent=await read(owner.client,m);
    failIf(Boolean(inconsistent.error)||inconsistent.data!==null,label);
    await replaceIsolatedLedger({
      counts:originalCounts,reconciliation:originalReconciliation,
    },label+' fixture restoration');
  }
  await assertDualLedgerCountDrift({...originalCounts,total:4},
    'dual_corrupt_ledger_total_rejected_by_manifest');
  await assertDualLedgerCountDrift({...originalCounts,companies:2},
    'dual_corrupt_ledger_stage_rejected_by_manifest');

  await replaceIsolatedLedger({reconciliation:{
    ...originalReconciliation,
    result:{...originalReconciliation.result,atomic:false},
  }},'atomic outcome corruption');
  const nonAtomic=await read(owner.client,m);
  failIf(Boolean(nonAtomic.error)||nonAtomic.data!==null,
    'non_atomic_durable_import_outcome_denied');
  await replaceIsolatedLedger({reconciliation:originalReconciliation},
    'atomic outcome restoration');
  const restoredLedger=await read(owner.client,m);
  if(restoredLedger.error)throw restoredLedger.error;
  failIf(JSON.stringify(restoredLedger.data?.observedRows)!==JSON.stringify(rows)||
    restoredLedger.data?.job?.status!=='succeeded',
    'isolated_ledger_restoration_verified');

  const replay=await importProbe(owner.client,m);
  if(replay.error)throw replay.error;
  failIf(replay.data?.wasDuplicate!==true,'exact_import_replay_ledger');
  const replayRead=await read(owner.client,m);
  if(replayRead.error)throw replayRead.error;
  failIf(JSON.stringify(replayRead.data?.observedRows)!==JSON.stringify(rows),
    'readback_deterministic_after_replay');
  const replayComparison=await compare(owner.client,m);
  if(replayComparison.error)throw replayComparison.error;
  failIf(replayComparison.data?.allMatchedAtSnapshot!==true||
    replayComparison.data?.closureAuthorized!==false,
    'a3_exact_replay_yields_snapshot_equality_but_no_closure');

  const changed=clone(m);changed.items[0].normalizedFields.notes='forged';
  const changedRead=await read(owner.client,changed);
  failIf(Boolean(changedRead.error)||changedRead.data!==null,'forged_manifest_hash_denied');
  const changedComparison=await compare(owner.client,changed);
  failIf(Boolean(changedComparison.error)||changedComparison.data!==null,
    'a3_forged_manifest_cannot_attest');
  const badKey=await read(owner.client,{...m,idempotencyKey:'phase13_4_wrong_key'});
  failIf(Boolean(badKey.error)||badKey.data!==null,'wrong_idempotency_denied');
  const badKeyComparison=await compare(owner.client,{...m,idempotencyKey:'phase13_4_wrong_key'});
  failIf(Boolean(badKeyComparison.error)||badKeyComparison.data!==null,
    'a3_wrong_idempotency_cannot_attest');
  const badBatch=await read(owner.client,{...m,batchId:uuid()});
  failIf(Boolean(badBatch.error)||badBatch.data!==null,'wrong_batch_denied');
  const badBatchComparison=await compare(owner.client,{...m,batchId:uuid()});
  failIf(Boolean(badBatchComparison.error)||badBatchComparison.data!==null,
    'a3_wrong_batch_cannot_attest');

  const {error:deleteError}=await admin.from('transactions').delete().eq('id',p.ids.transactionId).eq('workspace_id',ws);
  if(deleteError)throw deleteError;
  const missingRow=await read(owner.client,m);
  if(missingRow.error)throw missingRow.error;
  failIf(missingRow.data?.observedRows?.length!==3||
    missingRow.data.observedRows[2]?.found!==false||
    missingRow.data.observedRows[2]?.record!==null||
    missingRow.data.observedRows[0]?.found!==true||
    missingRow.data.observedRows[1]?.found!==true,
    'missing_target_preserved_without_silent_repair');
  const {count,error:countError}=await admin.from('transactions')
    .select('id',{head:true,count:'exact'}).eq('id',p.ids.transactionId);
  if(countError)throw countError;
  failIf(count!==0,'readback_does_not_recreate_missing_target');
  failIf(missingRow.data?.reconciled!==false,'missing_target_never_attested_as_reconciled');
  const missingComparison=await compare(owner.client,m);
  if(missingComparison.error)throw missingComparison.error;
  failIf(missingComparison.data?.allMatchedAtSnapshot!==false||
    missingComparison.data?.mismatchCount!==1||
    JSON.stringify(missingComparison.data?.rows?.[2]?.differenceCodes)!=='["MISSING_TARGET"]'||
    missingComparison.data?.closureAuthorized!==false,
    'a3_missing_transaction_is_explicit_without_false_drift_or_closure');

  // After the isolated transaction is gone, remove its company and then contact.
  // Verify that a missing parent is represented independently for every stage.
  const {data:deletedCompany,error:deleteCompanyError}=await admin.from('companies')
    .delete().eq('id',p.ids.companyId).eq('workspace_id',ws).select('id');
  if(deleteCompanyError||deletedCompany?.length!==1)
    throw deleteCompanyError??new Error('isolated company removal did not delete exactly one row');
  const missingCompany=await read(owner.client,m);
  if(missingCompany.error)throw missingCompany.error;
  failIf(missingCompany.data?.observedRows?.length!==3||
    missingCompany.data.observedRows[0]?.found!==true||
    missingCompany.data.observedRows[1]?.found!==false||
    missingCompany.data.observedRows[1]?.record!==null||
    missingCompany.data.observedRows[2]?.found!==false||
    missingCompany.data?.reconciled!==false,
    'missing_company_and_transaction_preserved_without_repair');

  const {data:deletedContact,error:deleteContactError}=await admin.from('contacts')
    .delete().eq('id',p.ids.contactId).eq('workspace_id',ws).select('id');
  if(deleteContactError||deletedContact?.length!==1)
    throw deleteContactError??new Error('isolated contact removal did not delete exactly one row');
  const missingAll=await read(owner.client,m);
  if(missingAll.error)throw missingAll.error;
  failIf(missingAll.data?.observedRows?.length!==3||
    missingAll.data.observedRows.some((row,i)=>
      row.ordinal!==i+1||row.found!==false||row.record!==null||
      row.targetId!==m.items[i].targetId)||
    missingAll.data?.reconciled!==false||missingAll.data?.mutated!==false,
    'all_three_missing_targets_remain_explicit_and_never_recreated');
  const missingAllComparison=await compare(owner.client,m);
  if(missingAllComparison.error)throw missingAllComparison.error;
  failIf(missingAllComparison.data?.allMatchedAtSnapshot!==false||
    missingAllComparison.data?.mismatchCount!==3||
    missingAllComparison.data?.rows?.length!==3||
    missingAllComparison.data.rows.some(row=>
      JSON.stringify(row.differenceCodes)!=='["MISSING_TARGET"]')||
    missingAllComparison.data?.closureAuthorized!==false||
    missingAllComparison.data?.mutated!==false,
    'a3_all_three_missing_targets_never_close_or_repair');
}

async function cleanup(){
  let ok=true;
  for(const ws of [...pendingWorkspaces]){
    try{
      const {error}=await admin.from('workspaces').delete().eq('id',ws);
      if(error)throw error;
      pendingWorkspaces.delete(ws);
      evidence.cleanup.push({kind:'isolated_workspace',passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'isolated_workspace',passed:false,error:errText(e)})}
  }
  for(const user of users){
    try{
      if(user.token)await admin.auth.admin.signOut(user.token,'global').catch(()=>null);
      const {error}=await admin.auth.admin.deleteUser(user.id,false);
      if(error)throw error;
      evidence.cleanup.push({kind:'isolated_auth_user',passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'isolated_auth_user',passed:false,error:errText(e)})}
  }
  for(const ws of createdWorkspaces){
    try{
      const {data,error}=await admin.from('workspaces').select('id').eq('id',ws);
      if(error)throw error;
      if(data?.length)throw new Error('isolated workspace residue');
      for(const table of ['import_jobs','contacts','companies','transactions']){
        const {count,error:countError}=await admin.from(table)
          .select('id',{count:'exact',head:true}).eq('workspace_id',ws);
        if(countError)throw countError;
        if(count!==0)throw new Error('isolated '+table+' residue');
      }
      evidence.cleanup.push({kind:'workspace_and_related_rows_zero_residue',passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'workspace_and_related_rows_zero_residue',passed:false,error:errText(e)})}
  }
  for(const user of users){
    try{
      const {data,error}=await admin.auth.admin.getUserById(user.id);
      if(data?.user)throw new Error('isolated auth residue');
      if(!error)throw new Error('missing expected getUserById absence response');
      evidence.cleanup.push({kind:'auth_user_zero_residue',passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'auth_user_zero_residue',passed:false,error:errText(e)})}
  }
  try{
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listed.error)throw listed.error;
    if((listed.data?.users??[]).some(user=>user.user_metadata?.enjaz_test_marker===MARKER))
      throw new Error('phase13.4 marked auth user residue');
    evidence.cleanup.push({kind:'auth_marker_sweep_zero_residue',passed:true});
  }catch(e){
    ok=false;
    evidence.cleanup.push({kind:'auth_marker_sweep_zero_residue',passed:false,error:errText(e)});
  }
  evidence.cleanupPassed=ok;
}
let fatal=null;
try{await test()}catch(e){fatal=e;console.error(e)}
finally{
  await cleanup();
  await mkdir(DIR,{recursive:true});
  evidence.completedAt=new Date().toISOString();
  evidence.passed=!fatal&&evidence.cleanupPassed;
  if(fatal)evidence.failure=errText(fatal);
  await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
