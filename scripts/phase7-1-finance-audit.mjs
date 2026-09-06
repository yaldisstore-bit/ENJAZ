import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));
const errors = [];

const required = [
  'src/features/finance/financeModel.ts',
  'src/features/finance/financeService.ts',
  'src/features/finance/useFinance.ts',
  'src/ui-r2/finance/FinanceLedgerExperience.tsx',
  'src/ui-r2/finance/LiveFinanceProductionPortal.tsx',
  'src/ui-r2/finance/finance.css',
  'tests/financeModel.test.ts',
  'tests/financeService.test.ts',
  'docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json',
  'docs/PHASE7_1_FINANCIAL_LEDGER_NOTES.md',
];
for (const path of required) if (!exists(path)) errors.push(`missing ${path}`);

const state = JSON.parse(read('docs/PHASE7_1_FINANCIAL_LEDGER_STATE.json'));
const model = read('src/features/finance/financeModel.ts');
const service = read('src/features/finance/financeService.ts');
const dataLayer = read('src/data/createDataLayer.ts');
const portal = read('src/ui-r2/finance/LiveFinanceProductionPortal.tsx');
const productionRoot = read('src/ui-r2/runtime/UiR2ProductionRoot.tsx');
const packageJson = JSON.parse(read('package.json'));

if (state.phase !== '7.1' || state.name !== 'Financial Ledger & Summary') errors.push('Phase 7.1 machine state identity drifted');
if (state.status !== 'IN_PROGRESS' && state.status !== 'CLOSED') errors.push('Phase 7.1 state must be IN_PROGRESS or CLOSED');
if (state.startedFromMain !== '41412b2402f705449f6030b8fe414271ffbdb330') errors.push('Phase 7.1 must start from final Phase 6.4 canonical main');
if (state.readOnly !== true || state.writeOperationsAllowed !== false) errors.push('Phase 7.1 must remain read-only');
if (state.phase7_2Allowed !== false && state.status !== 'CLOSED') errors.push('Phase 7.2 must remain locked while Phase 7.1 is in progress');
if (state.status === 'IN_PROGRESS' && state.nextPhase !== null) errors.push('in-progress Phase 7.1 must not authorize a next phase');

for (const marker of [
  "RowOf<'payments'>",
  "RowOf<'payment_reversals'>",
  "RowOf<'financial_ledger_entries'>",
  "RowOf<'cashbox_accounts'>",
  'bigint',
  'FinanceUnsafeMoneyError',
  'paymentIntegrityWarnings',
  'estimatedBalanceCents',
]) if (!model.includes(marker)) errors.push(`finance model marker missing: ${marker}`);

for (const marker of ['collectTransactions', 'collectCompanies', 'collectPayments', 'collectPaymentReversals', 'collectLedger', 'collectCashboxes', 'FINANCE_SOURCE_LIMIT']) {
  if (!service.includes(marker)) errors.push(`finance source marker missing: ${marker}`);
}

for (const marker of [
  "readonly cashboxes: MutableRepository<'cashbox_accounts'>",
  "createMutableRepository(gateway, scope, 'cashbox_accounts')",
  "readonly payments: AppendOnlyRepository<'payments'>",
  "readonly ledger: AppendOnlyRepository<'financial_ledger_entries'>",
]) if (!dataLayer.includes(marker)) errors.push(`data layer finance marker missing: ${marker}`);

if (!portal.includes("useLiveRecordsPortal('finance'")) errors.push('live finance portal must activate only for finance destination');
if (!portal.includes('ConnectedFinanceLedgerExperience')) errors.push('live finance portal must render connected 7.1 experience');
if (!productionRoot.includes('<LiveFinanceProductionPortal />')) errors.push('production runtime must mount the live finance portal');

if (!packageJson.scripts?.['test:phase7-1']?.includes('financeModel.test.ts') || !packageJson.scripts?.['test:phase7-1']?.includes('financeService.test.ts')) errors.push('package test:phase7-1 is incomplete');
if (packageJson.scripts?.['audit:phase7-1:finance'] !== 'node scripts/phase7-1-finance-audit.mjs') errors.push('package finance audit script missing');
if (!packageJson.scripts?.['test:functional']?.includes('financeModel.test.ts') || !packageJson.scripts?.['test:functional']?.includes('financeService.test.ts')) errors.push('finance tests must join functional regression');
if (!packageJson.scripts?.['verify:extreme']?.includes('audit:phase7-1:finance') || !packageJson.scripts?.['verify:extreme']?.includes('test:phase7-1')) errors.push('extreme verification must include Phase 7.1');

const forbiddenWrites = ['layer.payments.create(', 'layer.paymentReversals.create(', 'layer.ledger.create(', 'layer.cashboxes.create(', 'layer.cashboxes.update('];
for (const marker of forbiddenWrites) if (service.includes(marker)) errors.push(`Phase 7.1 service must not write finance data: ${marker}`);

if (errors.length) {
  console.error('PHASE 7.1 FINANCE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('PHASE 7.1 FINANCE AUDIT PASS — authoritative read-only ledger/summary contract active; Phase 7.2 locked.');
}
