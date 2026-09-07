import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const model = read('src/features/finance/financeIntelligence.ts');
const finance = read('src/features/finance/financeModel.ts');
const ui = read('src/ui-r2/finance/Phase73FinancialIntelligenceExperience.tsx');
const portal = read('src/ui-r2/finance/LiveFinanceProductionPortal.tsx');
const css = read('src/ui-r2/finance/phase73.css');
const preview = read('src/ui-r2/finance/phase73-preview-main.tsx');
const spec = read('tests-external/phase7-3-financial-intelligence.spec.cjs');
const state = read('docs/PHASE7_3_STATE.md');
const closureState = JSON.parse(read('docs/PHASE7_3_STATE.json'));
const closure = read('docs/PHASE7_3_CLOSURE.md');
const recertification = read('docs/PHASE7_3_POSTMERGE_RECERTIFICATION.md');

const failures = [];
let checks = 0;
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const has = (text, value) => text.includes(value);

check('shared_exact_money_boundary_exported', has(finance, 'export function financeMoneyToCents'));
check('intelligence_reuses_exact_money_boundary', has(model, "import { buildFinanceLedgerSnapshot, financeMoneyToCents }"));
check('aging_basis_explicit', has(model, "agingBasis:'transaction_created_at'"));
check('aging_due_date_non_fabrication', has(model, 'لا يحتوي نموذج المعاملة الحالي على تاريخ استحقاق مالي مستقل'));
check('aging_buckets_complete', ['0_30', '31_60', '61_90', '91_plus'].every((value) => has(model, `'${value}'`)));
check('attention_queue', has(model, 'attentionQueue'));
check('company_health', has(model, 'CompanyFinancialHealth') && has(model, 'healthScore'));
check('six_month_trends', has(model, 'length:6') && has(model, 'FinanceTrendPeriod'));
check('run_rate_is_directional', has(model, "'directional'|'insufficient'") && has(model, 'samplePaymentCount'));
check('run_rate_not_persisted', !/intelligence_snapshots|\.insert\(|\.update\(/.test(model));
check('signals_explainable', has(model, 'FinanceIntelligenceSignal') && has(model, 'explanation'));
check('unsafe_date_fail_closed', has(model, 'FinanceIntelligenceDateError'));
check('reversed_payments_excluded', has(model, "p.status==='reversed'") && has(model, 'paymentReversals.some'));
check('live_portal_promotes_73', has(portal, 'ConnectedPhase73FinancialIntelligenceExperience'));
check('phase72_preserved_as_live_sibling', has(portal, 'ConnectedPhase72FinanceExperience') && has(portal, '<ConnectedPhase72FinanceExperience />'));
check('stage_marker', has(ui, 'data-finance-stage="7.3"') && has(ui, 'data-m13-finance-anchor="true"'));
check('m13_not_falsely_closed', !has(ui, 'M13 CLOSED') && has(ui, 'M13 finance anchor'));
check('ui_has_aging', has(ui, 'عمر الأرصدة المفتوحة'));
check('ui_has_collection_trend', has(ui, 'اتجاه التحصيل'));
check('ui_has_attention', has(ui, 'أولوية التحصيل'));
check('ui_has_company_health', has(ui, 'الصحة المالية للشركات'));
check('ui_has_explainable_signals', has(ui, 'الإشارات والتفسير'));
check('forecast_disclaimer', has(ui, 'ليس توقعاً مضموناً'));
check('preview_isolated', has(preview, 'data-finance-mode="preview"') && has(preview, 'buildFinancialIntelligenceSnapshot'));
check('chromium_5_widths', ['1280', '430', '390', '360', '320'].every((value) => has(spec, value)));
check('mobile_360_guard', /@media\s*\(max-width:\s*360px\)/.test(css));
check('reduced_motion', has(css, 'prefers-reduced-motion'));
check('locked_palette_only', !/#[0-9a-f]{3,8}\b/i.test(css) && !/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(css));

check('state_is_canonically_closed', has(state, 'Status: `CLOSED`') && has(state, 'Closure: `ZERO_ESCAPE_PASS`') && has(state, '7.4 AUTHORIZED') && has(state, 'Post-merge recertification: `COMPLETE`') && !has(state, 'Status: `IN_PROGRESS`'));
check('machine_state_closed_zero_escape', closureState.phase === '7.3' && closureState.status === 'CLOSED' && closureState.exitGatePassed === true && closureState.unresolvedDefectCount === 0);
check('machine_state_exact_implementation', closureState.implementationHead === 'b99a39d9b4553604b49528faffdd798104042ffb' && closureState.preClosure?.workflowCount === 27 && closureState.preClosure?.successCount === 27 && closureState.preClosure?.realChromium === 'PASS');
check('machine_state_canonical_recertification', closureState.mergeCommit === 'a1c34888732270bea5795ac59603345c190b8fd7' && closureState.postMergeRecertification?.status === 'COMPLETE' && closureState.postMergeRecertification?.mainCommit === 'a1c34888732270bea5795ac59603345c190b8fd7' && closureState.postMergeRecertification?.workflowCount === 12 && closureState.postMergeRecertification?.successCount === 12 && closureState.postMergeRecertification?.failureCount === 0 && closureState.postMergeRecertification?.inProgressCount === 0 && closureState.postMergeRecertification?.queuedCount === 0 && closureState.postMergeRecertification?.cancelledCount === 0);
check('machine_state_deployed_live_evidence', closureState.postMergeRecertification?.pagesPreviewRunId === 34092324197 && closureState.postMergeRecertification?.pagesDeploymentRunId === 34092283834 && closureState.postMergeRecertification?.realBrowserRunId === 34092284382 && closureState.postMergeRecertification?.liveExternalRunId === 34092363985 && closureState.postMergeRecertification?.publishedApplicationAttack === 'SUCCESS');
check('m13_anchor_only_closed', closureState.m13FinanceAnchor === 'COMPLETE' && closureState.m13OverallSystemClosed === false);
check('phase74_is_only_successor', closureState.phase7_4Allowed === true && closureState.nextPhase === '7.4');
check('closure_evidence_bound', has(closure, 'CLOSED + POST-MERGE RECERTIFIED') && has(closure, 'a1c34888732270bea5795ac59603345c190b8fd7') && has(closure, 'Gate Escape') && has(closure, '147 bytes'));
check('postmerge_evidence_bound', has(recertification, 'COMPLETE / PASS') && has(recertification, '12') && has(recertification, '34092363985') && has(recertification, 'Attack the actual published application'));

if (failures.length) {
  console.error('Phase 7.3 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`Phase 7.3 audit PASS (${checks} contract + closure checks)`);
