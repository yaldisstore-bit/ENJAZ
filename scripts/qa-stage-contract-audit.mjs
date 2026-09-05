import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const state=JSON.parse(read('docs/UI_UX_REBIRTH_2_0_STATE.json'));
const quality=read('.github/workflows/enjaz-quality-gate.yml');
const browser=read('.github/workflows/enjaz-browser-acceptance.yml');
const pages=read('.github/workflows/enjaz-pages-preview.yml');
const live=read('.github/workflows/enjaz-live-external-gate.yml');
const stageDelta=read('scripts/qa-stage-delta-audit.mjs');
const pkg=JSON.parse(read('package.json'));
const failures=[];
const requireContract=(ok,msg)=>{if(!ok) failures.push(msg);};
for (const [name,source] of [['quality',quality],['browser',browser],['pages',pages],['live',live]]) requireContract(!/continue-on-error\s*:\s*true/i.test(source),`${name}: continue-on-error is forbidden`);
requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(quality),'quality must run on push main');
requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(quality),'quality must run on PR main');
requireContract(quality.includes('QA stage contract lock'),'quality must self-audit QA contract');
requireContract(quality.includes('Stage-specific test expansion gate'),'quality must keep stage-delta gate');
requireContract(quality.includes('fetch-depth: 0'),'quality checkout must preserve history');
requireContract(/pull_request:\s*[\s\S]*branches:\s*\[main\]/.test(browser),'browser must run on PR main');
requireContract(/push:\s*[\s\S]*branches:\s*\[main\]/.test(browser),'browser must run on push main');
requireContract(browser.includes('@playwright/test@1.55.0') && browser.includes('playwright@1.55.0'),'browser Playwright must remain pinned');
requireContract(browser.includes('npx playwright install --with-deps chromium'),'real Chromium is mandatory');

const r2Era=['R2.0-10','R2.0-11'].includes(state.stage);
if (r2Era) {
  const cumulative=['ui-rebirth-2-freeze-audit.mjs','ui-rebirth-2-palette-audit.mjs','ui-rebirth-2-acceptance-audit.mjs','ui-rebirth-2-shell-audit.mjs','ui-rebirth-2-golden-visual-contract-audit.mjs','ui-rebirth-2-golden-specimen-audit.mjs','ui-rebirth-2-core-work-audit.mjs','ui-rebirth-2-records-audit.mjs','ui-rebirth-2-operational-intelligence-audit.mjs','ui-rebirth-2-zero-lost-audit.mjs','ui-rebirth-2-destruction-reality-audit.mjs','ui-rebirth-2-legacy-eradication-audit.mjs'];
  for (const token of cumulative) requireContract(quality.includes(token),`quality missing cumulative R2 token: ${token}`);
  for (const token of ['test:functional','test:phase5-2','test:phase5-3','test:phase5-4','audit:secrets','db:audit','db:audit:selftest','audit:roadmap','typecheck','npm run build','audit:dist:budget','test -f dist/index.html']) requireContract(quality.includes(token),`quality missing authoritative regression token: ${token}`);
  for (const token of ['ui-rebirth-2-acceptance-audit.mjs','ui-rebirth-2-legacy-eradication-audit.mjs','vite.r2-preview.config.ts','ui-rebirth-2-preview-budget-audit.mjs','vite.r2-production-test.config.ts','r2-production-bridge.spec.cjs','r2-zero-lost.spec.cjs','r2-destruction-reality.spec.cjs','r2-destruction-reality-wave2.spec.cjs']) requireContract(browser.includes(token),`browser missing R2 reality token: ${token}`);
  requireContract(!quality.includes('audit:ui-v2:boundary') && !quality.includes('audit:ui-v2:dna'),'quality must not execute deleted UI V2 gates in R2.0-10+');
  requireContract(!browser.includes('tests-external/live-shell.spec.cjs'),'browser must not execute deleted UI V2 live-shell suite in R2.0-10+');
} else {
  requireContract(quality.includes('audit:ui-v2:boundary') && quality.includes('audit:ui-v2:dna'),'pre-R2.0-10 quality must protect UI V2');
  requireContract(browser.includes('tests-external/live-shell.spec.cjs'),'pre-R2.0-10 browser must protect live UI V2');
}

requireContract(stageDelta.includes('product code changed without expanding tests/guards'),'stage-delta product enforcement missing');
requireContract(stageDelta.includes('data/service/routing/auth stage changed without functional test changes'),'stage-delta functional enforcement missing');
requireContract(pkg.scripts?.['audit:qa:stage-contract']==='node scripts/qa-stage-contract-audit.mjs','QA contract script missing');
requireContract(pkg.scripts?.['audit:qa:stage-delta']==='node scripts/qa-stage-delta-audit.mjs','QA delta script missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/executiveBriefing.test.ts'),'executive briefing functional regression missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/homeDashboardDestruction.test.ts'),'Home destruction regression missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/transactionListDestruction.test.ts'),'transaction-list destruction regression missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/transactionEditorService.test.ts'),'transaction editor service regression missing');
requireContract(pkg.scripts?.['test:functional']?.includes('tests/transaction360Service.test.ts'),'transaction 360 service regression missing');
requireContract(pages.includes('workflows: ["ENJAZ Quality Gate"]'),'Pages must depend on Quality Gate');
requireContract(pages.includes("github.event.workflow_run.conclusion == 'success'"),'Pages requires successful Quality Gate');
requireContract(live.includes('workflows: ["ENJAZ Pages Preview"]'),'external gate must depend on Pages');
requireContract(live.includes("github.event.workflow_run.conclusion == 'success'"),'external gate requires successful Pages');

if(failures.length){console.error(`ENJAZ QA STAGE CONTRACT FAILED (${failures.length})`);for(const f of failures)console.error(`- ${f}`);process.exit(1);}console.log(`ENJAZ QA STAGE CONTRACT PASS — ${state.stage}; current canonical gates match the active UI generation.`);
