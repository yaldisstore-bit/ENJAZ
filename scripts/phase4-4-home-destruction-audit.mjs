import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireContract = (condition, message) => { if (!condition) failures.push(message); };

const core = read('src/ui-v2/runtime/CoreApp.tsx');
const coreScreens = read('src/ui-v2/screens/CoreScreens.tsx');
const home = read('src/ui-v2/screens/HomeScreen.tsx');
const preview = read('src/features/home/homeDashboardPreview.ts');
const model = read('src/features/home/homeDashboardModel.ts');
const hook = read('src/features/home/useHomeDashboard.ts');
const styles = read('src/ui-v2/styles/home-dashboard.css');
const main = read('src/main.tsx');
const roadmap = read('docs/ENJAZ_MASTER_ROADMAP.md');

requireContract(core.includes('data-product-phase="4.4"'), 'CoreApp is not promoted to Phase 4.4 on the destruction branch');
requireContract(core.includes('ConnectedHomeScreen') && core.includes('FixtureHomeScreen'), 'Home is not routed through live + isolated preview renderers');
requireContract(!core.includes('HomeCoreScreen'), 'CoreApp still references the obsolete static Home implementation');
requireContract(!coreScreens.includes('HomeCoreScreen'), 'obsolete static HomeCoreScreen dead code still exists');
requireContract(core.includes("openDomain('transactions')"), 'Home priority navigation no longer reaches transaction context');

requireContract(home.includes('useHomeDashboard'), 'live Home lost the authoritative Home dashboard hook');
requireContract(home.includes('data-home-status="loading"'), 'Home loading state missing');
requireContract(home.includes('data-home-status="error"'), 'Home error state missing');
requireContract(home.includes('data-home-status="ready"'), 'Home ready state missing');
requireContract(home.includes('data-home-empty="true"'), 'Home empty state missing');
requireContract(home.includes('data-home-finance-precision'), 'Home precision-safe financial contract missing');
requireContract(home.includes('إعادة المحاولة'), 'Home recovery action missing');
requireContract(home.includes('precisionSafe'), 'Home no longer protects unsafe money precision');

for (const scenario of ['empty', 'dense', 'conflict', 'slow', 'offline']) {
  requireContract(preview.includes(`'${scenario}'`), `Phase 4.4 preview scenario missing: ${scenario}`);
}
requireContract(preview.includes('999_999_999_999_999.99'), 'huge-money visual destruction fixture missing');
requireContract(preview.includes('LONG_COMPANY'), 'long mixed-content destruction fixture missing');

requireContract(model.includes('rankDistinctPriorities'), 'conflicting urgency deduplication contract missing');
requireContract(model.includes('seenTransactions'), 'priority transaction-distinct guard missing');
requireContract(model.includes('HOME_PRIORITY_LIMIT'), 'bounded Home priority contract missing');
requireContract(hook.includes("status: 'loading'") && hook.includes("status: 'error'") && hook.includes("status: 'ready'"), 'live Home hook lost explicit load states');
requireContract(hook.includes('DATA_UNAVAILABLE'), 'offline/unavailable Home error mapping missing');

requireContract(main.includes("./ui-v2/styles/home-dashboard.css"), 'Home destruction styles are not loaded by the product entry');
requireContract(!styles.includes('!important'), 'Home destruction styles may not use !important');
requireContract(!/z-index\s*:\s*\d{3,}/.test(styles), 'Home destruction styles contain uncontrolled z-index escalation');
requireContract(styles.includes('overflow-wrap: anywhere'), 'long-text wrapping hardening missing');
requireContract(styles.includes('@media (max-width: 360px)'), 'narrow-phone Home hardening missing');
requireContract(styles.includes('@media (prefers-reduced-motion: reduce)'), 'Home reduced-motion hardening missing');

requireContract(roadmap.includes('## 4.4 — Home Destruction Gate'), 'frozen roadmap lost Phase 4.4');
requireContract(roadmap.includes('Empty/huge/dense datasets.'), 'Phase 4.4 empty/huge/dense requirement disappeared');
requireContract(roadmap.includes('Conflicting urgency states.'), 'Phase 4.4 urgency-conflict requirement disappeared');
requireContract(roadmap.includes('Slow/offline backend behavior.'), 'Phase 4.4 slow/offline requirement disappeared');
requireContract(roadmap.includes('Responsive and interaction torture.'), 'Phase 4.4 responsive/interactions requirement disappeared');

if (failures.length) {
  console.error('Phase 4.4 Home Destruction architecture gate FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 4.4 Home Destruction architecture gate PASS');
console.log('- live Home is connected to authoritative dashboard state');
console.log('- obsolete static Home implementation is physically removed');
console.log('- preview destruction scenarios cover empty/dense/conflict/slow/offline');
console.log('- conflicting urgency is transaction-distinct and priority output stays bounded');
console.log('- precision, long-text, narrow-screen and reduced-motion guards are present');