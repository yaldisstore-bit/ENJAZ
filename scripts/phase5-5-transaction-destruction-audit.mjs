import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];

const phaseState = JSON.parse(read('docs/PHASE5_5_TRANSACTION_DESTRUCTION_STATE.json'));
const r2State = JSON.parse(read('docs/UI_UX_REBIRTH_2_0_STATE.json'));
const packageJson = JSON.parse(read('package.json'));
const kickoff = read('docs/PHASE5_5_TRANSACTION_DESTRUCTION_KICKOFF.md');
const unlock = read('docs/PHASE5_5_UNLOCK_DECISION.md');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');
const workflow = read('.github/workflows/phase5-5-transaction-destruction.yml');
const destructionTest = read('tests/transactionDestructionGate.test.ts');
const editorService = read('src/features/transactions/transactionEditorService.ts');
const editorHook = read('src/features/transactions/useTransactionEditor.ts');
const lifecycleHook = read('src/features/transactions/useTransactionLifecycle.ts');
const browserSpecPath = 'tests-external/phase5-5-transaction-destruction.spec.cjs';
const browserSpec = exists(browserSpecPath) ? read(browserSpecPath) : '';
const closurePath = 'docs/PHASE5_5_TRANSACTION_DESTRUCTION_CLOSURE.md';
const closure = exists(closurePath) ? read(closurePath) : '';
const postMergePath = 'docs/PHASE5_5_POSTMERGE_RECERTIFICATION.md';
const postMerge = exists(postMergePath) ? read(postMergePath) : '';

if (phaseState.phase !== '5.5') errors.push('Phase 5.5 state must declare phase=5.5');
if (!['ACTIVE', 'CLOSED'].includes(phaseState.status)) errors.push('Phase 5.5 state must be ACTIVE or CLOSED');
if (phaseState.baseCommit !== 'defc0bf964b4446f92f6e96931f5643f586d9cfd') errors.push('Phase 5.5 must remain anchored to the recertified R2.0-11 closure base');

if (phaseState.status === 'ACTIVE') {
  if (phaseState.exitGatePassed !== false) errors.push('ACTIVE Phase 5.5 must fail closed with exitGatePassed=false');
  if (phaseState.phase6Allowed !== false) errors.push('Phase 6 must remain blocked while Phase 5.5 is ACTIVE');
  if (exists(closurePath)) errors.push('Phase 5.5 closure record cannot exist while stage state is ACTIVE');
}

if (phaseState.status === 'CLOSED') {
  if (phaseState.exitGatePassed !== true) errors.push('CLOSED Phase 5.5 requires exitGatePassed=true');
  if (phaseState.unresolvedDefectCount !== 0) errors.push('CLOSED Phase 5.5 requires unresolvedDefectCount=0');
  if (phaseState.closureEvidence !== closurePath) errors.push('CLOSED Phase 5.5 must point to the canonical closure evidence file');
  if (!exists(closurePath)) errors.push('CLOSED Phase 5.5 requires a closure evidence file');
  if (phaseState.preClosureHead !== '862d741978111050ace0944aa7957c4bc781ae1b') errors.push('CLOSED Phase 5.5 must preserve the certified pre-closure head');
  if (phaseState.preClosureCertification?.workflowCount !== 19 || phaseState.preClosureCertification?.successfulWorkflowCount !== 19) errors.push('CLOSED Phase 5.5 requires the 19/19 pre-closure workflow certification');
  if (phaseState.preClosureCertification?.phase55RunId !== 34020884861) errors.push('CLOSED Phase 5.5 must preserve the dedicated Phase 5.5 run id');
  if (phaseState.postMergeRecertification?.required !== true) errors.push('CLOSED Phase 5.5 must require post-merge main recertification');
  if (!['PENDING', 'COMPLETE'].includes(phaseState.postMergeRecertification?.status)) errors.push('postMergeRecertification status must be PENDING or COMPLETE');
  if (phaseState.postMergeRecertification?.status === 'PENDING' && phaseState.phase6Allowed !== false) errors.push('Phase 6 must remain blocked until post-merge recertification completes');

  if (phaseState.postMergeRecertification?.status === 'COMPLETE') {
    const recert = phaseState.postMergeRecertification;
    if (phaseState.phase6Allowed !== true) errors.push('Phase 6 may be allowed only after COMPLETE post-merge recertification');
    if (phaseState.nextPhase !== '6.1') errors.push('COMPLETE Phase 5.5 recertification must point to nextPhase=6.1');
    if (phaseState.postMergeEvidence !== postMergePath || !exists(postMergePath)) errors.push('COMPLETE post-merge recertification requires the canonical evidence document');
    if (recert.mainCommit !== '218a7bb85ff6098d9a3642063c6c406a57917e86') errors.push('COMPLETE post-merge recertification must preserve the certified canonical main commit');
    if (recert.verifiedWorkflowCount !== 8 || recert.successfulWorkflowCount !== 8 || recert.failedWorkflowCount !== 0) errors.push('COMPLETE post-merge recertification requires the canonical 8/8 SUCCESS, 0-failure gate set');
    const requiredRuns = {
      quality: 34021916847,
      governance: 34021916851,
      realBrowser: 34021916852,
      canonicalPromotion: 34021916853,
      wcag: 34021916855,
      pagesDeployment: 34021916549,
      pagesPreview: 34021938343,
      liveExternal: 34021965559,
    };
    for (const [name, runId] of Object.entries(requiredRuns)) {
      if (recert.runs?.[name] !== runId) errors.push(`post-merge recertification missing canonical ${name} run ${runId}`);
    }
    for (const marker of [
      'Status: **COMPLETE**',
      '218a7bb85ff6098d9a3642063c6c406a57917e86',
      '8/8 post-merge workflow runs SUCCESS; 0 failures',
      '34021916847',
      '34021916852',
      '34021965559',
      'Phase 5 — Transactions Core is CLOSED ✅',
      'Phase 6.1 — Companies is the next allowed product phase',
    ]) if (!postMerge.includes(marker)) errors.push(`Phase 5.5 post-merge evidence missing marker: ${marker}`);
  }

  for (const marker of [
    'Status: **CLOSED**',
    '862d741978111050ace0944aa7957c4bc781ae1b',
    '19/19',
    '34020884861',
    '34020884795',
    '34020884782',
    '34020884849',
    'unresolved destructive defects: **0**',
    'Phase 6 remains locked',
    'post-merge recertification',
  ]) if (!closure.includes(marker)) errors.push(`Phase 5.5 closure evidence missing marker: ${marker}`);
}

if (r2State.stage !== 'R2.0-11') errors.push('R2.0-11 must remain the closed Rebirth stage');
if (r2State.runtime !== 'ui-r2') errors.push('Canonical runtime must remain ui-r2');
if (r2State.promotion?.status !== 'CLOSED' || r2State.promotion?.allowed !== true || r2State.promotion?.exitGatePassed !== true) errors.push('R2.0-11 canonical promotion must be fully closed before Phase 5.5');
if (r2State.promotion?.canonicalMainRecertified !== true || r2State.promotion?.pagesRecertified !== true || r2State.promotion?.liveExternalRecertified !== true) errors.push('R2.0-11 main/pages/live recertification must remain true');
if (r2State.legacyEradication?.legacyZero !== true || r2State.legacyEradication?.status !== 'CLOSED') errors.push('Legacy-Zero must remain closed and true');
if (r2State.featureParity?.migratedCapabilities !== 35 || r2State.featureParity?.testedCapabilities !== 35 || r2State.featureParity?.unresolvedCapabilities !== 0) errors.push('Feature parity must remain 35/35 with zero unresolved');
if (exists('src/ui-v2') || exists('src/ui-rebirth')) errors.push('Legacy presentation directories must remain physically absent');

for (const marker of [
  'Status: **ACTIVE / NOT CLOSED**',
  'Large lists and capacity boundaries',
  'Malformed and missing relations',
  'Conflicting edits',
  'Offline and unknown-outcome failures',
  'Repeated actions',
  'Phase 6 must not start',
]) if (!kickoff.includes(marker)) errors.push(`Phase 5.5 kickoff missing marker: ${marker}`);

for (const marker of [
  'Status: **AUTHORIZED / ACTIVE**',
  'separate governance decision',
  'defc0bf964b4446f92f6e96931f5643f586d9cfd',
  'Live External recertification passed',
  'real published-app Chromium attack',
]) if (!unlock.includes(marker)) errors.push(`Phase 5.5 unlock decision missing semantic evidence marker: ${marker}`);

if (!roadmap.includes('## 5.5 — Transaction Destruction Gate')) errors.push('Master roadmap no longer contains the frozen Phase 5.5 stage');

for (const script of ['test:phase5-5', 'audit:phase5-5:transaction-destruction']) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json missing ${script}`);
}
if (!String(packageJson.scripts?.['test:functional'] ?? '').includes('transactionDestructionGate.test.ts')) errors.push('full functional regression must include the Phase 5.5 destruction gate test');
if (!String(packageJson.scripts?.['verify:extreme'] ?? '').includes('audit:phase5-5:transaction-destruction')) errors.push('verify:extreme must preserve the Phase 5.5 audit');

for (const marker of [
  'offline list failure',
  'repeated archive intent',
  'stale editor context',
  'malformed relation',
  'stable create operation id',
  'unknown outcomes',
  'activity-history-unconfirmed',
  'create-replay-detected',
  'driftedDraft',
  'TransactionEditorConflictError',
]) if (!destructionTest.includes(marker)) errors.push(`Phase 5.5 destruction test missing semantic attack marker: ${marker}`);

for (const marker of [
  'createOperationId',
  'globalThis.crypto.randomUUID()',
  'create-replay-detected',
  'replayMatches',
  'deriveOperationChildId',
  'layer.transactions.getById(operationId)',
  'layer.transactionRoutes.getById(routeId)',
  'layer.transactionNotes.getById(noteId)',
  'layer.transactionActivity.getById(activityId)',
  'sameRoute',
  'sameNote',
  'sameCreateActivity',
]) if (!editorService.includes(marker)) errors.push(`Transaction editor service missing duplicate/unknown-outcome defense: ${marker}`);

for (const [label, source] of [['editor', editorHook], ['lifecycle', lifecycleHook]]) {
  for (const marker of ['useRef', 'mutationInFlightRef.current', 'finally']) {
    if (!source.includes(marker)) errors.push(`Transaction ${label} hook missing single-flight mutation guard: ${marker}`);
  }
}
for (const marker of [
  'createOperationId',
  'outcomeUnknown',
  "setStatus(loaded ? 'ready' : 'error')",
  'setErrors(Object.freeze({ form: message }))',
  "status === 'saving' || mutationInFlightRef.current || outcomeUnknown",
  'saveTransactionEditorDraft(factory, userId, loaded, mode, draft, userId, new Date(), createOperationId)',
  'PENDING_CREATE_STORAGE_PREFIX',
  'window.sessionStorage',
  'readPendingCreate',
  'writePendingCreate',
  'clearPendingCreate',
  'preservePendingCreateRef',
  'unresolvedCreateCompanion',
  'تم استعادة محاولة إنشاء',
]) if (!editorHook.includes(marker)) errors.push(`Transaction editor hook missing safe uncertain-outcome/refresh recovery behavior: ${marker}`);

if (!browserSpec) errors.push('Phase 5.5 requires a dedicated real-browser transaction destruction spec');
for (const marker of [
  'long mixed search',
  'repeated lifecycle activation',
  'malformed transaction identity',
  'list-detail-back-lifecycle pressure',
  'assertNoHorizontalOverflow',
]) if (!browserSpec.includes(marker)) errors.push(`Phase 5.5 browser destruction spec missing attack marker: ${marker}`);

for (const marker of [
  'npm run audit:phase5-5:transaction-destruction',
  'npm run test:phase5-5',
  'npm run test:functional',
  'npm run db:audit',
  'npm run typecheck',
  'npm run build -- --base=/',
  'npm run audit:dist:budget',
  'vite.r2-preview.config.ts',
  '@playwright/test@1.55.0',
  'tests-external/phase5-5-transaction-destruction.spec.cjs',
  'Real Chromium transaction destruction',
]) if (!workflow.includes(marker)) errors.push(`Phase 5.5 workflow missing gate command: ${marker}`);

if (errors.length) {
  console.error('ENJAZ PHASE 5.5 TRANSACTION DESTRUCTION AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const recert = phaseState.status === 'CLOSED' ? phaseState.postMergeRecertification?.status : 'NOT_APPLICABLE';
  console.log(`ENJAZ PHASE 5.5 TRANSACTION DESTRUCTION AUDIT PASS — ${phaseState.status}; post-merge recertification=${recert}; Phase 6 remains ${phaseState.phase6Allowed ? 'allowed' : 'blocked'}.`);
}
