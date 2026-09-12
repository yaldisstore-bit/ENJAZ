import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];
const requireMarker = (source, marker, label) => { if (!source.includes(marker)) errors.push(`${label} missing marker: ${marker}`); };

const paths = {
  state: 'docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json',
  notes: 'docs/PHASE7_1_FINANCIAL_LEDGER_NOTES.md',
  closure: 'docs/PHASE7_1_FINANCIAL_LEDGER_CLOSURE.md',
  postMerge: 'docs/PHASE7_1_POSTMERGE_RECERTIFICATION.md',
  model: 'src/features/finance/financeModel.ts',
  service: 'src/features/finance/financeService.ts',
  hooks: 'src/features/finance/useFinance.ts',
  experience: 'src/ui-r2/finance/FinanceLedgerExperience.tsx',
  portal: 'src/ui-r2/finance/LiveFinanceProductionPortal.tsx',
  lazyPortals: 'src/ui-r2/runtime/LazyLiveProductionPortals.tsx',
  phase72: 'src/ui-r2/finance/Phase72FinanceExperience.tsx',
  phase73: 'src/ui-r2/finance/Phase73FinancialIntelligenceExperience.tsx',
  css: 'src/ui-r2/finance/finance.css',
  preview: 'src/ui-r2/finance/financePreviewSnapshot.ts',
};

for (const path of [paths.state, paths.notes, paths.model, paths.service, paths.hooks, paths.experience, paths.portal, paths.lazyPortals, paths.css, paths.preview, 'tests/financeModel.test.ts', 'tests/financeService.test.ts']) {
  if (!exists(path)) errors.push(`missing ${path}`);
}
if (errors.length) {
  console.error('PHASE 7.1 FINANCE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const state = JSON.parse(read(paths.state));
const model = read(paths.model);
const service = read(paths.service);
const dataLayer = read('src/data/createDataLayer.ts');
const portal = read(paths.portal);
const lazyPortals = read(paths.lazyPortals);
const phase72 = exists(paths.phase72) ? read(paths.phase72) : '';
const phase73 = exists(paths.phase73) ? read(paths.phase73) : '';
const productionRoot = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const packageJson = JSON.parse(read('package.json'));

if (state.phase !== '7.1' || state.name !== 'Financial Ledger & Summary') errors.push('Phase 7.1 machine state identity drifted');
if (!['IN_PROGRESS', 'CLOSED'].includes(state.status)) errors.push('Phase 7.1 state must be IN_PROGRESS or CLOSED');
if (state.startedFromMain !== '41412b2402f705449f6030b8fe414271ffbdb330') errors.push('Phase 7.1 must start from final Phase 6.4 canonical main');
if (state.readOnly !== true || state.writeOperationsAllowed !== false) errors.push('Phase 7.1 must remain read-only');
if (state.moneyRepresentation !== 'bigint-cents') errors.push('Phase 7.1 money boundary must remain bigint-cents');
if (state.productionJavaScriptBudget != null && state.productionJavaScriptBudget !== 670000) errors.push('Phase 7.1 must preserve the 670000-byte production JavaScript budget');

if (state.status === 'IN_PROGRESS') {
  if (state.exitGatePassed !== false || state.phase7_2Allowed !== false || state.nextPhase !== null) errors.push('in-progress Phase 7.1 must fail closed and keep Phase 7.2 locked');
}

if (state.status === 'CLOSED') {
  if (state.exitGatePassed !== true || state.unresolvedDefectCount !== 0) errors.push('closed Phase 7.1 requires exitGatePassed and zero unresolved defects');
  if (state.closureEvidence !== paths.closure || !exists(paths.closure)) errors.push('closed Phase 7.1 requires canonical closure evidence');
  if (state.implementationHead !== '0ac2174272d7ac0e5f79020ed78ad3872177af31') errors.push('Phase 7.1 closure must preserve the certified implementation head');
  if (state.preClosure?.workflowCount !== 24 || state.preClosure?.successCount !== 24 || state.preClosure?.failureCount !== 0) errors.push('Phase 7.1 closure requires 24/24 pre-closure workflows with zero failures');
  if (state.preClosure?.productionJavaScriptBytes !== 628924) errors.push('Phase 7.1 certified production JavaScript size drifted');
  if (state.preClosure?.phase71Run !== 34046837319 || state.preClosure?.qualityRun !== 34046837354 || state.preClosure?.governanceRun !== 34046837385 || state.preClosure?.canonicalPromotionRun !== 34046837350 || state.preClosure?.wcagRun !== 34046837380 || state.preClosure?.operationalIntelligenceRun !== 34046837347 || state.preClosure?.destructionRun !== 34046837394 || state.preClosure?.phase64Run !== 34046837407 || state.preClosure?.realBrowserRun !== 34046837307) errors.push('Phase 7.1 key pre-closure workflow evidence drifted');

  const closure = read(paths.closure);
  for (const marker of ['0ac2174272d7ac0e5f79020ed78ad3872177af31','24/24 pull-request workflows SUCCESS','628924/670000','11/11 PASS','164/164 PASS','34046837319','34046837347','34046837307','unresolvedDefectCount=0']) requireMarker(closure, marker, 'Phase 7.1 closure evidence');

  const recert = state.postMergeRecertification;
  if (recert?.required !== true || !['PENDING', 'COMPLETE'].includes(recert?.status)) errors.push('closed Phase 7.1 requires explicit post-merge recertification state');
  if (recert?.status === 'PENDING') {
    if (state.phase7_2Allowed !== false || state.nextPhase !== null) errors.push('Phase 7.2 must remain locked while Phase 7.1 post-merge recertification is pending');
    for (const marker of ['Status: **CLOSED — post-merge recertification pending**','postMergeRecertification.status=PENDING','phase7_2Allowed=false','Phase 7.2 — Payments & Receipts remains locked']) requireMarker(closure, marker, 'pending Phase 7.1 closure evidence');
  }
  if (recert?.status === 'COMPLETE') {
    if (state.phase7_2Allowed !== true || state.nextPhase !== '7.2') errors.push('Phase 7.2 may be authorized only after Phase 7.1 canonical recertification completes');
    if (recert.successCount !== recert.workflowCount || recert.failureCount !== 0 || recert.inProgressCount !== 0) errors.push('completed Phase 7.1 recertification requires every recorded canonical workflow to succeed');
    if (!state.postMergeEvidence || state.postMergeEvidence !== paths.postMerge || !exists(paths.postMerge)) errors.push('completed Phase 7.1 recertification requires canonical post-merge evidence');
    const postMerge = exists(paths.postMerge) ? read(paths.postMerge) : '';
    for (const marker of ['Status: **COMPLETE**','Attack the actual published application','phase7_2Allowed=true','Phase 7.2 — Payments & Receipts']) requireMarker(postMerge, marker, 'Phase 7.1 post-merge evidence');
  }
}

for (const marker of ["RowOf<'payments'>", "RowOf<'payment_reversals'>", "RowOf<'financial_ledger_entries'>", "RowOf<'cashbox_accounts'>", 'bigint', 'FinanceUnsafeMoneyError', 'paymentIntegrityWarnings', 'estimatedBalanceCents']) {
  if (!model.includes(marker)) errors.push(`finance model marker missing: ${marker}`);
}

if (!service.includes('async function collect<T>') || !service.includes('FINANCE_BATCH_SIZE') || !service.includes('FINANCE_SOURCE_LIMIT')) errors.push('finance source must use the bounded shared paginator');
for (const marker of ["collect('transactions'", "collect('companies'", "collect('payments'", "collect('payment_reversals'", "collect('financial_ledger_entries'", "collect('cashbox_accounts'"]) {
  if (!service.includes(marker)) errors.push(`finance authoritative source missing: ${marker}`);
}
if (!service.includes('if (!page.items.length) throw new FinanceSourcePageStalledError')) errors.push('finance paginator must fail closed on stalled pages');
if (!service.includes('if (rows.length > FINANCE_SOURCE_LIMIT) throw new FinanceSourceCapacityError')) errors.push('finance paginator must fail closed above source ceiling');

for (const marker of [
  "readonly cashboxes: MutableRepository<'cashbox_accounts'>",
  "createMutableRepository(gateway, scope, 'cashbox_accounts')",
  "readonly payments: AppendOnlyRepository<'payments'>",
  "readonly ledger: AppendOnlyRepository<'financial_ledger_entries'>",
]) if (!dataLayer.includes(marker)) errors.push(`data layer finance marker missing: ${marker}`);

if (!portal.includes("useLiveRecordsPortal('finance'")) errors.push('live finance portal must activate only for finance destination');
const phase72Preserves71 = phase72.includes("import { FinanceLedgerExperience } from './FinanceLedgerExperience.tsx';")
  && phase72.includes('const loaded = await loadFinanceSource(factory, userId);')
  && phase72.includes('const snapshot = buildFinanceLedgerSnapshot(loaded.source);')
  && phase72.includes('<FinanceLedgerExperience snapshot={snapshot} mode={mode} />');
const direct71Portal = portal.includes('ConnectedFinanceLedgerExperience');
const forward72Preserves71 = portal.includes('ConnectedPhase72FinanceExperience') && phase72Preserves71;
const forward73Preserves71 = portal.includes('ConnectedPhase73FinancialIntelligenceExperience')
  && phase73.includes("import { Phase72FinanceExperience")
  && phase73.includes('<Phase72FinanceExperience')
  && phase72Preserves71;
if (!direct71Portal && !forward72Preserves71 && !forward73Preserves71) errors.push('live finance portal must preserve the connected 7.1 ledger contract directly or through a verified later-phase composition chain');
const lazyRouterMounted = productionRoot.includes("import { LazyLiveProductionPortals } from './LazyLiveProductionPortals.tsx';")
  && productionRoot.includes('<LazyLiveProductionPortals')
  && productionRoot.includes('regulatoryKnowledge={regulatoryKnowledge}')
  && productionRoot.includes('regulatoryWorkspace={workspace}');
const lazyFinanceMount = lazyRouterMounted
  && lazyPortals.includes("import('../finance/LiveFinanceProductionPortal.tsx')")
  && lazyPortals.includes('module.LiveFinanceProductionPortal')
  && lazyPortals.includes("value === 'finance' || value === 'risk'")
  && lazyPortals.includes("destination === 'finance' || destination === 'risk' ? <FinancePortal />");
if (!productionRoot.includes('<LiveFinanceProductionPortal />') && !lazyFinanceMount) errors.push('production runtime must mount the live finance portal directly or through the verified lazy production-portal router');

if (!packageJson.scripts?.['test:phase7-1']?.includes('financeModel.test.ts') || !packageJson.scripts?.['test:phase7-1']?.includes('financeService.test.ts')) errors.push('package test:phase7-1 is incomplete');
if (packageJson.scripts?.['audit:phase7-1:finance'] !== 'node scripts/phase7-1-finance-audit.mjs') errors.push('package finance audit script missing');
if (!packageJson.scripts?.['test:functional']?.includes('financeModel.test.ts') || !packageJson.scripts?.['test:functional']?.includes('financeService.test.ts')) errors.push('finance tests must join functional regression');
if (!packageJson.scripts?.['verify:extreme']?.includes('audit:phase7-1:finance') || !packageJson.scripts?.['verify:extreme']?.includes('test:phase7-1')) errors.push('extreme verification must include Phase 7.1');

const forbiddenWrites = ['layer.payments.create(', 'layer.paymentReversals.create(', 'layer.ledger.create(', 'layer.cashboxes.create(', 'layer.cashboxes.update('];
for (const marker of forbiddenWrites) if (service.includes(marker)) errors.push(`Phase 7.1 service must not write finance data: ${marker}`);

if (errors.length) {
  console.error(`PHASE 7.1 FINANCE AUDIT FAIL (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  const recert = state.postMergeRecertification?.status ?? 'N/A';
  console.log(`PHASE 7.1 FINANCE AUDIT PASS — ${state.status}; recert=${recert}; authoritative read-only ledger/summary contract preserved through current finance composition; Phase 7.2 ${state.phase7_2Allowed ? 'authorized' : 'locked'}.`);
}
