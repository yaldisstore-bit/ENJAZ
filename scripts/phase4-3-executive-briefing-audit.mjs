import fs from 'node:fs/promises';

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 4.3 Executive Briefing audit FAIL: ${message}`);
}
async function read(file) { return fs.readFile(file, 'utf8'); }

const core = await read('src/ui-v2/runtime/CoreApp.tsx');
const model = await read('src/features/executive-briefing/executiveBriefingModel.ts');
const service = await read('src/features/executive-briefing/executiveBriefingService.ts');
const hook = await read('src/features/executive-briefing/useExecutiveBriefing.ts');
const preview = await read('src/features/executive-briefing/executiveBriefingPreview.ts');
const screen = await read('src/ui-v2/screens/ExecutiveBriefingScreen.tsx');
const entry = await read('src/ui-v2/screens/ExecutiveBriefingEntry.tsx');
const css = await read('src/ui-v2/styles/executive-briefing.css');

assert(core.includes('data-stage="ui-10"'), 'frozen UI-10 visual marker changed');
assert(core.includes('data-product-phase="4.3"'), 'Phase 4.3 product marker is missing');
assert(core.includes('<ConnectedExecutiveBriefingScreen'), 'live Executive Briefing is not mounted');
assert(core.includes('<FixtureExecutiveBriefingScreen'), 'safe preview Executive Briefing is not mounted');
assert(core.includes('<ExecutiveBriefingEntry'), 'Home entry point is missing');
assert(core.includes("destination === 'transactions'"), 'transaction decision navigation is missing');
assert(core.includes("destination === 'today'"), 'Daily Work decision navigation is missing');
assert(core.includes("setActiveTab(destination === 'today' ? 'today' : 'finance')"), 'Finance/Daily Work navigation is not explicit');

assert(model.includes("import type { DailyWorkSnapshot }"), 'Daily Work source contract is not composed');
assert(model.includes("import type { HomeDashboardSnapshot"), 'Home source contract is not composed');
assert(!model.toLowerCase().includes('supabase'), 'Executive model directly depends on Supabase');
assert(model.includes('precisionSafe'), 'financial precision guard disappeared');
assert(model.includes("payment.status === 'posted'"), 'posted-only payment rule disappeared');
assert(model.includes('postedPrevious7d'), 'prior seven-day comparison window disappeared');
assert(model.includes('decisions.slice(0, 4)'), 'executive decision list is not bounded');

assert(service.includes('loadHomeDashboard'), 'service does not reuse authoritative Home calculations');
assert(service.includes('loadDailyWork'), 'service does not reuse authoritative Daily Work calculations');
assert(service.includes("{ column: 'status', operator: 'eq', value: 'posted' }"), 'service does not constrain payment pulse to posted rows');
assert(service.includes("{ column: 'paid_at', operator: 'gte'"), 'service does not constrain the 14-day payment window');
assert(!service.includes('createClient('), 'service bypasses the preserved Data Layer');
assert(!hook.includes('createClient('), 'hook bypasses the preserved Data Layer');

for (const marker of ['data-core-screen="executive-briefing"', 'data-executive-panel="risk"', 'data-executive-panel="workload"', 'data-executive-panel="finance"', 'data-executive-decisions="true"']) {
  assert(screen.includes(marker), `screen marker missing: ${marker}`);
}
for (const label of ['الملخص التنفيذي', 'المخاطر والعوائق', 'ضغط العمل', 'النبضة المالية', 'فتح صندوق العمل', 'فتح المالية']) {
  assert(screen.includes(label), `user-facing Executive Briefing content missing: ${label}`);
}
assert(screen.includes('تعذر تجهيز الملخص التنفيذي'), 'error state is missing');
assert(screen.includes('جارٍ تجهيز الملخص التنفيذي'), 'loading state is missing');
assert(preview.includes('buildExecutiveBriefingPreviewSnapshot'), 'isolated preview fixture is missing');
assert(!entry.includes('>4.3<'), 'developer phase number leaked into Home entry');
assert(!screen.includes('preview-'), 'preview identifiers leaked into user-facing screen source');

assert(css.includes('min-height: 76px'), 'decision touch target resilience is missing');
assert(css.includes('@media (max-width: 560px)'), 'mobile briefing hardening is missing');
assert(css.includes('overflow-wrap: anywhere'), 'long executive content wrapping contract is missing');

console.log('Phase 4.3 Executive Briefing audit PASS');
console.log('- Home + Daily Work are composed instead of reimplemented');
console.log('- financial pulse is limited to posted payments and two seven-day windows');
console.log('- live and preview runtimes remain isolated');
console.log('- loading/error/precision/mobile contracts remain explicit');
