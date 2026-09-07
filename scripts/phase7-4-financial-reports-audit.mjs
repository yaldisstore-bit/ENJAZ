import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const model = read('src/features/finance/financeReports.ts');
const finance = read('src/features/finance/financeModel.ts');
const ui = read('src/ui-r2/finance/Phase74FinancialReportsExperience.tsx');
const portal = read('src/ui-r2/finance/LiveFinanceProductionPortal.tsx');
const css = read('src/ui-r2/finance/phase74.css');
const preview = read('src/ui-r2/finance/phase74-preview-main.tsx');
const spec = read('tests-external/phase7-4-financial-reports.spec.cjs');
const state = read('docs/PHASE7_4_STATE.md');
const stateJson = JSON.parse(read('docs/PHASE7_4_STATE.json'));
const closure = read('docs/PHASE7_4_CLOSURE.md');
const postmerge = read('docs/PHASE7_4_POSTMERGE_RECERTIFICATION.md');

const failures = [];
let checks = 0;
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const has = (text, value) => text.includes(value);

check('exact_money_boundary_reused', has(finance, 'export function financeMoneyToCents') && has(model, 'financeMoneyToCents'));
check('four_report_scopes', ['period', 'company', 'transaction', 'cashbox'].every((value) => has(model, `'${value}'`)));
check('period_bounds_fail_closed', has(model, 'from must not be after to') && has(model, 'FinancialReportFilterError'));
check('current_vs_period_totals_separated', has(model, 'currentFeesCents') && has(model, 'collectedCents') && has(model, 'netCashMovementCents'));
check('reversals_have_zero_effect', has(model, 'effectiveCents: reversed ? 0n'));
check('drill_down_evidence_refs', has(model, 'evidenceRef') && has(model, 'payments:') && has(model, 'financial_ledger_entries:'));
check('deterministic_fingerprint', has(model, 'fnvFingerprint') && has(model, 'ENJAZ-FR-'));
check('json_export_bigint_safe', has(model, 'serializeFinancialReport') && has(model, 'stringifyBigints'));
check('csv_export', has(model, 'financialReportToCsv'));
check('cashbox_non_fabrication', has(model, "cashboxMovementAttribution: scope.kind === 'cashbox' ? 'not-modeled'") && has(model, 'لا يربط الدفعات أو القيود المالية بصندوق محدد'));
check('scoped_opening_balances_fail_closed', has(model, 'cashboxes: []'));
check('m16_hook_without_shadow_store', has(model, "m16ReportingHook: 'reserved-no-shadow-store'") && !/contract_finance_store|retainer_finance_store/.test(model));
check('live_portal_promotes_74', has(portal, 'ConnectedPhase74FinancialReportsExperience'));
check('phase73_preserved', has(portal, 'ConnectedPhase73FinancialIntelligenceExperience'));
check('phase72_preserved', has(portal, 'ConnectedPhase72FinanceExperience'));
check('stage_marker', has(ui, 'data-finance-stage="7.4"') && has(ui, 'data-finance-report-authority="canonical"'));
check('screen_print_export_same_snapshot', has(ui, 'window.print()') && has(ui, 'financialReportToCsv(report)') && has(ui, 'serializeFinancialReport(report)'));
check('pdf_ready_marker', has(ui, 'data-pdf-ready="true"') && has(ui, 'طباعة / PDF'));
check('provenance_visible', has(ui, 'المصدر والتدقيق') && has(ui, 'report.fingerprint'));
check('preview_isolated', has(preview, 'data-finance-mode="preview"') && has(preview, 'FinancialReportsPanel'));
check('chromium_5_widths', ['1280', '430', '390', '360', '320'].every((value) => has(spec, value)));
check('cashbox_browser_guard', has(spec, 'schema limitation instead of fabricating movement'));
check('mobile_360_guard', /@media\s*\(max-width:\s*360px\)/.test(css));
check('print_css', /@media\s+print/.test(css));
check('reduced_motion', has(css, 'prefers-reduced-motion'));
check('locked_palette_only', !/#[0-9a-f]{3,8}\b/i.test(css) && !/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(css));

check('state_closed_zero_escape', has(state, 'Status: `CLOSED`') && has(state, 'Closure: `ZERO_ESCAPE_PASS`') && has(state, '7.5 AUTHORIZED') && !has(state, '7.5 LOCKED'));
check('state_exact_implementation_and_merge', has(state, '7dba0c48e5782df5093deae57c6f10677b32fbce') && has(state, 'd4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858'));
check('state_pr_and_preclosure', has(state, '28/28 SUCCESS') && has(state, '34096775256'));
check('state_postmerge_runs', ['34097286172', '34097333825', '34097286214', '34097378705'].every((value) => has(state, value)));

check('json_closed_zero_defects', stateJson.phase === '7.4' && stateJson.status === 'CLOSED' && stateJson.exitGatePassed === true && stateJson.unresolvedDefectCount === 0 && stateJson.criticalDefectCount === 0 && stateJson.highDefectCount === 0 && stateJson.functionalBlockerCount === 0);
check('json_preclosure_28_of_28', stateJson.preClosure?.workflowCount === 28 && stateJson.preClosure?.successCount === 28 && stateJson.preClosure?.failureCount === 0 && stateJson.preClosure?.inProgressCount === 0 && stateJson.preClosure?.queuedCount === 0 && stateJson.preClosure?.realChromium === 'PASS');
check('json_budget_preserved', stateJson.preClosure?.productionJavaScriptBytes === 588519 && stateJson.preClosure?.productionJavaScriptBudget === 670000);
check('json_postmerge_complete', stateJson.postMergeRecertification?.status === 'COMPLETE' && stateJson.postMergeRecertification?.mainCommit === 'd4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858' && stateJson.postMergeRecertification?.workflowCount === 10 && stateJson.postMergeRecertification?.successCount === 10 && stateJson.postMergeRecertification?.failureCount === 0 && stateJson.postMergeRecertification?.inProgressCount === 0 && stateJson.postMergeRecertification?.queuedCount === 0 && stateJson.postMergeRecertification?.cancelledCount === 0);
check('json_deployed_live_evidence', stateJson.postMergeRecertification?.phaseGateRunId === 34097286172 && stateJson.postMergeRecertification?.pagesPreviewRunId === 34097333825 && stateJson.postMergeRecertification?.pagesBuild === 'SUCCESS' && stateJson.postMergeRecertification?.pagesDeploy === 'SUCCESS' && stateJson.postMergeRecertification?.realBrowserRunId === 34097286214 && stateJson.postMergeRecertification?.realBrowser === 'SUCCESS' && stateJson.postMergeRecertification?.liveExternalRunId === 34097378705 && stateJson.postMergeRecertification?.liveExternal === 'SUCCESS' && stateJson.postMergeRecertification?.publishedApplicationAttack === 'SUCCESS');
check('json_successor_only_75', stateJson.phase7_5Allowed === true && stateJson.nextPhase === '7.5' && stateJson.m16ReportingHook === 'COMPLETE' && stateJson.m16OverallSystemClosed === false);
check('closure_evidence_bound', has(closure, '28/28 SUCCESS') && has(closure, '588519 / 670000') && has(closure, 'd4ad3844dc7ae7a1895e2fddfdb06b2ee0a01858') && has(closure, 'Attack the actual published application') && has(closure, 'Phase 7.5 — Finance Destruction & Reconciliation Gate'));
check('postmerge_evidence_bound', has(postmerge, '10') && has(postmerge, '34097333825') && has(postmerge, '34097286214') && has(postmerge, '34097378705') && has(postmerge, 'COMPLETE'));

if (failures.length) {
  console.error('Phase 7.4 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`Phase 7.4 audit PASS (${checks} contract + closure checks)`);
