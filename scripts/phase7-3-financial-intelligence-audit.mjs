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

const failures = [];
let checks = 0;
const check = (name, condition) => { checks += 1; if (!condition) failures.push(name); };
const has = (text, value) => text.includes(value);

check('shared_exact_money_boundary_exported', has(finance, 'export function financeMoneyToCents'));
check('intelligence_reuses_exact_money_boundary', has(model, "import { buildFinanceLedgerSnapshot, financeMoneyToCents }"));
check('aging_basis_explicit', has(model, "agingBasis: 'transaction_created_at'"));
check('aging_due_date_non_fabrication', has(model, 'لا يحتوي نموذج المعاملة الحالي على تاريخ استحقاق مالي مستقل'));
check('aging_buckets_complete', ['0_30', '31_60', '61_90', '91_plus'].every((value) => has(model, `'${value}'`)));
check('attention_queue', has(model, 'attentionQueue'));
check('company_health', has(model, 'CompanyFinancialHealth') && has(model, 'healthScore'));
check('six_month_trends', has(model, 'lastSixMonths') && has(model, 'FinanceTrendPeriod'));
check('run_rate_is_directional', has(model, "confidence: 'insufficient' | 'directional'"));
check('run_rate_not_persisted', !/intelligence_snapshots|\.insert\(|\.update\(/.test(model));
check('signals_explainable', has(model, 'FinanceIntelligenceSignal') && has(model, 'explanation'));
check('unsafe_date_fail_closed', has(model, 'FinanceIntelligenceDateError'));
check('reversed_payments_excluded', has(model, 'isReversedPayment'));
check('live_portal_promotes_73', has(portal, 'ConnectedPhase73FinancialIntelligenceExperience'));
check('phase72_preserved_inside_73', has(ui, 'Phase72FinanceExperience') && has(ui, 'Phase 7.2 preserved'));
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
check('state_is_in_progress_only', has(state, 'Status: `IN_PROGRESS`') && has(state, '7.4 LOCKED') && !has(state, 'Status: `CLOSED`'));

if (failures.length) {
  console.error('Phase 7.3 audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`Phase 7.3 audit PASS (${checks} contract checks)`);
