import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import crypto from 'node:crypto';

const REF='juzxriirhkuzviwnhkbd';
const MARKER='phase13_3_ordered_import_real_cloud';
const DIR='artifacts/phase13-3-real-cloud';
const OUT=`${DIR}/evidence.json`;
const env=n=>{const v=process.env[n]?.trim();if(!v)throw new Error(`Missing ${n}`);return v};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const pub=env('SUPABASE_PUBLISHABLE_KEY');
const secret=env('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||!url.includes(REF)||secret===pub||secret.startsWith('sb_publishable_')){
  throw new Error('Real Cloud safety guard failed');
}

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const make=()=>createClient(url,pub,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[];
const workspaces=new Set();
const evidence={
  schema:'enjaz.phase13-3.real-cloud.v1',
  projectRef:REF,
  startedAt:new Date().toISOString(),
  completedAt:null,
  passed:false,
  checks:[],
  rollbackAttempts:[],
  cleanup:[],
  cleanupPassed:false,
};
let fatal=null;
const uuid=()=>crypto.randomUUID();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pass=(name,detail=null)=>{evidence.checks.push({name,passed:true,...(detail?{detail}:{})});console.log(`PASS 13.3 ${name}${detail?` — ${detail}`:''}`)};
const assert=(v,name,detail=null)=>{if(!v)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);pass(name,detail)};
const errText=e=>[e?.message,e?.details,e?.hint,e?.code].filter(Boolean).join(' | ');

async function createUser(label){
  const email=`enjaz-133-${label}-${Date.now()}-${uuid().slice(0,8)}@example.com`;
  const password=`EnjAZ!13.3-${uuid()}Aa9`;
  const {data,error}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER,label}
  });
  if(error||!data.user)throw error??new Error('createUser failed');
  const x={id:data.user.id,email,password,label,client:make(),token:null,workspaceId:null};
  users.push(x);
  return x;
}
async function signIn(x){
  const {data,error}=await x.client.auth.signInWithPassword({email:x.email,password:x.password});
  if(error||!data.session?.access_token)throw error??new Error('signIn failed');
  x.token=data.session.access_token;
  return x;
}
async function workspace(x){
  for(let i=0;i<60;i++){
    const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',x.id).limit(2);
    if(error)throw error;
    if(data?.length===1){
      x.workspaceId=data[0].id;
      workspaces.add(data[0].id);
      return data[0].id;
    }
    await sleep(250);
  }
  throw new Error('workspace bootstrap timeout');
}
const item=(ordinal,stage,sourceKey,targetTable,targetId,normalizedFields)=>({
  ordinal,stage,sourceKey,targetTable,targetId,normalizedFields,writeAllowed:false
});
const relation=(sourceKey,targetKey,targetField,sourceTargetId,targetTargetId,sourceTargetTable,targetTargetTable)=>({
  sourceKey,targetKey,targetField,sourceTargetId,targetTargetId,sourceTargetTable,targetTargetTable,
  assignmentPerformed:false,writeAllowed:false
});
function manifest({workspaceId,batchId,idempotencyKey,items,relationshipBindings=[],snapshotId='snapshot-13-3',mappingPlanId='mapping-plan-13-3'}){
  return {
    schema:'enjaz.legacy.ordered-import.execution-manifest.v1',
    snapshotId,mappingPlanId,workspaceId,batchId,idempotencyKey,
    stageOrder:['contacts','companies','transactions'],
    items,relationshipBindings,
    deterministic:true,
    workspacePermissionVerified:false,
    idempotencyBound:true,
    idempotencyEnforcementPerformed:false,
    targetIdsGenerated:false,
    foreignKeyBindingPerformed:true,
    foreignKeyAssignmentPerformed:false,
    persistencePerformed:false,
    importExecutionAllowed:false,
    targetMutationPerformed:false,
    readyForA3ExecutionBoundary:true,
  };
}
async function call(client,m){
  return client.rpc('execute_legacy_ordered_import_v1',{
    p_workspace_id:m.workspaceId,
    p_batch_id:m.batchId,
    p_idempotency_key:m.idempotencyKey,
    p_manifest:m,
  });
}
async function count(table,workspaceId,legacySource='phase13.3'){
  const {count,error}=await admin.from(table).select('id',{head:true,count:'exact'})
    .eq('workspace_id',workspaceId).eq('legacy_source',legacySource);
  if(error)throw error;
  return count??0;
}
async function jobCount(workspaceId){
  const {count,error}=await admin.from('import_jobs').select('id',{head:true,count:'exact'})
    .eq('workspace_id',workspaceId).filter('counts->>contract','eq','phase13.3');
  if(error)throw error;
  return count??0;
}
async function deleteWorkspace(workspaceId){
  const {error}=await admin.from('workspaces').delete().eq('id',workspaceId);
  if(error)throw error;
  workspaces.delete(workspaceId);
}
function simpleManifest(workspaceId){
  const contactId=uuid(),companyId=uuid(),transactionId=uuid(),batchId=uuid();
  const cKey='contact:001',coKey='company:001',tKey='transaction:001';
  return {
    ids:{contactId,companyId,transactionId,batchId},
    value:manifest({
      workspaceId,batchId,idempotencyKey:`phase13_3_${uuid().replaceAll('-','')}`,
      items:[
        item(1,1,cKey,'contacts',contactId,{display_name:'Phase 13.3 Client',contact_type:'client',phone:null,email:null,notes:'real cloud'}),
        item(2,2,coKey,'companies',companyId,{legal_name:'Phase 13.3 Company',display_name:'P13.3',capital:100000,address:'Baghdad',activities:'test',registration_number:null,legal_status:null}),
        item(3,3,tKey,'transactions',transactionId,{type:'legacy_import_probe',department:'qa',current_fee:100}),
      ],
      relationshipBindings:[
        relation(coKey,cKey,'primary_contact_id',companyId,contactId,'companies','contacts'),
        relation(tKey,coKey,'company_id',transactionId,companyId,'transactions','companies'),
        relation(tKey,cKey,'primary_contact_id',transactionId,contactId,'transactions','contacts'),
      ],
    })
  };
}
function largeRollbackManifest(workspaceId,countContacts=3999){
  const items=[];
  for(let i=0;i<countContacts;i++){
    const n=String(i).padStart(4,'0');
    items.push(item(i+1,1,`contact:race:${n}`,'contacts',uuid(),{display_name:`Race Contact ${n}`,contact_type:'other'}));
  }
  const companyId=uuid();
  items.push(item(countContacts+1,2,'company:race:last','companies',companyId,{legal_name:'Race Conflict Company'}));
  return {
    companyId,
    value:manifest({
      workspaceId,
      batchId:uuid(),
      idempotencyKey:`phase13_3_race_${uuid().replaceAll('-','')}`,
      snapshotId:'snapshot-13-3-atomicity',
      mappingPlanId:'mapping-plan-13-3-atomicity',
      items,
    })
  };
}

async function verifyAtomicRollback(){
  // First measure a similarly-sized successful batch so the collision can be injected during the write phase.
  const benchmark=await signIn(await createUser('rollback-benchmark'));
  const benchmarkWs=await workspace(benchmark);
  const bench=largeRollbackManifest(benchmarkWs);
  const started=Date.now();
  const benchResult=await call(benchmark.client,bench.value);
  const duration=Date.now()-started;
  assert(!benchResult.error&&benchResult.data?.counts?.total===4000,'rollback_benchmark_committed',`${duration}ms`);
  await deleteWorkspace(benchmarkWs);

  let delay=Math.max(100,Math.min(3000,Math.round(duration*0.45)));
  for(let attempt=1;attempt<=4;attempt++){
    const actor=await signIn(await createUser(`rollback-${attempt}`));
    const ws=await workspace(actor);
    const probe=largeRollbackManifest(ws);
    const rpcPromise=call(actor.client,probe.value);
    await sleep(delay);
    const injected=await admin.from('companies').insert({
      id:probe.companyId,workspace_id:ws,legal_name:'Concurrent blocker',status:'active',
      legacy_id:`rollback-blocker-${attempt}`,legacy_source:'phase13.3-rollback-race'
    });
    const result=await rpcPromise;
    const text=errText(result.error);
    const rowCount=await count('contacts',ws);
    const jobs=await jobCount(ws);
    const lateConflict=Boolean(result.error)&&!text.includes('ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS')&&/duplicate key|unique constraint/i.test(text);
    evidence.rollbackAttempts.push({
      attempt,delayMs:delay,
      injectedSucceeded:!injected.error,
      rpcSucceeded:!result.error,
      error:text||null,
      importedContactCount:rowCount,
      importJobCount:jobs,
      lateConflict,
    });

    if(lateConflict&&rowCount===0&&jobs===0){
      pass('atomic_rollback_after_late_company_conflict',`attempt ${attempt}, delay ${delay}ms`);
      await deleteWorkspace(ws);
      return;
    }

    // Clean this isolated attempt and adapt the race window.
    await deleteWorkspace(ws);
    if(result.error&&text.includes('ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS')) delay=Math.min(3500,Math.round(delay*1.55));
    else if(!result.error||injected.error) delay=Math.max(40,Math.round(delay*0.62));
    else delay=Math.max(40,Math.round(delay*0.8));
  }
  throw new Error('ASSERTION_FAILED:atomic_rollback_race_not_observed');
}

async function run(){
  const owner=await signIn(await createUser('owner'));
  const outsider=await signIn(await createUser('outsider'));
  const ws=await workspace(owner);
  const other=await workspace(outsider);
  assert(ws!==other,'fresh_workspace_isolation');

  const anon=make();
  const anonProbe=simpleManifest(ws).value;
  const anonResult=await call(anon,anonProbe);
  assert(Boolean(anonResult.error),'anonymous_rpc_denied',errText(anonResult.error));

  const foreignProbe=simpleManifest(ws).value;
  const foreign=await call(outsider.client,foreignProbe);
  assert(Boolean(foreign.error)&&errText(foreign.error).includes('ENJAZ_LEGACY_IMPORT_WORKSPACE_FORBIDDEN'),'cross_workspace_owner_denied',errText(foreign.error));
  assert(await count('contacts',ws)===0&&await count('companies',ws)===0&&await count('transactions',ws)===0&&await jobCount(ws)===0,'cross_workspace_zero_mutation');

  const valid=simpleManifest(ws);
  const first=await call(owner.client,valid.value);
  if(first.error)throw first.error;
  assert(first.data?.schema==='enjaz.legacy.ordered-import.execution-result.v1','execution_result_schema');
  assert(first.data?.wasDuplicate===false&&first.data?.atomic===true,'first_execution_atomic');
  assert(first.data?.workspacePermissionVerified===true&&first.data?.serverIdempotencyEnforced===true,'server_permission_and_idempotency_verified');
  assert(first.data?.targetIdsGenerated===false&&first.data?.foreignKeyAssignmentPerformed===true,'caller_ids_and_fk_assignment_contract');
  assert(first.data?.persistencePerformed===true&&first.data?.importExecutionAllowed===true&&first.data?.targetMutationPerformed===true,'write_authority_only_at_certified_server_boundary');
  assert(first.data?.counts?.total===3&&first.data?.counts?.contacts===1&&first.data?.counts?.companies===1&&first.data?.counts?.transactions===1,'ordered_import_counts');

  const [contactRows,companyRows,transactionRows,jobsAfterFirst]=await Promise.all([
    admin.from('contacts').select('id,legacy_id,legacy_source').eq('workspace_id',ws).eq('legacy_source','phase13.3'),
    admin.from('companies').select('id,primary_contact_id,legacy_id,legacy_source').eq('workspace_id',ws).eq('legacy_source','phase13.3'),
    admin.from('transactions').select('id,company_id,primary_contact_id,legacy_id,legacy_source').eq('workspace_id',ws).eq('legacy_source','phase13.3'),
    admin.from('import_jobs').select('id,status,counts,reconciliation').eq('workspace_id',ws).filter('counts->>contract','eq','phase13.3'),
  ]);
  for(const x of [contactRows,companyRows,transactionRows,jobsAfterFirst])if(x.error)throw x.error;
  assert(contactRows.data?.length===1&&companyRows.data?.length===1&&transactionRows.data?.length===1&&jobsAfterFirst.data?.length===1,'durable_rows_and_import_ledger');
  assert(companyRows.data[0].primary_contact_id===valid.ids.contactId,'company_contact_fk_bound');
  assert(transactionRows.data[0].company_id===valid.ids.companyId&&transactionRows.data[0].primary_contact_id===valid.ids.contactId,'transaction_relationships_bound');

  const replay=await call(owner.client,valid.value);
  if(replay.error)throw replay.error;
  assert(replay.data?.wasDuplicate===true&&replay.data?.batchId===valid.ids.batchId,'exact_replay_returns_existing_result');
  assert(await count('contacts',ws)===1&&await count('companies',ws)===1&&await count('transactions',ws)===1&&await jobCount(ws)===1,'exact_replay_no_duplicate_rows');

  const changed=structuredClone(valid.value);
  changed.items[0].normalizedFields.notes='changed payload must conflict';
  const changedResult=await call(owner.client,changed);
  assert(Boolean(changedResult.error)&&errText(changedResult.error).includes('ENJAZ_LEGACY_IMPORT_IDEMPOTENCY_CONFLICT'),'changed_payload_replay_conflict',errText(changedResult.error));
  assert(await count('contacts',ws)===1&&await jobCount(ws)===1,'changed_replay_zero_new_mutation');

  const collision=structuredClone(valid.value);
  collision.batchId=uuid();collision.idempotencyKey=`phase13_3_collision_${uuid().replaceAll('-','')}`;
  const collisionResult=await call(owner.client,collision);
  assert(Boolean(collisionResult.error)&&errText(collisionResult.error).includes('ENJAZ_LEGACY_IMPORT_TARGET_ALREADY_EXISTS'),'existing_target_collision_fails_closed',errText(collisionResult.error));

  const sourceCollision=simpleManifest(ws).value;
  sourceCollision.items[0].sourceKey=valid.value.items[0].sourceKey;
  const sourceCollisionResult=await call(owner.client,sourceCollision);
  assert(Boolean(sourceCollisionResult.error)&&errText(sourceCollisionResult.error).includes('ENJAZ_LEGACY_IMPORT_SOURCE_ALREADY_IMPORTED'),'existing_source_collision_fails_closed',errText(sourceCollisionResult.error));

  await verifyAtomicRollback();

  pass('real_authenticated_ordered_import_boundary');
}

async function cleanup(){
  let ok=true;
  for(const ws of [...workspaces]){
    try{
      const {error}=await admin.from('workspaces').delete().eq('id',ws);
      if(error)throw error;
      evidence.cleanup.push({kind:'workspace',id:ws,passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'workspace',id:ws,passed:false,error:String(e)})}
  }
  for(const u of users){
    try{
      if(u.token)await admin.auth.admin.signOut(u.token,'global').catch(()=>null);
      const {error}=await admin.auth.admin.deleteUser(u.id,false);
      if(error)throw error;
      evidence.cleanup.push({kind:'auth_user',id:u.id,passed:true});
    }catch(e){ok=false;evidence.cleanup.push({kind:'auth_user',id:u.id,passed:false,error:String(e)})}
  }
  try{
    const ids=[...workspaces];
    if(ids.length){
      const {data,error}=await admin.from('workspaces').select('id').in('id',ids);
      if(error)throw error;
      if(data?.length)throw new Error('workspace residue');
    }
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listed.error)throw listed.error;
    if((listed.data?.users??[]).some(u=>u.user_metadata?.enjaz_test_marker===MARKER))throw new Error('auth residue');
    evidence.cleanup.push({kind:'zero_workspace_auth_residue',passed:true});
  }catch(e){ok=false;evidence.cleanup.push({kind:'zero_workspace_auth_residue',passed:false,error:String(e)})}
  evidence.cleanupPassed=ok;
}
async function save(){
  await mkdir(DIR,{recursive:true});
  evidence.completedAt=new Date().toISOString();
  evidence.passed=!fatal&&evidence.cleanupPassed;
  if(fatal)evidence.failure=fatal instanceof Error?fatal.message:String(fatal);
  await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n','utf8');
}

try{await run()}catch(e){fatal=e;console.error(e)}finally{await cleanup();await save()}
if(fatal||!evidence.cleanupPassed)process.exitCode=1;
