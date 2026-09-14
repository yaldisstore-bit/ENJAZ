import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const state=json('docs/PHASE10_6_STATE.json');
const predecessor=json('docs/PHASE10_5_STATE.json');
const registry=json('docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const kickoff=read('docs/PHASE10_6_KICKOFF.md');
const safety=read('src/features/documents/documentBinarySafety.ts');
const retry=read('src/features/documents/documentUploadRetry.ts');
const vaultContract=read('src/features/documents/documentVaultContract.ts');
const vaultCommands=read('src/features/documents/documentVaultCommands.ts');
const vaultUi=read('src/ui-r2/documents/ConnectedDocumentVault.tsx');
const edge=read('supabase/functions/enjaz-document-vault/index.ts');
const migration=read('database/migrations/phase_10_6_document_binary_hardening.sql');
const intelligence=read('src/features/documents/documentIntelligenceContract.ts');
const report=read('src/features/reports/reportPdfContract.ts');
const tests=read('tests/documentZeroEscape.test.ts');
const roadmap=read('docs/ENJAZ_MASTER_ROADMAP.md');

const failures=[];
const check=(name,condition)=>{if(!condition)failures.push(name)};
const has=(source,needle)=>source.includes(needle);
const closed=state.status==='CLOSED';

check('phase_identity',state.phase==='10.6'&&state.name==='Documents Zero-Escape Gate'&&['IN_PROGRESS','CLOSED'].includes(state.status));
check('exact_base',state.baseCommit==='662ae5ebda43c45a889bddf4872ba610c71b7862');
check('predecessor_closed',state.predecessorPhase==='10.5'&&state.predecessorStatus==='CLOSED'&&predecessor.status==='CLOSED'&&predecessor.exitGatePassed===true&&predecessor.phase10_6Allowed===true);
check('predecessor_evidence',state.predecessorClosureEvidence==='docs/PHASE10_5_CLOSURE.md'&&fs.existsSync(state.predecessorClosureEvidence));
check('budgets_frozen',state.javascriptBudgetBytes===670000&&state.totalJavascriptBudgetBytes===760000&&state.cssBudgetBytes===180000&&state.budgetIncreaseAllowed===false);
check('authority_boundary',state.newShadowDocumentAuthorityAllowed===false&&state.browserDirectAuthoritativeMutationAllowed===false);
check('binary_law',state.binarySignatureVerificationRequired===true&&state.serverBinaryVerificationRequired===true&&state.checksumParityRequired===true&&state.unsafeBinaryMayBeAcknowledged===false);
check('retry_law',state.safeRetryMustReuseOperationIdentity===true&&state.blindRetryAfterUnknownOutcomeAllowed===false);
check('ocr_law',state.ocrFailureMayBecomeVerified===false&&state.staleOcrMayBecomeVerified===false);
check('report_law',state.blankReportPageAllowed===false&&state.reportOverflowCorruptionAllowed===false);
check('evidence_law',state.realBrowserRequired===true&&state.exactMainRequired===true&&state.pagesRequired===true&&state.liveExternalRequired===true);

const expectedDimensions=['missing_storage_object','zero_byte_binary','oversized_binary','corrupt_or_spoofed_binary','broken_metadata','ocr_failure','stale_ocr_output','malicious_upload','long_report','multi_page_overflow','offline_upload_retry','unauthenticated_access','cross_workspace_access'];
check('destruction_dimensions',Array.isArray(state.destructionDimensions)&&expectedDimensions.every(item=>state.destructionDimensions.includes(item))&&state.destructionDimensions.length===expectedDimensions.length);
check('systems_under_gate',Array.isArray(state.systemsUnderGate)&&state.systemsUnderGate.join(',')==='M7,M16_PHASE10_DOCUMENT_PORTION');
const m7=registry.systems.find(entry=>entry.id==='M7'),m16=registry.systems.find(entry=>entry.id==='M16');
check('m7_registry_active',m7?.status==='ACTIVE'&&m7?.anchors?.join(',')==='10');
check('m16_registry_active',m16?.status==='ACTIVE'&&m16?.anchors?.join(',')==='7,10,11'&&m16?.closureEvidence===null);

for(const marker of ['DOCUMENT_BINARY_SAFETY_SCHEMA','inspectDocumentBinary','Document extension does not match MIME type','Executable binary is forbidden','Scriptable document masquerade is forbidden','Active PDF content is forbidden','SHA-256']) check(`safety:${marker}`,has(safety,marker));
for(const marker of ['reconcile_same_operation','retry_same_operation','createDocumentUploadRetryTicket','executeDocumentUploadRetry','DATA_OUTCOME_UNKNOWN','operationId']) check(`retry:${marker}`,has(retry,marker));
check('vault_operation_identity',has(vaultContract,'operationId?:string|null')&&has(vaultCommands,'input.operationId??crypto.randomUUID()'));
check('vault_client_preflight',has(vaultCommands,'inspectDocumentBinary(input.file)')&&has(vaultCommands,'checksum:safety.sha256'));
check('vault_recovery_before_duplicate',has(vaultCommands,"if(input.operationId){try{return await acknowledge()"));
check('ui_retry_wired',has(vaultUi,'createDocumentUploadRetryTicket')&&has(vaultUi,'executeDocumentUploadRetry')&&has(vaultUi,"window.addEventListener('online',resume)")&&has(vaultUi,'data-phase10-6="zero-escape"'));

for(const marker of ['get_document_upload_claim_v2','acknowledge_document_upload_v2','p_actual_checksum','ENJAZ_VAULT_STORAGE_CHECKSUM_MISMATCH',"grant execute on function public.get_document_upload_claim_v2(uuid) to authenticated","grant execute on function public.acknowledge_document_upload_v2(uuid,text,bigint,text,text) to service_role","'binarySafety','phase10.6'"]) check(`db:${marker}`,has(migration,marker));
for(const marker of ['inspectStoredBinary','BINARY_EXTENSION_MISMATCH','BINARY_EXECUTABLE_FORBIDDEN','BINARY_SCRIPTABLE_MASQUERADE','BINARY_PDF_ACTIVE_CONTENT_FORBIDDEN','BINARY_CHECKSUM_MISMATCH','STORAGE_OBJECT_NOT_FOUND','get_document_upload_claim_v2','acknowledge_document_upload_v2','await fail(admin,operationId,code,expected.path)']) check(`edge:${marker}`,has(edge,marker));
check('edge_auth_required',has(edge,"return out(401,{ok:false,error:'AUTH_REQUIRED'})")&&has(edge,'userClient.auth.getUser()'));

check('ocr_failed_terminal',has(intelligence,"failed:[]")&&has(intelligence,"verified:['superseded']")&&has(intelligence,"return a.state==='verified'&&!a.stale"));
for(const marker of ['REPORT_PDF_BLANK_PAGE','REPORT_PDF_OVERFLOW','REPORT_PDF_BLOCK_TOO_TALL','REPORT_PDF_ROW_TOO_TALL','assertReportPdfPlanSafe','planReportPdfPages']) check(`report:${marker}`,has(report,marker));
for(const marker of ['rejects an executable masquerading as PDF','offline upload becomes deferred without consuming an attempt','unknown write outcome is reconciled only with the same operation identity','broken authoritative document metadata fails closed','failed OCR cannot jump to verified and stale verified OCR is unusable','long report deterministically splits across nonblank safe pages','oversized atomic report content fails closed instead of clipping','blank report pages remain forbidden']) check(`tests:${marker}`,has(tests,marker));

check('kickoff_scope',has(kickoff,'missing storage objects')&&has(kickoff,'offline/network interruption')&&has(kickoff,'A green branch alone cannot close Phase 10.6'));
const roadmapEvidenceScope=closed
  ? has(roadmap,'M7 and the Phase-10 document portion of M16 received deployed-live evidence')
  : has(roadmap,'M7 and document portion of M16 require deployed-live evidence');
check('roadmap_scope',has(roadmap,'## 10.6 — Documents Zero-Escape Gate')&&has(roadmap,'Missing/oversized/corrupt files')&&roadmapEvidenceScope);

if(closed){
  check('closure_exit',state.exitGatePassed===true&&state.phase11_1Allowed===true&&state.successorStatus==='AUTHORIZED'&&state.nextPhase==='11.1');
  check('closure_zero_blockers',state.knownCriticalBlockers===0&&state.knownHighBlockers===0&&state.knownFunctionalBlockers===0);
  check('closure_deployed_evidence',state.realCloudVerification==='PASS'&&state.realBrowserVerification==='PASS'&&state.exactMainVerification==='PASS'&&state.pagesPreviewVerification==='PASS'&&state.liveExternalVerification==='PASS');
}else{
  check('successor_locked',state.exitGatePassed===false&&state.phase11_1Allowed===false&&state.successorStatus==='LOCKED'&&state.nextPhase==='11.1');
  check('foundation_tracking',state.binarySafetyContractAdded===true&&state.serverBinaryInspectionAdded===true&&state.retryPolicyAdded===true&&state.destructionTestsAdded===true&&state.phaseGateAdded===true);
}

if(failures.length){console.error(`ENJAZ PHASE 10.6 DOCUMENTS ZERO-ESCAPE AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);process.exit(1)}
console.log(`ENJAZ PHASE 10.6 DOCUMENTS ZERO-ESCAPE AUDIT PASS — ${closed?'closure evidence is fail-closed and Phase 11.1 is authorized':'binary safety, stable retry/reconciliation, OCR/report fail-closed contracts and successor lock are enforced'}.`);
