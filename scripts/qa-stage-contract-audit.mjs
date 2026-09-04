import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const requireContract = (condition, message) => { if (!condition) failures.push(message); };

const quality = read('.github/workflows/enjaz-quality-gate.yml');
const browser = read('.github/workflows/enjaz-browser-acceptance.yml');
const pages = read('.github/workflows/enjaz-pages-preview.yml');
const live = read('.github/workflows/enjaz-live-external-gate.yml');
const phase43 = read('.github/workflows/phase4-3-executive-briefing.yml');
const phase44 = read('.github/workflows/phase4-4-home-destruction.yml');
const stageDeltaAudit = read('scripts/qa-stage-delta-audit.mjs');
const constitution = read('docs/QA_STAGE_CONSTITUTION.md');
const pkg = JSON.parse(read('package.json'));

for (const [name, source] of [
  ['quality', quality],
  ['browser', browser],
  ['pages', pages],
  ['live', live],
  ['phase43', phase43],
  ['phase44', phase44],
]) {
  requireContract(!/continue-on-error\s*:\s*true/i.test(source), `${name}: continue-on-error is forbidden`);
}

requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(quality), 'quality gate must run on push to main');
requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(quality), 'quality gate must run on PRs to main');
requireContract(quality.includes('QA stage contract lock'), 'quality gate must audit its own QA contract');
requireContract(quality.includes('Stage-specific test expansion gate'), 'quality gate must require stage-specific test expansion');
requireContract(quality.includes('fetch-depth: 0'), 'quality checkout must keep history for stage delta comparison');

const requiredQualityTokens = [
  'audit:qa:stage-contract',
  'audit:qa:stage-delta',
  'audit:ui-v2:boundary',
  'audit:ui-v2:dna',
  'ui4-shell-audit.mjs',
  'ui5-composition-audit.mjs',
  'ui6-core-audit.mjs',
  'ui7-domain-audit.mjs',
  'ui8-states-audit.mjs',
  'ui9-mobile-audit.mjs',
  'ui10-freeze-audit.mjs',
  'phase4-2-daily-work-audit.mjs',
  'phase4-3-executive-briefing-audit.mjs',
  'phase4-4-home-destruction-audit.mjs',
  'test:functional',
  'audit:secrets',
  'db:audit',
  'db:audit:selftest',
  'audit:roadmap',
  'typecheck',
  'npm run build',
  'audit:dist:budget',
  'test -f dist/index.html',
];
for (const token of requiredQualityTokens) requireContract(quality.includes(token), `quality gate missing mandatory canonical token: ${token}`);
requireContract(quality.includes('Canonical Main Integrity + UI V2 + Production Build'), 'quality gate must identify the canonical UI V2 runtime');

requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(browser), 'browser gate must run on PRs to main');
requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(browser), 'browser gate must run on push to main');
requireContract(browser.includes('QA stage contract lock'), 'browser gate must self-audit the QA stage contract');
requireContract(browser.includes('Canonical UI V2 source contract'), 'browser gate must validate canonical UI V2 before Chromium');
requireContract(browser.includes('audit:ui-v2:boundary'), 'browser gate lost UI V2 boundary audit');
requireContract(browser.includes('audit:ui-v2:dna'), 'browser gate lost UI V2 DNA audit');
requireContract(browser.includes('ui10-freeze-audit.mjs'), 'browser gate lost UI-10 freeze audit');
requireContract(browser.includes('phase4-2-daily-work-audit.mjs'), 'browser gate lost Phase 4.2 architecture audit');
requireContract(browser.includes('phase4-3-executive-briefing-audit.mjs'), 'browser gate lost Phase 4.3 architecture audit');
requireContract(browser.includes('phase4-4-home-destruction-audit.mjs'), 'browser gate lost Phase 4.4 Home destruction audit');
requireContract(browser.includes('@playwright/test@1.55.0'), 'Playwright version must remain pinned');
requireContract(browser.includes('@axe-core/playwright@4.10.2'), 'axe-core version must remain pinned');
requireContract(browser.includes('npx playwright install --with-deps chromium'), 'real Chromium installation is mandatory');
requireContract(browser.includes('tests-external/live-shell.spec.cjs'), 'real browser acceptance suite is mandatory');
requireContract(browser.includes('Strict dist budget'), 'browser gate must retain production asset budget');
requireContract(browser.includes("VITE_ENJAZ_PREVIEW_MODE: 'true'"), 'real browser build must use deterministic preview data rather than live external data');

requireContract(stageDeltaAudit.includes('product code changed without expanding tests/guards'), 'stage-delta product-code enforcement missing');
requireContract(stageDeltaAudit.includes('UI stage changed without a real-browser test or destructive/selftest guard change'), 'stage-delta UI enforcement missing');
requireContract(stageDeltaAudit.includes('data/service/routing/auth stage changed without functional test changes'), 'stage-delta functional enforcement missing');
requireContract(stageDeltaAudit.includes('database stage changed without database destructive selftest or functional test changes'), 'stage-delta database enforcement missing');

requireContract(pages.includes('workflows: ["ENJAZ Quality Gate"]'), 'Pages must depend on ENJAZ Quality Gate');
requireContract(pages.includes("github.event.workflow_run.conclusion == 'success'"), 'Pages must require successful Quality Gate');
requireContract(pages.includes("github.event.workflow_run.head_branch == 'main'"), 'Pages deployment must be main-only');
requireContract(pages.includes('Checkout canonical main source'), 'Pages must deploy the canonical main source');
requireContract(!pages.includes('ref: uiux-rebirth-v2'), 'Pages must not deploy the former UI V2 integration branch');

requireContract(live.includes('workflows: ["ENJAZ Pages Preview"]'), 'live external gate must depend on Pages deployment');
requireContract(live.includes("github.event.workflow_run.conclusion == 'success'"), 'live external gate must require successful Pages deployment');
requireContract(live.includes("github.event.workflow_run.head_branch == 'main'"), 'live external gate must be main-only');
requireContract(live.includes('https://yaldisstore-bit.github.io/ENJAZ/'), 'live external gate must attack the public ENJAZ URL');
requireContract(live.includes('@playwright/test@1.55.0'), 'live Playwright version must remain pinned');
requireContract(live.includes('@axe-core/playwright@4.10.2'), 'live axe-core version must remain pinned');

requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(phase43), 'Phase 4.3 gate must target canonical main');
requireContract(phase43.includes('audit:ui-v2:boundary'), 'Phase 4.3 gate lost UI V2 boundary audit');
requireContract(phase43.includes('audit:ui-v2:dna'), 'Phase 4.3 gate lost UI V2 DNA audit');
requireContract(phase43.includes('audit:ui-v2:freeze'), 'Phase 4.3 gate lost cumulative UI V2 freeze audit');
requireContract(phase43.includes('phase4-2-daily-work-audit.mjs'), 'Phase 4.3 gate lost Phase 4.2 cumulative audit');
requireContract(phase43.includes('phase4-3-executive-briefing-audit.mjs'), 'Phase 4.3 architecture audit missing');
requireContract(phase43.includes('audit:roadmap'), 'Phase 4.3 roadmap integrity audit missing');
requireContract(phase43.includes('test:functional'), 'Phase 4.3 functional regression gate missing');
requireContract(phase43.includes('typecheck'), 'Phase 4.3 TypeScript gate missing');
requireContract(phase43.includes('npm run build'), 'Phase 4.3 production build gate missing');
requireContract(phase43.includes('phase4-3-executive-briefing-reality.mjs'), 'Phase 4.3 real-browser journey missing');

requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(phase44), 'Phase 4.4 gate must target canonical main');
requireContract(phase44.includes('audit:ui-v2:boundary'), 'Phase 4.4 gate lost UI V2 boundary audit');
requireContract(phase44.includes('audit:ui-v2:dna'), 'Phase 4.4 gate lost UI V2 DNA audit');
requireContract(phase44.includes('audit:ui-v2:freeze'), 'Phase 4.4 gate lost cumulative UI V2 freeze audit');
requireContract(phase44.includes('audit:phase4-2:daily-work'), 'Phase 4.4 gate lost Phase 4.2 cumulative audit');
requireContract(phase44.includes('audit:phase4-3:executive-briefing'), 'Phase 4.4 gate lost Phase 4.3 cumulative audit');
requireContract(phase44.includes('audit:phase4-4:home-destruction'), 'Phase 4.4 architecture audit missing');
requireContract(phase44.includes('tests/homeDashboardDestruction.test.ts'), 'Phase 4.4 dataset destruction test missing');
requireContract(phase44.includes('test:functional'), 'Phase 4.4 full functional regression missing');
requireContract(phase44.includes('typecheck'), 'Phase 4.4 TypeScript gate missing');
requireContract(phase44.includes('npm run build'), 'Phase 4.4 production build gate missing');
requireContract(phase44.includes('audit:dist:budget'), 'Phase 4.4 production asset budget missing');
requireContract(phase44.includes('phase4-4-home-destruction-reality.mjs'), 'Phase 4.4 real Chromium destruction journey missing');
requireContract(phase44.includes('playwright@1.55.0'), 'Phase 4.4 Chromium runtime must remain pinned');

requireContract(pkg.scripts?.['audit:qa:stage-contract'] === 'node scripts/qa-stage-contract-audit.mjs', 'audit:qa:stage-contract script missing');
requireContract(pkg.scripts?.['audit:qa:stage-delta'] === 'node scripts/qa-stage-delta-audit.mjs', 'audit:qa:stage-delta script missing');
requireContract(pkg.scripts?.['audit:ui-v2:boundary'] === 'node scripts/ui-v2-boundary-audit.mjs', 'UI V2 boundary script missing');
requireContract(pkg.scripts?.['audit:ui-v2:dna'] === 'node scripts/ui-v2-dna-audit.mjs', 'UI V2 DNA script missing');
requireContract(pkg.scripts?.['audit:ui-v2:freeze']?.includes('ui10-freeze-audit.mjs'), 'UI V2 freeze script missing UI-10');
requireContract(pkg.scripts?.['audit:phase4-2:daily-work'] === 'node scripts/phase4-2-daily-work-audit.mjs', 'Phase 4.2 architecture script missing');
requireContract(pkg.scripts?.['audit:phase4-3:executive-briefing'] === 'node scripts/phase4-3-executive-briefing-audit.mjs', 'Phase 4.3 architecture script missing');
requireContract(pkg.scripts?.['audit:phase4-4:home-destruction'] === 'node scripts/phase4-4-home-destruction-audit.mjs', 'Phase 4.4 Home destruction architecture script missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/executiveBriefing.test.ts'), 'Phase 4.3 functional regression test missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/homeDashboardDestruction.test.ts'), 'Phase 4.4 destruction regression test missing from functional baseline');
requireContract(pkg.scripts?.['verify:stage'] === 'npm run verify:extreme', 'verify:stage must remain an alias of verify:extreme');
const extreme = pkg.scripts?.['verify:extreme'] ?? '';
for (const token of [
  'audit:qa:stage-contract', 'audit:qa:stage-delta', 'audit:ui-v2:boundary', 'audit:ui-v2:dna',
  'audit:ui-v2:freeze', 'audit:phase4-2:daily-work', 'audit:phase4-3:executive-briefing', 'audit:phase4-4:home-destruction',
  'test:functional', 'audit:secrets', 'db:audit', 'db:audit:selftest', 'audit:roadmap', 'typecheck', 'build', 'audit:dist:budget',
]) requireContract(extreme.includes(token), `verify:extreme was weakened: missing ${token}`);

requireContract(constitution.includes('No ENJAZ stage, feature phase, visual phase, data phase, refactor, or hotfix may be declared complete'), 'stage constitution lost non-negotiable closure rule');
requireContract(constitution.includes('The product is fixed; the gate is not weakened'), 'stage constitution lost no-test-weakening rule');
requireContract(constitution.includes('Every new stage must expand the tests'), 'stage constitution lost test-expansion rule');

if (failures.length) {
  console.error('ENJAZ QA stage contract FAILED. Canonical UI V2 / Phase 4.4 certification was weakened.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ENJAZ QA stage contract passed: canonical main retains UI V2 freeze, Phase 4.2, Phase 4.3, Phase 4.4, functional, build, browser and deployed-external gates.');