import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const PROJECT='juzxriirhkuzviwnhkbd';
const MARKER='phase13_4_a2_readback_real_cloud';
const DIR='artifacts/phase13-4-a2-real-cloud';
const OUT=DIR+'/evidence.json';
const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error('Missing '+name);return value};
const url=required('SUPABASE_URL').replace(/\/$/,'');
const pub=required('SUPABASE_PUBLISHABLE_KEY');
const secret=required('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES' || !url.endsWith(PROJECT+'.supabase.co') ||
   secret===pub || secret.startsWith('sb_publishable_')) throw new Error('13.4 A2 cloud safety guard');

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[],createdWorkspaces=new Set(),pendingWorkspaces=new Set();
const evidence={schema:'enjaz.phase13-4.a2.real-cloud.v1',projectRef:PROJECT,
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

  const anonymous=await read(make(),m);
  failIf(!anonymous.error,'anonymous_execution_denied',errText(anonymous.error));

  const outsider=await read(other.client,m);
  failIf(Boolean(outsider.error)||outsider.data!==null,'outsider_cannot_read_owner_ledger');
  const unrelated=await read(owner.client,{...m,workspaceId:foreignWs});
  failIf(Boolean(unrelated.error)||unrelated.data!==null,'owner_cannot_read_foreign_workspace');

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

  const replay=await importProbe(owner.client,m);
  if(replay.error)throw replay.error;
  failIf(replay.data?.wasDuplicate!==true,'exact_import_replay_ledger');
  const replayRead=await read(owner.client,m);
  if(replayRead.error)throw replayRead.error;
  failIf(JSON.stringify(replayRead.data?.observedRows)!==JSON.stringify(rows),
    'readback_deterministic_after_replay');

  const changed=clone(m);changed.items[0].normalizedFields.notes='forged';
  const changedRead=await read(owner.client,changed);
  failIf(Boolean(changedRead.error)||changedRead.data!==null,'forged_manifest_hash_denied');
  const badKey=await read(owner.client,{...m,idempotencyKey:'phase13_4_wrong_key'});
  failIf(Boolean(badKey.error)||badKey.data!==null,'wrong_idempotency_denied');
  const badBatch=await read(owner.client,{...m,batchId:uuid()});
  failIf(Boolean(badBatch.error)||badBatch.data!==null,'wrong_batch_denied');

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
