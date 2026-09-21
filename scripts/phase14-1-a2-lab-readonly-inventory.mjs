import {createClient} from '@supabase/supabase-js';

// Strictly READ-ONLY isolated-lab inventory. No creation/deletion or mutation,
// and no identity, email, JWT, row body or URL is emitted to CI logs.
const LAB='nqhgaukutkyvfumbtbtg',PROD='juzxriirhkuzviwnhkbd';
const MARKER='phase14_1_a2_j04_field_real_cloud';
const env=n=>{const v=process.env[n]?.trim();if(!v)throw Error('MISSING_'+n);return v;};
const url=env('SUPABASE_URL'),pub=env('SUPABASE_PUBLISHABLE_KEY'),secret=env('SUPABASE_SECRET_KEY');
if(url!==`https://${LAB}.supabase.co`||env('ENJAZ_A2_BRANCH_REF')!==LAB||
  process.env.PRODUCTION_PROJECT_REF!==PROD||
  process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES'||
  process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM!=='YES'||
  pub===secret||secret.startsWith('sb_publishable_'))throw Error('LAB_INVENTORY_TARGET_DENIED');
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
if(listed.error||!Array.isArray(listed.data?.users))throw Error('LAB_INVENTORY_AUTH_READ_DENIED');
const users=listed.data.users;
if(users.length>=1000)throw Error('LAB_INVENTORY_AUTH_PAGINATION_UNSAFE');
const allowed=new Set(['owner','outsider','portal-client','member']);
const marked=users.filter(u=>u.user_metadata?.enjaz_test_marker===MARKER);
const unmarked=users.filter(u=>u.user_metadata?.enjaz_test_marker!==MARKER);
const identitiesSafe=marked.every(u=>allowed.has(u.user_metadata?.label)&&
  /^enjaz-a2-j03-[a-z-]+-[0-9a-f-]+@example\.com$/.test(u.email??''));
const tables=['workspaces','companies','contacts','organization_members','transactions',
  'corporate_governance_events','corporate_ownership_stakes','corporate_registry_states',
  'corporate_ownership_states','corporate_resolutions','corporate_capital_events',
  'corporate_beneficial_owners','corporate_authority_grants',
  'client_portal_authority_events','client_portal_resource_shares','client_portal_grants',
  'client_portal_principals','document_upload_sessions','documents','payments',
  'transaction_followups','commercial_engagements','engagement_contract_revisions'];
const counts={};
for(const table of tables){
  const {count,error}=await admin.from(table).select('id',{count:'exact',head:true});
  if(error||!Number.isInteger(count))throw Error('LAB_INVENTORY_COUNT_UNAVAILABLE_'+table);
  counts[table]=count;
}
const owned=await admin.from('workspaces').select('id,owner_user_id').limit(100);
if(owned.error||!Array.isArray(owned.data)||owned.data.length!==counts.workspaces)
  throw Error('LAB_INVENTORY_WORKSPACE_PAGINATION_UNSAFE');
const markedIds=new Set(marked.map(u=>u.id));
const markedWorkspaces=owned.data.filter(w=>markedIds.has(w.owner_user_id));
const unmarkedWorkspaces=owned.data.filter(w=>!markedIds.has(w.owner_user_id));
console.log('LAB_READ_ONLY_INVENTORY',JSON.stringify({
  userCount:users.length,markedUserCount:marked.length,unmarkedUserCount:unmarked.length,
  identitiesSafe,markedRoleCounts:Object.fromEntries([...allowed].map(label=>[
    label,marked.filter(u=>u.user_metadata?.label===label).length])),
  markedWorkspaceCount:markedWorkspaces.length,
  unmarkedWorkspaceCount:unmarkedWorkspaces.length,counts,
  zeroResidue:users.length===0&&Object.values(counts).every(n=>n===0)
}));
if(!identitiesSafe||unmarked.length||unmarkedWorkspaces.length)throw Error('LAB_INVENTORY_UNEXPECTED_IDENTITY_STOP');
