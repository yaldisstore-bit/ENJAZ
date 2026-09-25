import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error('MISSING_'+name);return value};
const ref=required('ENJAZ_A3_BRANCH_REF');
const productionRef=required('PRODUCTION_PROJECT_REF');
const url=required('SUPABASE_URL').replace(/\/$/,'');
const publishable=required('SUPABASE_PUBLISHABLE_KEY');
const secret=required('SUPABASE_SECRET_KEY');
const databaseUrl=required('SUPABASE_DB_URL');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||process.env.ENJAZ_A3_ISOLATED_BRANCH_CONFIRM!=='YES'||
  ref===productionRef||url!==`https://${ref}.supabase.co`||secret===publishable||secret.startsWith('sb_publishable_'))
  throw new Error('A4_ISOLATED_TARGET_DENIED');

const MARKER='phase14_2_a4_webhook_hosted';
const OUT='artifacts/phase14-2-a4/evidence.json';
const config={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,config);
const client=createClient(url,publishable,config);
let user=null,workspaceId=null;
const evidence={schema:'enjaz.phase14-2.a4.webhook-hosted.v1',projectRef:ref,productionProjectRef:productionRef,
  startedAt:new Date().toISOString(),completedAt:null,passed:false,cleanupPassed:false,checks:[],cleanup:[],
  databaseCredentialRecorded:false,secretMaterialRecorded:false,vaultUsed:true};
const pass=name=>{evidence.checks.push({name,passed:true});console.log('PASS 14.2 A4 '+name)};

async function run(){
  const email=`enjaz-14-2-a4-${randomUUID()}@example.com`;
  const password='Enjaz!14.2-A4-'+randomUUID()+'Aa9';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER}});
  if(created.error||!created.data?.user)throw new Error('AUTH_USER_CREATION_FAILED');
  user=created.data.user;
  const signed=await client.auth.signInWithPassword({email,password});
  if(signed.error||!signed.data.session?.access_token)throw new Error('REAL_AUTH_LOGIN_FAILED');

  for(let attempt=0;attempt<40;attempt++){
    const found=await admin.from('workspaces').select('id').eq('owner_user_id',user.id).limit(2);
    if(found.error)throw new Error('WORKSPACE_LOOKUP_DENIED');
    if(found.data?.length===1){workspaceId=found.data[0].id;break}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!workspaceId)throw new Error('WORKSPACE_BOOTSTRAP_FAILED');
  pass('real_auth_and_workspace_bootstrap');

  const sql=spawnSync('psql',[
    databaseUrl,'--set=ON_ERROR_STOP=1',
    `--set=owner_user_id=${user.id}`,
    `--set=owner_workspace_id=${workspaceId}`,
    `--set=run_marker=${MARKER}_${randomUUID().replaceAll('-','')}`,
    '--file=tests/fixtures/phase14-2-a4-webhook-hosted-postgres.sql'
  ],{encoding:'utf8',env:{...process.env,PGCONNECT_TIMEOUT:'15'}});
  const output=(sql.stdout??'')+'\n'+(sql.stderr??'');
  for(const match of output.matchAll(/PASS 14\.2 A4 [^\r\n]+/g)) console.log(match[0]);
  if(sql.status!==0){
    const sanitized=output
      .replaceAll('A4-hosted-signing-secret-0123456789-abcdefghijklmnopqrstuvwxyz','[REDACTED_TEST_SECRET]')
      .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[REDACTED_SUPABASE_KEY]');
    console.error('A4_HOSTED_POSTGRES_FAILURE_TAIL',sanitized.slice(-6000));
    throw new Error('A4_HOSTED_POSTGRES_CERTIFICATE_FAILED');
  }
  const sqlPasses=(output.match(/PASS 14\.2 A4/g)??[]).length;
  if(sqlPasses!==10)throw new Error(`A4_HOSTED_PASS_INVENTORY_MISMATCH_${sqlPasses}`);
  evidence.checks.push({name:'vault_outbox_delivery_certificate',passed:true,assertionCount:sqlPasses});
}

async function cleanup(){
  let clean=true;
  try{
    if(workspaceId&&user){
      const removed=await admin.from('workspaces').delete().eq('id',workspaceId).eq('owner_user_id',user.id).select('id');
      if(removed.error||removed.data?.length!==1)throw new Error('WORKSPACE_DELETE_FAILED');
    }
    evidence.cleanup.push({kind:'marked_workspace',passed:true});
  }catch{clean=false;evidence.cleanup.push({kind:'marked_workspace',passed:false})}
  try{
    if(user){const deleted=await admin.auth.admin.deleteUser(user.id,false);if(deleted.error)throw deleted.error}
    evidence.cleanup.push({kind:'marked_auth_user',passed:true});
  }catch{clean=false;evidence.cleanup.push({kind:'marked_auth_user',passed:false})}
  try{
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listed.error||listed.data?.users?.some(item=>item.user_metadata?.enjaz_test_marker===MARKER))
      throw new Error('AUTH_RESIDUE_FOUND');
    evidence.cleanup.push({kind:'marker_residue_sweep',passed:true});
  }catch{clean=false;evidence.cleanup.push({kind:'marker_residue_sweep',passed:false})}
  evidence.cleanupPassed=clean;
}

let failure=null;
try{await run()}catch(error){failure=String(error?.message??'UNKNOWN').slice(0,160);console.error('A4_HOSTED_TEST_FAILED',failure)}
finally{
  await cleanup();evidence.completedAt=new Date().toISOString();evidence.passed=failure===null&&evidence.cleanupPassed;
  if(failure)evidence.failureCode=failure;
  await mkdir('artifacts/phase14-2-a4',{recursive:true});
  await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n');
}
if(!evidence.passed)process.exitCode=1;
