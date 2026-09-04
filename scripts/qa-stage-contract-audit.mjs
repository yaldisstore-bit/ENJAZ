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
const browserSpec = read('tests-external/live-shell.spec.cjs');
const constitution = read('docs/QA_STAGE_CONSTITUTION.md');
const pkg = JSON.parse(read('package.json'));

// No critical QA workflow may silently tolerate failure.
for (const [name, source] of [
  ['quality', quality],
  ['browser', browser],
  ['pages', pages],
  ['live', live],
]) {
  requireContract(!/continue-on-error\s*:\s*true/i.test(source), `${name}: continue-on-error is forbidden`);
}

// Every stage PR and every main update must execute the heavy source/production gate.
requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(quality), 'quality gate must run on push to main');
requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(quality), 'quality gate must run on PRs to main');
requireContract(quality.includes('QA stage contract lock'), 'quality gate must audit its own QA contract');

const requiredQualitySteps = [
  'audit:qa:stage-contract',
  'audit:ui-rebirth:boundary',
  'audit:ui-rebirth:purge',
  'audit:ui-rebirth:shell',
  'audit:ui-rebirth:shell:selftest',
  'audit:ui-rebirth:extreme',
  'audit:ui-rebirth:extreme:selftest',
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
for (const token of requiredQualitySteps) {
  requireContract(quality.includes(token), `quality gate missing mandatory step: ${token}`);
}

// Real Chromium + WCAG must execute both before merge and after any direct push to main.
requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(browser), 'browser gate must run on PRs to main');
requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(browser), 'browser gate must run on push to main');
requireContract(browser.includes('QA stage contract lock'), 'browser gate must self-audit the QA stage contract');
requireContract(browser.includes('@playwright/test@1.55.0'), 'Playwright version must remain pinned');
requireContract(browser.includes('@axe-core/playwright@4.10.2'), 'axe-core version must remain pinned');
requireContract(browser.includes('npx playwright install --with-deps chromium'), 'real Chromium installation is mandatory');
requireContract(browser.includes('tests-external/live-shell.spec.cjs'), 'real browser acceptance suite is mandatory');
requireContract(browser.includes('Strict dist budget'), 'browser gate must retain production asset budget');
requireContract(browser.includes('Extreme source contract'), 'browser gate must retain extreme source/mutation contract');

// Lock the semantics of the real-browser suite itself so it cannot be quietly diluted.
for (const width of ['width: 360', 'width: 390', 'width: 412']) {
  requireContract(browserSpec.includes(width), `browser suite lost mandatory mobile viewport ${width}`);
}
requireContract(browserSpec.includes(".withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])"), 'WCAG A/AA axe tags were weakened');
requireContract(browserSpec.includes('expect(result.violations') && browserSpec.includes('.toEqual([])'), 'browser suite must require zero axe violations');
requireContract(browserSpec.includes('rect.width < 44 || rect.height < 44'), '44px touch-target browser assertion missing');
requireContract(browserSpec.includes('no horizontal overflow'), 'horizontal overflow browser assertion missing');
requireContract(browserSpec.includes('CTA does not intercept any navigation target'), 'CTA/nav collision assertion missing');
requireContract(browserSpec.includes('focus iteration') && browserSpec.includes('remains trapped'), 'modal focus-trap browser assertion missing');
requireContract(browserSpec.includes("page.keyboard.press('Escape')"), 'Escape modal dismissal browser assertion missing');
requireContract(browserSpec.includes('reduced motion keeps animation effectively disabled'), 'reduced-motion browser assertion missing');
requireContract(browserSpec.includes('no console errors') && browserSpec.includes('no page errors'), 'browser runtime error assertions missing');
requireContract(browserSpec.includes('no failed network resources'), 'failed-network-resource assertion missing');
requireContract(browserSpec.includes('no resource over 500KB'), 'single-resource performance ceiling missing');
requireContract(browserSpec.includes('network transfer budget'), 'network transfer performance budget missing');

// A main build may only publish after the Quality Gate succeeds.
requireContract(pages.includes('workflows: ["ENJAZ Quality Gate"]'), 'Pages must depend on ENJAZ Quality Gate');
requireContract(pages.includes("github.event.workflow_run.conclusion == 'success'"), 'Pages must require successful Quality Gate');
requireContract(pages.includes("github.event.workflow_run.head_branch == 'main'"), 'Pages deployment must be main-only');

// The public deployment must then be attacked from an external runner with HTTPS + Chromium + WCAG.
requireContract(live.includes('workflows: ["ENJAZ Pages Preview"]'), 'live external gate must depend on Pages deployment');
requireContract(live.includes("github.event.workflow_run.conclusion == 'success'"), 'live external gate must require successful Pages deployment');
requireContract(live.includes("github.event.workflow_run.head_branch == 'main'"), 'live external gate must be main-only');
requireContract(live.includes('https://yaldisstore-bit.github.io/ENJAZ/'), 'live external gate must attack the public ENJAZ URL');
requireContract(live.includes('@playwright/test@1.55.0'), 'live Playwright version must remain pinned');
requireContract(live.includes('@axe-core/playwright@4.10.2'), 'live axe-core version must remain pinned');
requireContract(live.includes('Attack the actual published application'), 'live published-app attack step missing');
requireContract(live.includes('Enforce HTTPS and HTML contract'), 'live HTTPS/HTML contract missing');

// Package-level certification must preserve the entire heavy chain.
requireContract(pkg.scripts?.['audit:qa:stage-contract'] === 'node scripts/qa-stage-contract-audit.mjs', 'audit:qa:stage-contract script missing');
requireContract(pkg.scripts?.['verify:stage'] === 'npm run verify:extreme', 'verify:stage must remain an alias of verify:extreme');
const extreme = pkg.scripts?.['verify:extreme'] ?? '';
for (const token of [
  'audit:qa:stage-contract',
  'audit:ui-rebirth:boundary',
  'audit:ui-rebirth:purge',
  'audit:ui-rebirth:shell',
  'audit:ui-rebirth:shell:selftest',
  'audit:ui-rebirth:extreme',
  'audit:ui-rebirth:extreme:selftest',
  'test:functional',
  'audit:secrets',
  'db:audit',
  'db:audit:selftest',
  'audit:roadmap',
  'typecheck',
  'build',
  'audit:dist:budget',
]) {
  requireContract(extreme.includes(token), `verify:extreme was weakened: missing ${token}`);
}

// The policy itself is part of the contract and states the no-shortcut closure rule.
requireContract(constitution.includes('No ENJAZ stage, feature phase, visual phase, data phase, refactor, or hotfix may be declared complete'), 'stage constitution lost non-negotiable closure rule');
requireContract(constitution.includes('The product is fixed; the gate is not weakened'), 'stage constitution lost no-test-weakening rule');
requireContract(constitution.includes('Every new stage must expand the tests'), 'stage constitution lost test-expansion rule');

if (failures.length) {
  console.error('ENJAZ QA stage contract FAILED. Heavy stage certification was weakened.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ENJAZ QA stage contract passed: every stage must retain Extreme QA + real Chromium + deployed external WCAG gates.');
