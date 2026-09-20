import {createClient} from '@supabase/supabase-js';

// One-off recovery for failed J09 run #35538840184. Exact disposable lab,
// two marked synthetic users, one marked workspace. Never a production sweep.
const LAB='nqhgaukutkyvfumbtbtg',PROD='juzxriirhkuzviwnhkbd';
const MARKER='phase14_1_a2_j04_field_real_cloud';
const need=k=>{const v=process.env[k]?.trim();if(!v)throw Error('MISSING_'+k);return v;};
const url=need('SUPABASE_URL'),pub=need('SUPABASE_PUBLISHABLE_KEY'),secret=need('SUPABASE_SECRET_KEY');
if(url!=='https://'+LAB+'.supabase.co'||need('ENJAZ_A2_BRANCH_REF')!==LAB||
 process.env.PRODUCTION_PROJECT_REF!==PROD||
 process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||
 process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES'||
 process.env.ENJAZ_A2_RESIDUE_RECOVERY_CONFIRM!=='YES'||
 secret===pub||secret.startsWith('sb_publishable_'))throw Error('RECOVERY_TARGET_DENIED');
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const assert=(ok,code)=>{if(!ok)throw Error(code);};
const count=async(table)=>{
 const {count,error}=await admin.from(table).select('id',{count:'exact',head:true});
 if(error||!Number.isInteger(count))throw Error('RECOVERY_READ_DENIED_'+table);
 return count;
};
const baseline=await admin.auth.admin.listUsers({page:1,perPage:1000});
assert(!baseline.error&&Array.isArray(baseline.data?.users),'RECOVERY_AUTH_LIST_DENIED');
const users=baseline.data.users;
if(users.length===0){
 assert(await count('workspaces')===0&&await count('companies')===0&&
 await count('transactions')===0,'RECOVERY_UNEXPECTED_BUSINESS_WITHOUT_MARKED_AUTH');
 console.log('PASS_MARKED_RECOVERY_ALREADY_CLEAN');process.exit(0);
}
assert(users.length===2,'RECOVERY_UNEXPECTED_USER_POPULATION');
assert(users.every(u=>u.user_metadata?.enjaz_test_marker===MARKER&&
 ['owner','portal-client'].includes(u.user_metadata?.label)&&
 u.email?.startsWith('enjaz-a2-j03-')&&u.email?.endsWith('@example.com')),
 'RECOVERY_UNMARKED_USER_DENIED');
const owner=users.find(u=>u.user_metadata.label==='owner');
const client=users.find(u=>u.user_metadata.label==='portal-client');
assert(owner&&client&&owner.id!==client.id,'RECOVERY_WRONG_USER_PAIR');
const w=await admin.from('workspaces').select('id,owner_user_id').limit(3);
assert(!w.error&&w.data?.length===1&&w.data[0].owner_user_id===owner.id,
 'RECOVERY_UNEXPECTED_WORKSPACE_OWNER');
const ws=w.data[0].id;
const principals=await admin.from('client_portal_principals')
 .select('id,user_id,workspace_id').limit(3);
assert(!principals.error&&principals.data?.length===1&&
 principals.data[0].user_id===client.id&&principals.data[0].workspace_id===ws,
 'RECOVERY_UNEXPECTED_PORTAL_PRINCIPAL');
const bucket=await admin.storage.getBucket('enjaz-documents-private');
assert(!bucket.error&&bucket.data?.public===false,'RECOVERY_PRIVATE_BUCKET_MISSING');
assert(await count('client_portal_grants')===2&&
 await count('client_portal_resource_shares')===2&&
 await count('document_upload_sessions')===1&&
 await count('workspaces')===1&&await count('companies')===1&&
 await count('transactions')===1,'RECOVERY_UNEXPECTED_FIXTURE_SHAPE');
for(const table of ['companies','transactions','document_upload_sessions',
 'client_portal_grants','client_portal_resource_shares','client_portal_authority_events']){
 const {count:n,error}=await admin.from(table).select('id',{count:'exact',head:true})
  .neq('workspace_id',ws);
 assert(!error&&n===0,'RECOVERY_FOREIGN_WORKSPACE_DATA_'+table);
}
console.log('PASS_RECOVERY_EXACT_MARKED_LAB_GRAPH_VERIFIED');
const deletion=await admin.from('workspaces').delete().eq('id',ws)
 .eq('owner_user_id',owner.id).select('id');
if(deletion.error||deletion.data?.length!==1){
 const code=String(deletion.error?.code||'ZERO_DELETED').replace(/[^A-Z0-9]/gi,'').slice(0,20);
 const message=String(deletion.error?.message||'NO_MATCH');
 const constraint=message.match(/[a-z][a-z0-9_]+_(?:fkey|check)/i)?.[0]||'UNKNOWN_CONSTRAINT';
 console.error('RECOVERY_WORKSPACE_DELETE_BLOCKED',code,constraint);
 throw Error('RECOVERY_WORKSPACE_DELETE_BLOCKED_'+code+'_'+constraint);
}
console.log('PASS_MARKED_WORKSPACE_REMOVED');
for(const user of [client,owner]){
 const deleted=await admin.auth.admin.deleteUser(user.id,false);
 if(deleted.error){
  const code=String(deleted.error.code||'UNKNOWN').replace(/[^A-Z0-9]/gi,'').slice(0,20);
  throw Error('RECOVERY_MARKED_AUTH_DELETE_FAILED_'+code);
 }
}
const after=await admin.auth.admin.listUsers({page:1,perPage:1000});
assert(!after.error&&after.data?.users?.length===0,'RECOVERY_AUTH_RESIDUE');
for(const table of ['workspaces','companies','transactions','client_portal_principals',
 'client_portal_grants','client_portal_resource_shares','document_upload_sessions']){
 assert(await count(table)===0,'RECOVERY_POST_COUNT_NONZERO_'+table);
}
console.log('PASS_J09_MARKED_TEST_RESIDUE_ZERO');
