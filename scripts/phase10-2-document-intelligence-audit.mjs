import fs from 'node:fs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const state = readJson('docs/PHASE10_2_STATE.json');
const predecessor = readJson('docs/PHASE10_1_STATE.json');
const failures = [];
const check = (name, condition) => { if (!condition) failures.push(name); };

check('phase_identity', state.phase === '10.2' && state.name === 'Document Intelligence / OCR' && state.status === 'IN_PROGRESS');
check('exact_base', state.baseCommit === '939783b2fc084c06fd9a214654355c42c30473f4');
check('predecessor_closed', state.predecessorPhase === '10.1' && state.predecessorStatus === 'CLOSED' && predecessor.status === 'CLOSED' && predecessor.exitGatePassed === true && predecessor.phase10_2Allowed === true);
check('source_authority', state.sourceAuthority === 'SOURCE_FILE_REMAINS_AUTHORITATIVE' && state.extractedContentMayReplaceSource === false && state.sourceOverwriteAllowed === false);
check('no_silent_promotion', state.silentAuthorityPromotionAllowed === false && /UNVERIFIED/.test(state.ocrOutputAuthority));
check('governed_flow', Array.isArray(state.extractionFlow) && state.extractionFlow.join('>') === 'EXTRACT>REVIEW>VERIFY');
check('traceability', state.provenanceRequired === true && state.pageReferenceRequired === true && state.confidenceRequired === true && state.verificationStateRequired === true);
check('explicit_failure', state.failureMustBeExplicit === true);
check('vault_boundary', state.storageBoundary === 'PRIVATE_SIGNED_BROKER_ONLY' && state.sourceAuthorityTables?.join(',') === 'documents,document_versions');
check('budgets_frozen', state.javascriptBudgetBytes === 670000 && state.totalJavascriptBudgetBytes === 760000 && state.cssBudgetBytes === 180000 && state.budgetIncreaseAllowed === false);
check('successor_locked', state.exitGatePassed === false && state.phase10_3Allowed === false && state.nextPhase === '10.3' && state.successorStatus === 'LOCKED');
check('kickoff_present', fs.existsSync('docs/PHASE10_2_KICKOFF.md'));

if (failures.length) {
  console.error(`ENJAZ PHASE 10.2 KICKOFF AUDIT FAIL (${failures.length})\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('ENJAZ PHASE 10.2 KICKOFF AUDIT PASS — source authority preserved, OCR is derived, EXTRACT→REVIEW→VERIFY enforced, Phase 10.3 locked.');
