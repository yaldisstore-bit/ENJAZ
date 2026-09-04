import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI7_BASE_URL || 'http://127.0.0.1:4177';
const outDir = process.env.UI7_ARTIFACT_DIR || 'artifacts/ui7-reality';
await fs.mkdir(outDir, { recursive: true });

const domains = [
  ['transactions','pipeline'],['companies','entity-profile'],['people','people-directory'],['finance','ledger-summary'],
  ['workflow','stage-lanes'],['automation','rule-stack'],['operations','operations-pulse'],['command','executive-focus'],
  ['risk','risk-map'],['documents','category-list-detail'],['followups','attention-inbox'],['copilot','context-assistant'],
];
function assert(condition, message) { if (!condition) throw new Error(message); }
async function noOverflow(page, label) {
  const value = await page.evaluate(() => ({ html: document.documentElement.scrollWidth-document.documentElement.clientWidth, body: document.body.scrollWidth-document.body.clientWidth }));
  assert(value.html <= 1 && value.body <= 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
}
async function touchTargets(page, label) {
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect(); const s = getComputedStyle(button);
    return { name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g,' ').trim() || 'button', w:r.width, h:r.height, visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>.05 };
  }).filter((x) => x.visible && (x.w < 44 || x.h < 44)));
  assert(bad.length === 0, `${label}: undersized touch targets ${JSON.stringify(bad)}`);
}
async function insideViewport(locator, viewport, label) {
  const box = await locator.boundingBox();
  assert(box, `${label}: missing geometry`);
  assert(box.x >= -2 && box.y >= -2 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${label}: outside viewport ${JSON.stringify(box)}`);
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors=[]; const pageErrors=[];
  page.on('console', (m) => { if (m.type()==='error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
  await page.locator('[data-core-app="true"]').waitFor();
  await page.locator('[data-core-screen="home"]').waitFor();

  assert(await page.locator('[data-domain-rail="true"]').count() === 0, `${profile.name}: core must remain rail-free`);
  const explorerTrigger = page.getByRole('button',{name:'مجالات إنجاز',exact:true});
  assert(await explorerTrigger.isVisible(), `${profile.name}: domain explorer trigger missing from ENJAZ brand`);
  await noOverflow(page, `${profile.name}:core`);
  if (profile.mobile) await touchTargets(page, `${profile.name}:core`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-core.png`),fullPage:true});

  await explorerTrigger.click();
  const explorerDialog = page.getByRole('dialog',{name:'مجالات إنجاز',exact:true});
  await explorerDialog.waitFor();
  const explorer = page.locator('[data-domain-explorer="true"]');
  assert(await explorer.isVisible(), `${profile.name}: domain explorer did not open`);
  assert(await page.locator('[data-domain-explorer-link]').count() === domains.length, `${profile.name}: explorer does not expose all domains`);
  await insideViewport(explorerDialog, profile.viewport, `${profile.name}:domain-explorer`);
  await noOverflow(page, `${profile.name}:explorer`);
  if (profile.mobile) await touchTargets(page, `${profile.name}:explorer`);
  await page.screenshot({path:path.join(outDir,`${profile.name}-explorer.png`)});

  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await page.locator('[data-domain-runtime="transactions"]').waitFor();
  assert(await page.locator('[data-domain-rail="true"]').isVisible(), `${profile.name}: in-domain rail missing after explorer navigation`);

  for (let index = 0; index < domains.length; index += 1) {
    const [domain, pattern] = domains[index];
    if (index > 0) {
      const link = page.locator(`[data-domain-link="${domain}"]`);
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await page.locator(`[data-domain-runtime="${domain}"]`).waitFor();
    }
    assert(await page.locator('[data-domain-rail="true"]').isVisible(), `${profile.name}:${domain}: domain rail disappeared inside domain runtime`);
    assert(await page.locator(`[data-pattern="${pattern}"]`).count() >= 1, `${profile.name}:${domain}: composition signature ${pattern} missing`);
    await noOverflow(page, `${profile.name}:${domain}`);
    if (profile.mobile) await touchTargets(page, `${profile.name}:${domain}`);

    if (domain === 'documents') {
      const financeCategory = page.locator('.ez-domain-doc-layout > aside').getByRole('button',{name:/مالية/});
      await financeCategory.click();
      assert((await financeCategory.getAttribute('class'))?.includes('is-active'), `${profile.name}: documents category interaction failed`);
    }
    if (domain === 'command') {
      const bg = await page.locator('.ez-domain-command').evaluate((el) => getComputedStyle(el).backgroundImage);
      assert(bg.includes('gradient'), `${profile.name}: command center lost dark executive treatment`);
    }
    if (domain === 'companies' && !profile.mobile) {
      const hero = await page.locator('.ez-domain-company-hero').boundingBox();
      const relations = await page.locator('.ez-domain-relations').boundingBox();
      assert(hero && relations && hero.height > relations.height * .65, `${profile.name}: company focal hierarchy collapsed`);
    }
    if (['transactions','workflow','command','documents','copilot'].includes(domain)) {
      await page.screenshot({path:path.join(outDir,`${profile.name}-${domain}.png`),fullPage:true});
    }
  }

  const coreReturn = page.getByRole('button',{name:'العودة للأساسية',exact:true});
  await coreReturn.click();
  await page.locator('[data-core-screen="home"]').waitFor();
  assert(await page.locator('[data-active-domain="core"]').count() === 1, `${profile.name}: domain return did not restore core surface`);
  assert(await page.locator('[data-domain-rail="true"]').count() === 0, `${profile.name}: rail leaked back into core surface`);
  assert(await page.locator('[data-shell-part="bottom-dock"]').isVisible(), `${profile.name}: bottom dock disappeared`);

  await explorerTrigger.click();
  const explorerAfterReturn = page.getByRole('dialog',{name:'مجالات إنجاز',exact:true});
  await explorerAfterReturn.waitFor();
  await explorerAfterReturn.getByRole('button',{name:'إغلاق',exact:true}).click();
  await explorerAfterReturn.waitFor({state:'detached'});

  await noOverflow(page, `${profile.name}:final`);
  if (profile.mobile) await touchTargets(page, `${profile.name}:final`);
  assert(consoleErrors.length===0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length===0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);
  await context.close();
  return { profile: profile.name, domains: domains.length, explorer: true, coreRailFree: true };
}

const browser = await chromium.launch({headless:true});
try {
  const profiles=[
    {name:'desktop-1280',viewport:{width:1280,height:900},mobile:false},
    {name:'phone-390',viewport:{width:390,height:844},mobile:true},
    {name:'phone-320',viewport:{width:320,height:700},mobile:true},
  ];
  const results=[];
  for (const profile of profiles) results.push(await verifyProfile(browser,profile));
  await fs.writeFile(path.join(outDir,'result.json'),JSON.stringify({passed:true,results},null,2));
  console.log(`UI-7 Reality Gate PASS: ${JSON.stringify(results)}`);
} finally { await browser.close(); }
