import {createClient} from '@supabase/supabase-js';
import {removeLinkedFixtureWorkspace} from './phase14-1-a2-linked-cleanup.mjs';

// Recover ONLY the single marked J10 failed-run fixture in the disposable lab.
// Re-run only after the read-only inventory/source guards establish the same exact marked shape.
// No workspace/user sweeps, unknown identities, production, or ambiguous shape.
const LAB='nqhgaukutkyvfumbtbtg',PROD='juzxriirhkuzviwnhkbd';
const MARKER='phase14_1_a2_j04_field_real_cloud';
const env=n=>{const v=process.env[n]?.trim();if(!v)throw Error('MISSING_'+n);return v;};
const url=env('SUPABASE_URL'),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(url!==`https://${LAB}.supabase.co`||env('ENJAZ_A2_BRANCH_REF')!==LAB||
  process.env.PRODUCTION_PROJECT_REF!==PROD||
  process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||
  process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES'||
  process.env.ENJAZ_A2_RESIDUE_RECOVERY_CONFIRM!=='YES'||
  pub===secret||secret.startsWith('sb_publishable_'))
  throw Error('RECOVERY_TARGET_DENIED');

const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const check=(condition,code)=>{if(!condition)throw Error(code);};
const count=async(table,ws=null)=>{
  let q=admin.from(table).select('*',{count:'exact',head:true});
  if(ws)q=q.eq('workspace_id',ws);
  const r=await q;
  if(r.error||!Number.isInteger(r.count))throw Error('RECOVERY_COUNT_DENIED_'+table);
  return r.count;
};
const tables=[
  'workspaces','companies','contacts','organization_members','transactions',
  'corporate_ownership_stakes','corporate_governance_events','corporate_registry_states',
  'corporate_ownership_states','corporate_beneficial_owners','corporate_authority_grants',
  'corporate_capital_events','corporate_resolutions',
  'client_portal_principals','client_portal_authority_events','client_portal_resource_shares',
  'client_portal_grants','document_upload_sessions','documents','document_versions','pdf_jobs',
  'document_drafts','field_assignments','field_visits','field_sync_receipts',
  'workflow_instances','workflow_transition_events','transaction_followups',
  'payments','payment_reversals','financial_ledger_entries','commercial_engagements',
  'engagement_contract_revisions','audit_events','workspace_memberships'
];

const auth=await admin.auth.admin.listUsers({page:1,perPage:1000});
check(!auth.error&&Array.isArray(auth.data?.users),'RECOVERY_AUTH_READ_DENIED');
const users=auth.data.users;
if(users.length===0){
  for(const table of tables)check((await count(table))===0,'RECOVERY_EMPTY_AUTH_NONEMPTY_'+table);
  console.log('PASS_RECOVERY_ALREADY_ZERO_RESIDUE');process.exit(0);
}
check(users.length===1,'RECOVERY_UNEXPECTED_USER_POPULATION');
const user=users[0];
check(user.user_metadata?.enjaz_test_marker===MARKER&&user.user_metadata?.label==='owner'&&
  /^enjaz-a2-j03-owner-[0-9a-f-]+@example\.com$/.test(user.email??''),
  'RECOVERY_UNMARKED_IDENTITY_DENIED');
const workspaces=await admin.from('workspaces').select('id,owner_user_id').limit(3);
check(!workspaces.error&&workspaces.data?.length===1&&
  workspaces.data[0].owner_user_id===user.id,'RECOVERY_EXACT_OWNER_WORKSPACE_DENIED');
const ws=workspaces.data[0].id;
// One-time J10 leaf repair has already deleted the three RESTRICT children
// under the strictly marked owner, without touching the workspace or Auth.
check((await count('companies'))===1&&(await count('companies',ws))===1&&
  (await count('corporate_governance_events'))===0&&
  (await count('corporate_resolutions'))===0&&
  (await count('corporate_registry_states'))===0,
  'RECOVERY_UNEXPECTED_J10_GRAPH');
for(const table of tables.filter(t=>t!=='workspaces')){
  check((await count(table))===(await count(table,ws)),
    'RECOVERY_FOREIGN_OR_UNSCOPED_ROWS_'+table);
}
console.log('PASS_RECOVERY_ONE_MARKED_OWNER_ONE_WORKSPACE_ALL_ROWS_SCOPED');

// The previously failed run uploaded no stored objects (independent read-only
// inventory). Recheck the exact workspace prefix before metadata removal.
const storage=await admin.storage.from('enjaz-documents-private').list(ws,{limit:100});
check(!storage.error&&Array.isArray(storage.data)&&storage.data.length===0,
  'RECOVERY_STORAGE_NONEMPTY_OR_UNVERIFIED');
await removeLinkedFixtureWorkspace({admin,url,userId:user.id,workspaceId:ws});
console.log('PASS_RECOVERY_SCOPED_WORKSPACE_REMOVED');
const deleted=await admin.auth.admin.deleteUser(user.id,false);
check(!deleted.error,'RECOVERY_MARKED_OWNER_AUTH_DELETE_DENIED');
const after=await admin.auth.admin.listUsers({page:1,perPage:1000});
check(!after.error&&after.data?.users?.length===0,'RECOVERY_AUTH_RESIDUE');
for(const table of tables)check((await count(table))===0,
  'RECOVERY_POST_DELETE_RESIDUE_'+table);
console.log('PASS_RECOVERY_EXACT_MARKED_LAB_ZERO_AUTH_AND_BUSINESS_RESIDUE');
