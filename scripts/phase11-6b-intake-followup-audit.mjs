import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const json=(p)=>JSON.parse(read(p));
const state=json('docs/PHASE11_6_STATE.json');
const scope=read('docs/PHASE11_6B_INTAKE_FOLLOWUP_SCOPE.md');
const bridge=read('database/migrations/phase_11_6_intake_followup_bridge.sql');
const capability=read('database/migrations/phase_11_6_intake_followup_public_capability.sql');
const gateway=read('src/features/intake-contract-communication/intakeFollowupCommands.ts');
const tests=read('tests/intakeFollowupCommands.test.ts');
const errors=[];
const req=(v,m)=>{if(!v)errors.push(m)};
const has=(s,m,l)=>req(s.includes(m),`${l} missing marker: ${m}`);
const lacks=(s,m,l)=>req(!s.includes(m),`${l} forbidden marker present: ${m}`);

req(state.phase==='11.6'&&state.status==='IN_PROGRESS'&&state.currentSlice==='11.6-B','11.6-B lifecycle identity invalid');
req(state.phase11_6aStatus==='CLOSED'&&state.phase11_6aExitGatePassed===true&&state.phase11_6aPostMergeRecertification==='PASS_EXACT_MAIN_SHA','11.6-A exact-main predecessor evidence must remain preserved');
req(state.phase11_6aMergeCommit==='d44b27411f3b994eb79f9e75ea0f8c15984c0412','11.6-B base lineage drifted');
req(state.phase11_6bStatus==='IN_PROGRESS'&&state.phase11_6bExitGatePassed===false,'11.6-B cannot be pre-closed');
req(state.phase11_6cAllowed===false&&state.phase11_7Allowed===false&&state.successorStatus==='LOCKED','11.6-C/11.7 must remain locked while B is open');
for(const f of ['phase11_6bShadowSubmissionAllowed','phase11_6bSecureLinkDocumentUploadAllowed','phase11_6bRawCapabilityTokenPersistenceAllowed'])req(state[f]===false,`B fail-closed state drifted: ${f}`);
for(const f of ['phase11_6bCanonicalSubmissionAuthorityPreserved','phase11_6bPortalAuthorityDelegated','phase11_6bPortalTransactionMustBindToIntakeLead','phase11_6bOneOpenFollowupPerSubmission'])req(state[f]===true,`B authority state drifted: ${f}`);

for(const marker of ['same `intake_submissions.answers`','document follow-up requires Client Portal mode','HMAC-SHA256','exactly one open follow-up','Portal reconcile before request fulfillment/evidence'])has(scope,marker,'B scope');

has(bridge,'create table private.intake_followup_requests','bridge');
lacks(bridge,'create table public.intake_followup','bridge');
lacks(bridge,'insert into public.intake_submissions','bridge');
lacks(bridge,'insert into public.client_portal_requests','bridge');
lacks(bridge,'update public.client_portal_requests','bridge');
has(bridge,'private.intake_followup_token_secret','bridge');
has(bridge,'extensions.gen_random_bytes(32)','bridge');
has(bridge,'extensions.hmac(','bridge');
has(bridge,"extensions.digest(convert_to(p_token,'UTF8'),'sha256')",'bridge');
has(bridge,'token_hash text','bridge');
lacks(bridge,'token text not null','bridge');
has(bridge,'intake_followup_requests_one_open_per_submission','bridge');
has(bridge,"p_mode='secure_link' and p_request_kind<>'information'",'bridge');
has(bridge,"ENJAZ_INTAKE_FOLLOWUP_DOCUMENT_REQUIRES_PORTAL",'bridge');
has(bridge,'public.save_client_portal_request_v1(','bridge');
has(bridge,'private.revoke_client_portal_request_v1_impl(','bridge');
has(bridge,'l.converted_transaction_id=p_portal_transaction_id','bridge');
has(bridge,'ENJAZ_INTAKE_FOLLOWUP_PORTAL_TRANSACTION_UNBOUND','bridge');
has(bridge,"v_request.status<>'fulfilled'",'bridge');
has(bridge,'ENJAZ_INTAKE_FOLLOWUP_PORTAL_RESPONSE_MISSING','bridge');
has(bridge,'v_submission.version<>p_expected_submission_version','bridge');
has(bridge,'v_submission.version<>v_row.expected_submission_version','bridge');
has(bridge,'set answers=answers||v_patch,version=version+1','bridge');
lacks(bridge,"set status='approved'",'bridge');
lacks(bridge,'review_intake_submission_v1','bridge must not replace final review owner');
has(bridge,"'intake.followup.requested'",'bridge audit');
has(bridge,"'intake.followup.responded'",'bridge audit');
has(bridge,"'intake.followup.portal_reconciled'",'bridge audit');
has(bridge,"'intake.followup.revoked'",'bridge audit');
has(bridge,'security invoker','staff public façades');

for(const marker of [
  'alter function public.get_public_intake_followup_v1(text) security definer',
  'alter function public.save_public_intake_followup_v1(text,jsonb,boolean) security definer',
  'revoke all on function private.get_public_intake_followup_v1_impl(text) from public,anon,authenticated,service_role',
  'revoke all on function private.save_public_intake_followup_v1_impl(text,jsonb,boolean) from public,anon,authenticated,service_role',
])has(capability,marker,'public capability hardening');
lacks(capability,'grant usage on schema private to anon','public capability hardening');

for(const marker of [
  "'issue_intake_followup_v1'","'get_public_intake_followup_v1'","'save_public_intake_followup_v1'",
  "'reconcile_portal_intake_followup_v1'","'revoke_intake_followup_v1'",
  "mode==='secure_link'&&kind==='document'","publicAuthority!=='non_authoritative_followup_input'",
])has(gateway,marker,'B gateway');
for(const marker of ['destruction: secure-link document follow-up','portal mode requires principal transaction and request binding','issue response cannot mix secure token and portal request authority','public read requires explicit non-authoritative follow-up contract'])has(tests,marker,'B gateway tests');

if(errors.length){console.error(`ENJAZ PHASE 11.6-B INTAKE FOLLOW-UP AUDIT FAIL (${errors.length})`);errors.forEach(e=>console.error(`- ${e}`));process.exitCode=1}else console.log('ENJAZ PHASE 11.6-B INTAKE FOLLOW-UP AUDIT PASS — one canonical intake submission, HMAC capability, Portal delegation/evidence, stale/idempotent/revocation boundaries and successor locks are intact.');
