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
  throw new Error('A3_ISOLATED_TARGET_DENIED');

const MARKER='phase14_2_a3_hosted_auth_rls';
const OUT='artifacts/phase14-2-a3/evidence.json';
const config={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
const admin=createClient(url,secret,config);
const client=()=>createClient(url,publishable,config);
const users=[];
const evidence={schema:'enjaz.phase14-2.a3.hosted-auth-rls.v1',projectRef:ref,productionProjectRef:productionRef,
  startedAt:new Date().toISOString(),completedAt:null,passed:false,cleanupPassed:false,checks:[],cleanup:[],
  databaseCredentialRecorded:false,secretMaterialRecorded:false,securityAdvisorsReviewed:false};
const pass=name=>{evidence.checks.push({name,passed:true});console.log('PASS 14.2 A3 '+name)};
const ownerWorkspaces=async userId=>{
  const {data,error}=await admin.from('workspaces').select('id').eq('owner_user_id',userId).limit(2);
  if(error)throw new Error('WORKSPACE_LOOKUP_DENIED');
  return data??[];
};
async function createUser(label){
  const email=`enjaz-14-2-a3-${label}-${randomUUID()}@example.com`;
  const password='Enjaz!14.2-'+randomUUID()+'Aa9';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,
    user_metadata:{enjaz_test_marker:MARKER,label}});
  if(error||!data?.user)throw new Error('AUTH_USER_CREATION_FAILED');
  const item={id:data.user.id,email,password,label,client:client(),workspaceId:null};users.push(item);
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
  if(new Set([owner.workspaceId,member.workspaceId,outsider.workspaceId]).size!==3)
    throw new Error('INDEPENDENT_WORKSPACES_REQUIRED');
  const joined=await admin.from('organization_members')
    .insert({workspace_id:owner.workspaceId,user_id:member.id,status:'active',created_by:owner.id})
    .select('workspace_id,user_id,status').single();
  if(joined.error||joined.data?.status!=='active')throw new Error('MEMBER_SETUP_FAILED');
  const ownMembership=await owner.client.from('workspace_memberships')
    .select('workspace_id,role').eq('workspace_id',owner.workspaceId).eq('user_id',owner.id).single();
  const memberMembership=await member.client.from('organization_members')
    .select('workspace_id,status').eq('workspace_id',owner.workspaceId).eq('user_id',member.id).single();
  if(ownMembership.error||ownMembership.data?.role!=='owner'||memberMembership.error||memberMembership.data?.status!=='active')
    throw new Error('AUTHENTICATED_MEMBERSHIP_READ_FAILED');
  pass('same_workspace_authorized_membership_access');

  const sql=spawnSync('psql',[
    databaseUrl,'--set=ON_ERROR_STOP=1',`--set=owner_user_id=${owner.id}`,
    `--set=member_user_id=${member.id}`,`--set=outsider_user_id=${outsider.id}`,
    `--set=owner_workspace_id=${owner.workspaceId}`,`--set=outsider_workspace_id=${outsider.workspaceId}`,
    `--set=run_marker=${MARKER}_${randomUUID().replaceAll('-','')}`,
    '--file=tests/fixtures/phase14-2-a3-hosted-postgres.sql'
  ],{encoding:'utf8',env:{...process.env,PGCONNECT_TIMEOUT:'15'}});
  const output=(sql.stdout??'')+'\n'+(sql.stderr??'');
  for(const match of output.matchAll(/PASS 14\.2 A3 [^\r\n]+/g)) console.log(match[0]);
  if(sql.status!==0)throw new Error('HOSTED_POSTGRES_CERTIFICATE_FAILED');
  const sqlPasses=(output.match(/PASS 14\.2 A3/g)??[]).length;
  if(sqlPasses!==10)throw new Error('HOSTED_POSTGRES_PASS_INVENTORY_MISMATCH');
  evidence.checks.push({name:'hosted_postgres_transactional_certificate',passed:true,assertionCount:sqlPasses});
}
async function cleanup(){
  let clean=true;
  for(const user of users){
    try{
      const spaces=await ownerWorkspaces(user.id);
      if(spaces.length>1)throw new Error('AMBIGUOUS_TEST_WORKSPACE');
      for(const space of spaces){
        const removed=await admin.from('workspaces').delete().eq('id',space.id).eq('owner_user_id',user.id).select('id');
        if(removed.error||removed.data?.length!==1)throw new Error('WORKSPACE_DELETE_FAILED');
      }
      evidence.cleanup.push({kind:'marked_workspace',passed:true});
    }catch{clean=false;evidence.cleanup.push({kind:'marked_workspace',passed:false})}
  }
  for(const user of users){
    try{const {error}=await admin.auth.admin.deleteUser(user.id,false);if(error)throw error;
      evidence.cleanup.push({kind:'marked_auth_user',passed:true});
    }catch{clean=false;evidence.cleanup.push({kind:'marked_auth_user',passed:false})}
  }
  try{
    const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if(listed.error||listed.data?.users?.some(user=>user.user_metadata?.enjaz_test_marker===MARKER))
      throw new Error('AUTH_RESIDUE_FOUND');
    evidence.cleanup.push({kind:'marker_residue_sweep',passed:true});
  }catch{clean=false;evidence.cleanup.push({kind:'marker_residue_sweep',passed:false})}
  evidence.cleanupPassed=clean;
}
let failure=null;
try{await run()}catch(error){failure=String(error?.message??'UNKNOWN').slice(0,120);console.error('A3_HOSTED_TEST_FAILED',failure)}
finally{
  await cleanup();evidence.completedAt=new Date().toISOString();evidence.passed=failure===null&&evidence.cleanupPassed;
  if(failure)evidence.failureCode=failure;
  await mkdir('artifacts/phase14-2-a3',{recursive:true});await writeFile(OUT,JSON.stringify(evidence,null,2)+'\n');
}
if(!evidence.passed)process.exitCode=1;
