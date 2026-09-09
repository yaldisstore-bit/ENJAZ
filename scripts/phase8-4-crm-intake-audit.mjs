import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const kickoff=read('docs/PHASE8_4_KICKOFF.md');
const state=JSON.parse(read('docs/PHASE8_4_STATE.json'));
const evidence=read('docs/PHASE8_4_REAL_CLOUD_EVIDENCE.md');
const closure=read('docs/PHASE8_4_CLOSURE.md');
const postMerge=read('docs/PHASE8_4_POSTMERGE_RECERTIFICATION.md');
const sql=read('database/migrations/phase_8_4_crm_smart_intake_m6_m17.sql');
const hardening=read('database/migrations/phase_8_4_rpc_security_hardening.sql');
const edge=read('supabase/functions/enjaz-intake-upload/index.ts');
const service=read('src/features/crm-intake/crmIntakeCommands.ts');
const tests=read('tests/crmIntakeEngine.test.ts');
const internalUi=read('src/ui-r2/crm-intake/LiveCrmIntakeExperience.tsx');
const publicUi=read('src/ui-r2/crm-intake/PublicIntakeExperience.tsx');
const browser=read('tests-external/phase8-4-crm-intake.spec.cjs');
const must=(text,marker,label)=>{if(!text.includes(marker))throw new Error(`${label}: missing ${marker}`)};

for(const m of ['Status: **IN PROGRESS**','Base: `010aff999e66ff31b8a813026cddbc69db30b550`','External intake is intentionally non-authoritative','stores only a SHA-256 token hash','external submissions enter a review queue','duplicate company/client signals must be resolved','No permissive anonymous storage-table policy','670000-byte cap','Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation remains LOCKED'])must(kickoff,m,'historical kickoff');

if(state.phase!=='8.4'||state.name!=='CRM, Service Catalog & Smart Intake — M6 + M17'||state.status!=='CLOSED')throw new Error('Phase 8.4 closed state identity/status drift');
if(state.baseCommit!=='010aff999e66ff31b8a813026cddbc69db30b550'||state.implementationBranch!=='phase8-4-crm-smart-intake')throw new Error('Phase 8.4 base/branch drift');
if(state.implementationHead!=='ce9c0ea27af0289593e27467841014922943b171'||state.pullRequest!==115||state.implementationMergeCommit!=='b1f2e3b72ea9e15bb418660c14a4c8b663e37477')throw new Error('Phase 8.4 implementation certification chain drift');
if(state.predecessor?.phase!=='8.3'||state.predecessor?.requiredStatus!=='CLOSED'||state.predecessor?.requiredAuthorization!=='phase8_4Allowed=true')throw new Error('Phase 8.4 predecessor contract drift');
if(state.securityContracts?.rawTokenPersistence!=='FORBIDDEN'||state.securityContracts?.tokenHash!=='SHA-256'||state.securityContracts?.anonymousDirectTableWrites!=='FORBIDDEN'||state.securityContracts?.externalSubmissionAuthoritativeConversion!=='INTERNAL_REVIEW_REQUIRED'||state.securityContracts?.duplicateResolutionBeforeCoreConversion!=='REQUIRED'||state.securityContracts?.publicUploadClaimWithoutStorageAcknowledgement!=='FORBIDDEN')throw new Error('Phase 8.4 security contract drift');
if(state.authoritativeCoreWriteBoundaries?.companies!=='guarded_conversion_rpc_only'||state.authoritativeCoreWriteBoundaries?.contacts!=='guarded_conversion_rpc_only'||state.authoritativeCoreWriteBoundaries?.transactions!=='guarded_conversion_rpc_only'||state.authoritativeCoreWriteBoundaries?.financeLedger!=='none')throw new Error('Phase 8.4 authoritative Core/finance boundary drift');
if(state.javascriptBudgetBytes!==670000||state.budgetIncreaseAllowed!==false)throw new Error('Phase 8.4 JavaScript budget drift');

const m6=state.systems?.M6,m17=state.systems?.M17;
if(m6?.status!=='IN_PROGRESS'||m6?.phase8_4Delivery!=='CLOSED'||m6?.overallClosureAllowed!==false||m6?.authority!=='pre_transaction_commercial_facts_only')throw new Error('M6 phase-delivery/global-closure boundary drift');
if(m17?.status!=='IN_PROGRESS'||m17?.phase8_4Delivery!=='CLOSED'||m17?.overallClosureAllowed!==false||m17?.authority!=='external_non_authoritative_submission_only')throw new Error('M17 phase-delivery/global-closure boundary drift');

const pre=state.preClosure;
if(pre?.finalCertifiedHead!=='ce9c0ea27af0289593e27467841014922943b171'||pre?.finalPullRequest!==115||pre?.workflowCount!==33||pre?.successCount!==33||pre?.failureCount!==0)throw new Error('Phase 8.4 exact-head pre-closure workflow evidence drift');
if(pre?.crmIntakeTestCount!==7||pre?.functionalTestCount!==217||pre?.realChromium!=='PASS'||pre?.realChromiumAssertionCount!==9)throw new Error('Phase 8.4 pre-closure regression evidence drift');
if(pre?.productionJsBytes!==669685||pre?.javascriptBudgetBytes!==670000||pre?.previewBytes!==250601)throw new Error('Phase 8.4 pre-closure size evidence drift');

const cloud=state.realCloudVerification;
if(cloud?.required!==true||cloud?.status!=='PASS_ZERO_RESIDUE'||cloud?.projectRef!=='juzxriirhkuzviwnhkbd'||cloud?.authenticatedProbe!=='PASS'||cloud?.storageAcknowledgement!=='PASS'||cloud?.zeroResidue!==true)throw new Error('Phase 8.4 Real Cloud/Storage evidence drift');
if(cloud?.cleanupStorageMigration!=='20260909033707 phase_8_4_storage_probe_cleanup_via_api'||cloud?.cleanupFixtureMigration!=='20260909033915 phase_8_4_storage_probe_fixture_cleanup')throw new Error('Phase 8.4 cleanup migration evidence drift');

const pm=state.postMergeRecertification;
if(pm?.required!==true||pm?.status!=='COMPLETE'||pm?.mainCommit!=='b1f2e3b72ea9e15bb418660c14a4c8b663e37477')throw new Error('Phase 8.4 exact-main post-merge target drift');
if(pm?.workflowCount!==18||pm?.successCount!==18||pm?.failureCount!==0||pm?.queuedCount!==0||pm?.inProgressCount!==0||pm?.skippedCount!==0)throw new Error('Phase 8.4 exact-main workflow census drift');
if(pm?.pagesPreviewRunId!==34307859669||pm?.liveExternalRunId!==34307899140||pm?.realBrowserRunId!==34307826442)throw new Error('Phase 8.4 post-merge run identity drift');
if(pm?.canonicalPagesJsBytes!==669877||pm?.realPagesLiveJsBytes!==669888||pm?.javascriptBudgetBytes!==670000||pm?.publishedApplicationAttack!=='PASS')throw new Error('Phase 8.4 deployed Pages/Live evidence drift');

if(state.exitGatePassed!==true||state.unresolvedDefectCount!==0||state.criticalDefectCount!==0||state.highDefectCount!==0||state.functionalBlockerCount!==0)throw new Error('Phase 8.4 closure requires passed exit gate and zero unresolved blockers');
if(!Array.isArray(state.knownBlockers)||state.knownBlockers.length!==0)throw new Error('Phase 8.4 known blocker ledger must be empty at closure');
if(state.phase8_5Allowed!==true||state.nextPhase!=='8.5'||state.successorStatus!=='AUTHORIZED')throw new Error('Phase 8.5 must be the sole authorized successor after Phase 8.4 closure');
if(state.realCloudEvidence!=='docs/PHASE8_4_REAL_CLOUD_EVIDENCE.md'||state.closureEvidence!=='docs/PHASE8_4_CLOSURE.md'||state.postMergeEvidence!=='docs/PHASE8_4_POSTMERGE_RECERTIFICATION.md')throw new Error('Phase 8.4 evidence pointers drift');

for(const t of ['service_catalog_items','crm_leads','crm_service_requests','crm_quotations','crm_quotation_items','intake_forms','intake_form_fields','intake_links','intake_public_events','intake_submissions','intake_submission_files','crm_conversion_audits'])must(sql,`create table public.${t}`,'schema');
for(const m of ["token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$')","encode(sha256(convert_to(v_token,'UTF8')),'hex')","grant execute on function public.get_public_intake_v1(text) to anon","grant execute on function public.save_public_intake_v1(text,jsonb,jsonb,boolean) to anon","revoke all on table public.service_catalog_items,public.crm_leads","externalSubmissionAuthority','non_authoritative","companyWriteAuthority','guarded_conversion_rpc_only","financeLedgerWriteAuthority','none'","ENJAZ_INTAKE_RATE_LIMITED","ENJAZ_INTAKE_UPLOADS_NOT_ACKNOWLEDGED","ENJAZ_CRM_DUPLICATE_COMPANY_REVIEW_REQUIRED","financeLedgerWritten',false"])must(sql,m,'security/schema');
if(/grant\s+(insert|update|delete|all)\s+on\s+table[^;]+\s+to\s+anon/i.test(sql))throw new Error('Anonymous direct table write grant detected');
if(/token\s+text\s+not\s+null/i.test(sql)&&!sql.includes('p_token text'))throw new Error('Potential raw token column detected');

for(const m of ["externalSubmissionAuthority:'non_authoritative'","financeLedgerWriteAuthority:'none'","guarded_conversion_rpc_only","if(r.authoritative!==false)bad()","p_reuse_company_id","p_token:token(rawToken)"])must(service,m,'service');
for(const m of ['rejects any drift that gives CRM direct finance','public intake parser refuses any response claiming authoritative','validates file size before network','approval requires explicit field mapping','single guarded RPC'])must(tests,m,'tests');
for(const m of ['data-crm-authority="pre_transaction"','data-external-authority={ctx.externalSubmissionAuthority}','data-finance-write-authority={ctx.financeLedgerWriteAuthority}','موافقة وإنشاء Lead','تحويل إلى Core','الخصم فوق 10%'])must(internalUi,m,'internal UI');
for(const m of ['data-public-authority={view.publicAuthority}','data-authoritative="false"','pending_upload','بانتظار رفع فعلي واعتراف التخزين','لا نخزن التوكن في localStorage'])must(publicUi,m,'public UI');
for(const m of ['overflow-safe','pending_approval','لم يصبح سجلًا سلطويًا','data-pending-uploads="1"','localStorage.length'])must(browser,m,'real browser contract');

must(sql,"constraint crm_leads_lost_stage_consistency check",'production SQL guard');
must(sql,"constraint intake_submission_files_ack_check check",'production SQL guard');
if(sql.includes("constraint crm_leads_lost_reason_check check"))throw new Error('PostgreSQL duplicate constraint-name regression detected');
if(sql.includes("constraint intake_submission_files_ack_check (("))throw new Error('Missing CHECK keyword regression detected');

const mutatingRpcSignatures=[
  'save_service_catalog_item_v1(uuid,uuid,text,text,text,numeric,integer,jsonb,jsonb,boolean)',
  'create_crm_lead_v1(uuid,text,text,text,text,text,uuid)',
  'advance_crm_lead_v1(uuid,uuid,integer,text,text)',
  'create_crm_service_request_v1(uuid,uuid,uuid,text)',
  'create_crm_quotation_v1(uuid,uuid,uuid,text,numeric,date,jsonb)',
  'approve_crm_quotation_v1(uuid,uuid,integer)',
  'accept_crm_quotation_v1(uuid,uuid,integer)',
  'save_intake_form_v1(uuid,uuid,text,text,text,boolean,jsonb)',
  'issue_intake_link_v1(uuid,uuid,uuid,integer)',
  'revoke_intake_link_v1(uuid,uuid)',
  'review_intake_submission_v1(uuid,uuid,integer,text,jsonb,text)',
  'convert_crm_lead_v1(uuid,uuid,uuid,text,text)'
];
for(const sig of mutatingRpcSignatures){must(hardening,`alter function public.${sig} security definer`,'RPC hardening');must(hardening,`grant execute on function public.${sig} to authenticated`,'RPC hardening');}
if(/grant\s+(insert|update|delete|all)\s+on\s+table/i.test(hardening))throw new Error('RPC hardening must not grant direct table mutation');

for(const m of ["stage='storage_init'","stage='prepare_rpc'","stage='signed_url'","stage='storage_info'","stage='ack_rpc'","STORAGE_OBJECT_NOT_FOUND","STORAGE_SIZE_MISMATCH","STORAGE_MIME_MISMATCH"])must(edge,m,'upload broker');
if(edge.includes('cleanup_probe')||edge.includes('CLEANUP_NONCE'))throw new Error('Production upload broker must not retain probe cleanup action');

for(const m of ['Status: **PASS — ZERO RESIDUE**','HTTP 409 with `STORAGE_OBJECT_NOT_FOUND`','HTTP 200 with `uploadStatus=acknowledged`','Storage objects: **0**','related audit events: **0**','20260909033707 phase_8_4_storage_probe_cleanup_via_api','20260909033915 phase_8_4_storage_probe_fixture_cleanup'])must(evidence,m,'Real Cloud evidence');
for(const m of ['Status: **CLOSED**','Exit gate: **PASS**','Successor: **Phase 8.5 AUTHORIZED**','33/33 pull-request workflows successful','18/18 SUCCESS','34307859669','34307899140','669877 / 670000','669888 / 670000','Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation is the sole authorized successor'])must(closure,m,'closure evidence');
for(const m of ['Status: **COMPLETE**','b1f2e3b72ea9e15bb418660c14a4c8b663e37477','workflow runs: **18**','successful: **18**','34307859669','34307899140','34307826442','Published application attack: **PASS**'])must(postMerge,m,'post-merge evidence');

console.log('ENJAZ PHASE 8.4 AUDIT PASS — Phase 8.4 CLOSED after exact-head 33/33, Real Cloud/Storage zero-residue, exact-main 18/18, Pages 669877/670000, /live 669888/670000 and published-app attack PASS; Phase 8.5 AUTHORIZED; M6/M17 global Zero-Escape closure remains separate.');
