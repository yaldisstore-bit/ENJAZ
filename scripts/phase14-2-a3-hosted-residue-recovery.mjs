import {createClient} from '@supabase/supabase-js';

const MARKER='phase14_2_a3_hosted_auth_rls';
const required=name=>{const v=process.env[name]?.trim();if(!v)throw new Error('MISSING_'+name);return v};
const productionRef=required('PRODUCTION_PROJECT_REF');
const branchRef=required('ENJAZ_A3_BRANCH_REF');
const url=required('SUPABASE_URL').replace(/\/$/,'');
const publishable=required('SUPABASE_PUBLISHABLE_KEY');
const secret=required('SUPABASE_SECRET_KEY');
if(process.env.ENJAZ_REAL_CLOUD_CONFIRM!=='YES' ||
   process.env.ENJAZ_A3_ISOLATED_BRANCH_CONFIRM!=='YES' ||
   branchRef===productionRef ||
   !/^[a-z0-9]{20}$/.test(branchRef) ||
   url!==`https://${branchRef}.supabase.co` ||
   secret===publishable ||
   secret.startsWith('sb_publishable_')) {
  throw new Error('PHASE14_2_A3_RECOVERY_TARGET_DENIED');
}

const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const {data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
if(listError||!list?.users)throw listError??new Error('A3_RECOVERY_AUTH_LIST_FAILED');
const marked=list.users.filter(u=>u.user_metadata?.enjaz_test_marker===MARKER || u.email?.startsWith('enjaz-a3-'));
if(marked.length===0){
  console.log('PASS 14.2 A3 recovery: no marked residue');
  process.exit(0);
}
if(marked.length>4)throw new Error('A3_RECOVERY_UNEXPECTED_MARKED_USER_COUNT');

for(const user of marked){
  if(user.user_metadata?.enjaz_test_marker!==MARKER ||
     !user.email?.startsWith('enjaz-a3-') ||
     !user.email.endsWith('@example.com')) {
    throw new Error('A3_RECOVERY_UNMARKED_USER_DENIED');
  }
  const {data:ws,error:wsError}=await admin.from('workspaces').select('id,owner_user_id').eq('owner_user_id',user.id).limit(3);
  if(wsError)throw wsError;
  if((ws?.length??0)>1)throw new Error('A3_RECOVERY_UNEXPECTED_WORKSPACE_COUNT');
  for(const row of ws||[]){
    const {error}=await admin.from('workspaces').delete().eq('id',row.id).eq('owner_user_id',user.id);
    if(error)throw error;
  }
  const {error:userError}=await admin.auth.admin.deleteUser(user.id,false);
  if(userError)throw userError;
}

const {data:after,error:afterError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
if(afterError)throw afterError;
const remaining=(after?.users||[]).filter(u=>u.user_metadata?.enjaz_test_marker===MARKER || u.email?.startsWith('enjaz-a3-'));
if(remaining.length!==0)throw new Error('A3_RECOVERY_ZERO_RESIDUE_NOT_VERIFIED');
console.log('PASS 14.2 A3 recovery removed only marked Auth/workspace residue');
