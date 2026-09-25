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
  ref===productionRef||url!==('https://'+ref+'.supabase.co')||secret===publishable||secret.startsWith('sb_publishable_'))
  throw new Error('A4_LIVE_ISOLATED_TARGET_DENIED');

const MARKER='phase14_2_a4_live_management';
const OUT='artifacts/phase14-2-a4-live/evidence.json';
const config={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,config);
const makeClient=()=>createClient(url,publishable,config);
const users=[];
const evidence={schema:'enjaz.phase14-2.a4.live-management.v1',projectRef:ref,productionProjectRef:productionRef,
  startedAt:new Date().toISOString(),completedAt:null,passed:false,cleanupPassed:false,checks:[],cleanup:[],
  databaseCredentialRecorded:false,secretMaterialRecorded:false};
const pass=name=>{evidence.checks.push({name,passed:true});console.log('PASS 14.2 A4 LIVE '+name)};
const ownerWorkspaces=async userId=>{
  const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);
  if(error)throw new Error('WORKSPACE_LOOKUP_DENIED');
  return data??[];
};
async function createUser(label){
  const email='enjaz-14-2-a4-live-'+label+'-'+randomUUID()+'@example.com';
  const password='Enjaz!14.2-A4Live-'+randomUUID()+'Aa9';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{enjaz_test_marker:MARKER,label}});
  if(error||!data?.user)throw new Error('AUTH_USER_CREATION_FAILED');
  const item={id:data.user.id,email,password,label,client:makeClient(),workspaceId:null};users.push(item);
  const signed=await item.client.auth.signInWithPassword({email,password});
  if(signed.error||!signed.data.session?.access_token)throw new Error('REAL_AUTH_LOGIN_FAILED');
  for(let attempt=0;attempt<40;attempt++){
    const found=await ownerWorkspaces(item.id);
    if(found.length===1){item.workspaceId=found[0].id;break}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!item.workspaceId)throw new Error('WORKSPACE_BOOTSTRAP_FAILED');
  pass(label+'_real_authentication');
  return item;
}
async function run(){
  const owner=await createUser('owner');
  const member=await createUser('member');
  const outsider=await createUser('outsider');
  const joined=await admin.from('organization_members').insert({workspace_id:owner.workspaceId,user_id:member.id,status:'active',created_by:owner.id}).select('workspace_id').single();
  if(joined.error)throw new Error('MEMBER_SETUP_FAILED');

  const ownerSnapshot=await owner.client.rpc('integration_management_snapshot_v1',{p_workspace_id:owner.workspaceId});
  if(ownerSnapshot.error||ownerSnapshot.data?.workspaceId!==owner.workspaceId)throw new Error('OWNER_SNAPSHOT_TRANSPORT_FAILED');
  pass('owner_real_jwt_snapshot_allowed');

  const memberSnapshot=await member.client.rpc('integration_management_snapshot_v1',{p_workspace_id:owner.workspaceId});
  if(!memberSnapshot.error)throw new Error('MEMBER_OWNER_RPC_ESCAPE');
  pass('member_real_jwt_owner_rpc_denied');

  const outsiderSnapshot=await outsider.client.rpc('integration_management_snapshot_v1',{p_workspace_id:owner.workspaceId});
  if(!outsiderSnapshot.error)throw new Error('OUTSIDER_OWNER_RPC_ESCAPE');
  pass('outsider_real_jwt_owner_rpc_denied');

  const sql=spawnSync('psql',[
    databaseUrl,'--set=ON_ERROR_STOP=1',
    '--set=owner_user_id='+owner.id,
    '--set=member_user_id='+member.id,
    '--set=outsider_user_id='+outsider.id,
    '--set=owner_workspace_id='+owner.workspaceId,
    '--set=run_marker='+MARKER+'_'+randomUUID().replaceAll('-',''),
    '--file=tests/fixtures/phase14-2-a4-live-management-postgres.sql'
  ],{encoding:'utf8',env:{...process.env,PGCONNECT_TIMEOUT:'15'}});
  const output=(sql.stdout??'')+'\n'+(sql.stderr??'');
  for(const match of output.matchAll(/PASS 14\.2 A4 LIVE [^\r\n]+/g))console.log(match[0]);
  if(sql.status!==0){
    console.error('A4_LIVE_POSTGRES_FAILURE_TAIL',output.slice(-6000));
    throw new Error('A4_LIVE_POSTGRES_CERTIFICATE_FAILED');
  }
  const sqlPasses=(output.match(/PASS 14\.2 A4 LIVE/g)??[]).length;
  if(sqlPasses!==7)throw new Error('A4_LIVE_POSTGRES_PASS_INVENTORY_MISMATCH_'+sqlPasses);
  evidence.checks.push({name:'transactional_owner_management_certificate',passed:true,assertionCount:sqlPasses});
}
async function cleanup(){
  let clean=true;
  for(const user of users){
    try{
      const spaces=await ownerWorkspaces(user.id);
      for(const space of spaces){
        const removed=await admin.from('workspaces').delete().eq('id',space.id).eq('owner_user_id',user.id).select('id');
        if(removed.error||removed.data?.length!==1)throw new Error('WORKSPACE_DELETE_FAILED');
      }
      evidence.cleanup.push({kind:'marked_workspace',passed:true});
    }catch{clean=false;evidence.cleanup.push({kind:'marked_workspace',passed:false})}
  }
  for(const user of users){
    try{const {error}=await admin.auth.admin.deleteUser(user.id,false);if(error)throw error;evidence.cleanup.push({kind:'marked_auth_user',passed:true});}
    catch{clean=false;evidence.cleanup.push({kind:'marked_auth_user',passed:false})}
  }
  try{
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listed.error||listed.data?.users?.some(user=>user.user_metadata?.enjaz_test_marker===MARKER))throw new Error('AUTH_RESIDUE_FOUND');
    evidence.cleanup.push({kind:'marker_residue_sweep',passed:true});
  }catch{clean=false;evidence.cleanup.push({kind:'marker_residue_sweep',passed:false})}
  evidence.cleanupPassed=clean;
}
let failure=null;
try{await run()}catch(error){failure=String(error?.message??'UNKNOWN').slice(0,160);console.error('A4_LIVE_HOSTED_TEST_FAILED',failure)}
finally{
  await cleanup();
  evidence.completedAt=new Date().toISOString();
  evidence.passed=failure===null&&evidence.cleanupPassed;
  if(failure)evidence.failureCode=failure;
  await mkdir('artifacts/phase14-2-a4-live',{recursive:true});
  await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n');
}
if(!evidence.passed)process.exitCode=1;
