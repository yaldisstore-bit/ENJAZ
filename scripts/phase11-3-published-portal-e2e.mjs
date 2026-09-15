import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const PROJECT_REF='juzxriirhkuzviwnhkbd';
const MARKER='__ENJAZ_PHASE113_PUBLISHED__';
const MESSAGE='__ENJAZ_PHASE113_PUBLISHED_MESSAGE__';
const ARTIFACT_DIR='artifacts/phase11-3-published-portal';
const EVIDENCE_PATH=`${ARTIFACT_DIR}/evidence.json`;
const VIEWPORTS=[
  {width:1280,height:800,label:'desktop-1280'},
  {width:430,height:900,label:'mobile-430'},
  {width:390,height:844,label:'mobile-390'},
  {width:360,height:800,label:'mobile-360'},
  {width:320,height:720,label:'mobile-320'},
];

const env=(name)=>{
  const value=process.env[name]?.trim();
  if(!value)throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const url=env('SUPABASE_URL').replace(/\/$/,'');
const publishableKey=env('SUPABASE_PUBLISHABLE_KEY');
const secretKey=env('SUPABASE_SECRET_KEY');
const livePortalUrl=env('LIVE_PORTAL_URL');
const expectedSha=env('EXPECTED_DEPLOYED_SHA');
if(!url.includes(PROJECT_REF))throw new Error('Refusing unexpected Supabase project');
if(secretKey.startsWith('sb_publishable_')||secretKey===publishableKey)throw new Error('SUPABASE_SECRET_KEY is not privileged');
if(!/^[0-9a-f]{40}$/.test(expectedSha))throw new Error('EXPECTED_DEPLOYED_SHA must be an exact 40-character commit SHA');
if(!/^https:\/\//.test(livePortalUrl))throw new Error('Published portal certificate requires HTTPS');

const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const publicClient=()=>createClient(url,publishableKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const uuid=()=>crypto.randomUUID();
const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
const evidence={
  schema:'enjaz.phase11-3-published-portal.v1',projectRef:PROJECT_REF,expectedSha,
  livePortalUrl,startedAt:new Date().toISOString(),completedAt:null,passed:false,checks:[],cleanup:[],
};
let fatalError=null;
let browser=null;
let testUser=null;
let testUserWorkspaceIds=[];
let target=null;
let principalId=null;
let grantId=null;
let requestId=null;

const record=(name,detail=null)=>{
  evidence.checks.push({name,passed:true,...(detail?{detail}:{})});
  console.log(`PASS ${name}${detail?` — ${detail}`:''}`);
};
const assert=(condition,name,detail=null)=>{
  if(!condition)throw new Error(`ASSERTION_FAILED:${name}${detail?`:${detail}`:''}`);
  record(name,detail);
};
const must=async(promise,label)=>{
  const {data,error}=await promise;
  if(error)throw new Error(`${label}:${error.message}`);
  return data;
};

async function writeEvidence(){
  await mkdir(ARTIFACT_DIR,{recursive:true});
  evidence.completedAt=new Date().toISOString();
  evidence.passed=!fatalError;
  if(fatalError)evidence.failure=fatalError instanceof Error?fatalError.message:String(fatalError);
  await writeFile(EVIDENCE_PATH,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
}

async function waitForExactDeployment(){
  const manifestUrl=new URL('enjaz-deploy.json',livePortalUrl.endsWith('/')?livePortalUrl:`${livePortalUrl}/`);
  // /live/portal + relative manifest would resolve below /portal. Force /live/enjaz-deploy.json.
  const liveUrl=new URL(livePortalUrl);
  const liveRoot=`${liveUrl.origin}${liveUrl.pathname.replace(/\/portal\/?$/,'/')}`;
  const exactManifestUrl=new URL('enjaz-deploy.json',liveRoot).toString();
  let last='';
  for(let attempt=1;attempt<=30;attempt+=1){
    try{
      const response=await fetch(exactManifestUrl,{cache:'no-store'});
      if(response.ok){
        const data=await response.json();
        last=String(data?.sha??'');
        if(data?.schema==='enjaz.deploy.v1'&&last===expectedSha){
          record('exact_deployed_sha',expectedSha);
          return;
        }
      }else last=`HTTP ${response.status}`;
    }catch(error){last=error instanceof Error?error.message:String(error);}
    await sleep(4000);
  }
  throw new Error(`DEPLOYED_SHA_NOT_EXACT:${last}`);
}

async function selectCanonicalTarget(){
  const workspaces=await must(admin.from('workspaces').select('id,owner_user_id,created_at').not('owner_user_id','is',null).order('created_at',{ascending:true}).limit(30),'list workspaces');
  for(const workspace of workspaces??[]){
    const txs=await must(admin.from('transactions').select('id,company_id,created_at').eq('workspace_id',workspace.id).is('deleted_at',null).not('company_id','is',null).order('created_at',{ascending:true}).limit(1),'find target transaction');
    if(txs?.[0])return {workspaceId:workspace.id,ownerUserId:workspace.owner_user_id,transactionId:txs[0].id,companyId:txs[0].company_id};
  }
  throw new Error('NO_CANONICAL_PORTAL_TARGET');
}

async function createDisposableUser(){
  const entropy=`${Date.now()}-${uuid().slice(0,8)}`;
  const email=`enjaz-phase11-3-published-${entropy}@example.com`;
  const password=`EnjAZ!${uuid()}Aa9`;
  const {data,error}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,user_metadata:{enjaz_test_marker:'phase11_3_published_portal'},
  });
  if(error||!data.user)throw error??new Error('TEMP_USER_CREATE_FAILED');
  testUser={id:data.user.id,email,password};
  record('disposable_auth_user_created');

  for(let attempt=0;attempt<20;attempt+=1){
    const rows=await must(admin.from('workspaces').select('id').eq('owner_user_id',testUser.id),'find disposable workspace');
    if(rows?.length){testUserWorkspaceIds=rows.map((row)=>row.id);break;}
    await sleep(250);
  }
  return testUser;
}

async function seedPortalFixture(){
  principalId=uuid();grantId=uuid();requestId=uuid();
  await must(admin.from('client_portal_principals').insert({
    id:principalId,workspace_id:target.workspaceId,user_id:testUser.id,status:'invited',created_by:target.ownerUserId,
  }).select('id').single(),'seed portal principal');
  await must(admin.from('client_portal_grants').insert({
    id:grantId,workspace_id:target.workspaceId,principal_id:principalId,target_type:'transaction',transaction_id:target.transactionId,
    permissions:['view','message'],created_by:target.ownerUserId,
  }).select('id').single(),'seed portal grant');
  await must(admin.from('client_portal_requests').insert({
    id:requestId,workspace_id:target.workspaceId,principal_id:principalId,transaction_id:target.transactionId,
    request_type:'information',required_permission:'message',title:MARKER,instructions:'Published authenticated portal certificate',
    status:'open',created_by:target.ownerUserId,
  }).select('id').single(),'seed portal request');
  record('portal_fixture_seeded');
}

async function login(page){
  await page.goto(livePortalUrl,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('[data-client-portal-auth="true"]').waitFor({state:'visible',timeout:30000});
  await page.locator('input[type="email"]').fill(testUser.email);
  await page.locator('input[type="password"]').fill(testUser.password);
  await page.getByRole('button',{name:'دخول آمن'}).click();
}

async function assertNoHorizontalOverflow(page,label){
  const overflow=await page.evaluate(()=>({width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert(overflow.scrollWidth<=overflow.width+1,`${label}_no_horizontal_overflow`,`${overflow.scrollWidth}/${overflow.width}`);
  const targets=await page.locator('.cp-bottom-nav button').evaluateAll((els)=>els.map((el)=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};}));
  assert(targets.length===5&&targets.every((r)=>r.w>=40&&r.h>=40),`${label}_touch_targets`);
}

async function runPrimaryBrowserJourney(){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ar-IQ'});
  const page=await context.newPage();
  try{
    await login(page);
    await page.getByRole('heading',{name:'لديك دعوة جديدة'}).waitFor({state:'visible',timeout:30000});
    record('published_invitation_discovered');
    await page.getByRole('button',{name:/تفعيل/}).click();
    await page.locator('[data-client-portal-shell="isolated"]').waitFor({state:'visible',timeout:30000});
    assert(await page.locator('[data-client-portal-shell="isolated"]').count()===1,'published_isolated_portal_shell');
    await page.getByRole('heading',{name:MARKER}).waitFor({state:'visible',timeout:30000});
    await page.getByPlaceholder('اكتب ردك أو المعلومة المطلوبة…').fill(MESSAGE);
    await page.getByRole('button',{name:'إرسال الرد'}).click();
    await page.getByText('تم التعامل مع هذا الطلب.').waitFor({state:'visible',timeout:30000});
    record('published_client_reply_completed');
    await assertNoHorizontalOverflow(page,'published_mobile_390_action');
  }finally{
    await context.close();
  }
}

async function assertDatabaseAfterBrowser(){
  const principal=await must(admin.from('client_portal_principals').select('status,activated_at,revoked_at').eq('id',principalId).single(),'verify activated principal');
  assert(principal.status==='active'&&Boolean(principal.activated_at)&&principal.revoked_at===null,'published_activation_persisted');
  const request=await must(admin.from('client_portal_requests').select('status').eq('id',requestId).single(),'verify fulfilled request');
  assert(request.status==='fulfilled','published_request_fulfilled');
  const messages=await must(admin.from('client_portal_messages').select('id,body,actor_user_id').eq('principal_id',principalId).eq('request_id',requestId),'verify portal message');
  assert(messages?.length===1&&messages[0].body===MESSAGE&&messages[0].actor_user_id===testUser.id,'published_message_single_authoritative_row');
  const staff=await must(admin.from('workspace_memberships').select('user_id').eq('workspace_id',target.workspaceId).eq('user_id',testUser.id),'verify no staff membership');
  const workforce=await must(admin.from('organization_members').select('user_id').eq('workspace_id',target.workspaceId).eq('user_id',testUser.id),'verify no workforce membership');
  assert((staff?.length??0)===0&&(workforce?.length??0)===0,'published_activation_did_not_mint_staff_trust');
  const audits=await must(admin.from('audit_events').select('id,action').eq('workspace_id',target.workspaceId).eq('actor_user_id',testUser.id),'verify portal audit evidence');
  assert((audits?.length??0)>=2,'published_audit_evidence_present',String(audits?.length??0));
}

async function runFreshLoginViewport(viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},locale:'ar-IQ'});
  const page=await context.newPage();
  try{
    await login(page);
    await page.locator('[data-client-portal-shell="isolated"]').waitFor({state:'visible',timeout:30000});
    await page.getByRole('button',{name:'الطلبات'}).click();
    const requestCard=page.locator('.cp-request').filter({hasText:MARKER});
    await requestCard.waitFor({state:'visible',timeout:30000});
    assert((await requestCard.getByText('مكتمل').count())===1,`${viewport.label}_fresh_login_fulfilled_state`);
    await assertNoHorizontalOverflow(page,viewport.label);
    record(`${viewport.label}_authenticated_reload`);
  }finally{
    await context.close();
  }
}

async function cleanupAll(){
  try{if(browser)await browser.close();}catch{}
  if(principalId){
    const tables=[
      'client_portal_document_approval_responses','client_portal_document_approval_targets','client_portal_requested_document_uploads',
      'client_portal_request_read_receipts','client_portal_appointment_responses','client_portal_messages','client_portal_requests',
      'client_portal_resource_shares','client_portal_authority_events','client_portal_grants',
    ];
    for(const table of tables){
      try{
        const {error}=await admin.from(table).delete().eq('principal_id',principalId);
        if(error)throw error;
        evidence.cleanup.push({kind:'table_rows',id:table,passed:true});
      }catch(error){evidence.cleanup.push({kind:'table_rows',id:table,passed:false,error:error instanceof Error?error.message:String(error)});}
    }
    try{
      const {error}=await admin.from('client_portal_principals').delete().eq('id',principalId);
      if(error)throw error;
      evidence.cleanup.push({kind:'portal_principal',id:principalId,passed:true});
    }catch(error){evidence.cleanup.push({kind:'portal_principal',id:principalId,passed:false,error:error instanceof Error?error.message:String(error)});}
  }
  if(testUser?.id&&target?.workspaceId){
    try{
      const {error}=await admin.from('audit_events').delete().eq('workspace_id',target.workspaceId).eq('actor_user_id',testUser.id);
      if(error)throw error;
      evidence.cleanup.push({kind:'portal_audit',id:testUser.id,passed:true});
    }catch(error){evidence.cleanup.push({kind:'portal_audit',id:testUser.id,passed:false,error:error instanceof Error?error.message:String(error)});}
  }
  for(const workspaceId of testUserWorkspaceIds){
    try{
      const {error}=await admin.from('workspaces').delete().eq('id',workspaceId);
      if(error)throw error;
      evidence.cleanup.push({kind:'disposable_workspace',id:workspaceId,passed:true});
    }catch(error){evidence.cleanup.push({kind:'disposable_workspace',id:workspaceId,passed:false,error:error instanceof Error?error.message:String(error)});}
  }
  if(testUser?.id){
    try{
      const {error}=await admin.auth.admin.deleteUser(testUser.id,false);
      if(error)throw error;
      evidence.cleanup.push({kind:'auth_user',id:testUser.id,passed:true});
    }catch(error){evidence.cleanup.push({kind:'auth_user',id:testUser.id,passed:false,error:error instanceof Error?error.message:String(error)});}
  }
}

async function assertZeroResidue(){
  if(principalId){
    const principals=await must(admin.from('client_portal_principals').select('id').eq('id',principalId),'residue principals');
    const requests=await must(admin.from('client_portal_requests').select('id').eq('title',MARKER),'residue requests');
    const messages=await must(admin.from('client_portal_messages').select('id').eq('body',MESSAGE),'residue messages');
    assert((principals?.length??0)===0&&(requests?.length??0)===0&&(messages?.length??0)===0,'published_portal_zero_residue');
  }
  if(testUser?.id){
    const {data,error}=await admin.auth.admin.getUserById(testUser.id);
    assert(Boolean(error)||!data?.user,'published_auth_user_zero_residue');
  }
}

try{
  await waitForExactDeployment();
  target=await selectCanonicalTarget();
  record('canonical_target_selected');
  await createDisposableUser();
  await seedPortalFixture();
  browser=await chromium.launch({headless:true});
  await runPrimaryBrowserJourney();
  await assertDatabaseAfterBrowser();
  for(const viewport of VIEWPORTS)await runFreshLoginViewport(viewport);
}catch(error){
  fatalError=error;
  console.error('Phase 11.3 published portal certificate failed:',error instanceof Error?error.message:String(error));
}finally{
  await cleanupAll();
  try{await assertZeroResidue();}catch(error){
    if(!fatalError)fatalError=error;
    console.error('Phase 11.3 published portal cleanup verification failed:',error instanceof Error?error.message:String(error));
  }
  const cleanupFailures=evidence.cleanup.filter((item)=>item.passed===false);
  if(cleanupFailures.length&&!fatalError)fatalError=new Error(`CLEANUP_FAILURES:${cleanupFailures.length}`);
  await writeEvidence();
}

if(fatalError)throw fatalError;
record('published_portal_certificate_complete');
await writeEvidence();
