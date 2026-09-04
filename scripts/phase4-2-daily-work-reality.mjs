import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE42_BASE_URL || 'http://127.0.0.1:4192';
const outDir = process.env.PHASE42_ARTIFACT_DIR || 'artifacts/phase4-2-daily-work';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 4.2 Reality FAIL: ${message}`);
}

async function rect(locator) {
  const box = await locator.boundingBox();
  assert(box, 'geometry unavailable');
  return box;
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g, ' ').trim() || 'button',
      width: r.width,
      height: r.height,
      visible: r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.05,
    };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized touch targets ${JSON.stringify(undersized)}`);
}

async function assertFocusClearOfDock(page, label) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  const dock = await rect(page.locator('[data-shell-part="bottom-dock"]'));
  const focus = await rect(page.locator('[data-daily-work-focus]'));
  assert(focus.y < dock.y, `${label}: Daily Work focus begins below dock`);
  const action = page.locator('[data-daily-work-focus]').getByRole('button').first();
  const actionBox = await rect(action);
  assert(actionBox.y + actionBox.height <= dock.y - 6, `${label}: primary Daily Work action is occluded by dock ${JSON.stringify({ actionBottom: actionBox.y + actionBox.height, dockTop: dock.y })}`);
}

async function assertInsideViewport(locator, viewport, label, allowance = 2) {
  const box = await rect(locator);
  assert(box.x >= -allowance, `${label}: clipped left ${JSON.stringify(box)}`);
  assert(box.y >= -allowance, `${label}: clipped top ${JSON.stringify(box)}`);
  assert(box.x + box.width <= viewport.width + allowance, `${label}: clipped right ${JSON.stringify(box)}`);
  assert(box.y + box.height <= viewport.height + allowance, `${label}: clipped bottom ${JSON.stringify(box)}`);
}

async function visitToday(page) {
  const dock = page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button', { name: 'اليوم', exact: true }).click();
  await page.locator('[data-core-screen="today"][data-daily-work-status="ready"]').waitFor();
  return dock;
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  const app = page.locator('[data-core-app="true"]');
  await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${profile.name}: frozen UI marker changed`);
  const productPhase = Number(await app.getAttribute('data-product-phase'));
  assert(Number.isFinite(productPhase) && productPhase >= 4.2, `${profile.name}: product phase regressed below 4.2`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${profile.name}: public/reality runtime is not isolated preview mode`);

  const dock = await visitToday(page);
  const today = page.locator('[data-core-screen="today"]');
  assert(await today.getAttribute('data-daily-work-total') === '6', `${profile.name}: preview Universal Inbox did not load expected six-item fixture`);
  assert(await page.locator('[data-daily-work-summary="true"]').isVisible(), `${profile.name}: Daily Work summary missing`);
  assert(await page.locator('[data-daily-work-focus]').isVisible(), `${profile.name}: focus item missing`);
  assert(await page.locator('[data-daily-work-list="true"]').isVisible(), `${profile.name}: consolidated list missing`);
  assert(await page.locator('[data-daily-work-item]').count() === 6, `${profile.name}: consolidated queue count mismatch`);
  assert(await page.getByText('عائق حرج', { exact: true }).count() >= 1, `${profile.name}: blocker signal missing`);
  assert(await page.getByText('المسؤول: أحمد', { exact: true }).count() >= 1, `${profile.name}: ownership missing`);
  await noHorizontalOverflow(page, `${profile.name}:daily-default`);
  if (profile.mobile) await assertFocusClearOfDock(page, profile.name);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-daily-default.png`), fullPage: true });

  await page.getByRole('button', { name: 'المتأخرة', exact: true }).click();
  assert(await page.locator('[data-daily-work-item]').count() === 1, `${profile.name}: overdue filter is not exact`);
  assert(await page.locator('[data-daily-work-item="followup:preview-overdue"]').isVisible(), `${profile.name}: overdue followup missing after filter`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-daily-overdue.png`), fullPage: true });

  const overdue = page.locator('[data-daily-work-item="followup:preview-overdue"]');
  await overdue.getByRole('button', { name: 'تأجيل', exact: true }).click();
  await overdue.waitFor({ state: 'detached' });
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${profile.name}: preview action escaped into live mode`);
  assert(await page.locator('[data-daily-work-item]').count() === 0, `${profile.name}: snoozed preview item remained in overdue filter`);

  await page.getByRole('button', { name: 'بحاجة إجراء', exact: true }).click();
  assert(await page.locator('[data-daily-work-item]').count() === 2, `${profile.name}: action-needed filter mismatch`);
  assert(await page.locator('[data-daily-work-item="blocker:preview-critical"]').isVisible(), `${profile.name}: blocker missing from action-needed bucket`);
  assert(await page.locator('[data-daily-work-item="workflow:preview-approval"]').isVisible(), `${profile.name}: workflow action missing from action-needed bucket`);

  await page.locator('[data-daily-work-item="workflow:preview-approval"]').getByRole('button', { name: 'إنهاء', exact: true }).click();
  await page.locator('[data-daily-work-item="workflow:preview-approval"]').waitFor({ state: 'detached' });
  assert(await page.locator('[data-daily-work-item]').count() === 1, `${profile.name}: completed preview workflow action remained in queue`);

  await page.locator('[data-daily-work-item="blocker:preview-critical"] .ez-daily-item__main').click();
  await page.locator('[data-domain-runtime="transactions"]').waitFor();
  assert(await page.locator('[data-domain-rail="true"]').isVisible(), `${profile.name}: opening item context did not enter transaction domain`);
  await page.getByRole('button', { name: 'العودة للأساسية', exact: true }).click();
  await page.locator('[data-core-screen="today"]').waitFor();

  await page.getByRole('button', { name: 'متابعة جديدة', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: 'إجراء جديد', exact: true });
  await createDialog.waitFor();
  await page.waitForTimeout(360);
  await assertInsideViewport(createDialog, profile.viewport, `${profile.name}:followup-create`);
  assert(await page.locator('[data-create-type="followup"].is-selected').count() === 1, `${profile.name}: new followup did not preserve create type`);
  await createDialog.getByLabel('إغلاق', { exact: true }).click();
  await createDialog.waitFor({ state: 'detached' });

  assert(await dock.isVisible(), `${profile.name}: bottom dock disappeared after Daily Work journey`);
  if (profile.mobile) await assertTouchTargets(page, profile.name);
  await noHorizontalOverflow(page, `${profile.name}:final`);
  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);

  const result = {
    profile: profile.name,
    phase42: true,
    productPhase,
    consolidatedQueue: true,
    overdueFilter: true,
    actionFilter: true,
    previewMutation: true,
    contextNavigation: true,
    quickCreate: true,
    touch44: profile.mobile,
  };
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: 'desktop-1280', viewport: { width: 1280, height: 900 }, mobile: false },
    { name: 'phone-430', viewport: { width: 430, height: 932 }, mobile: true },
    { name: 'phone-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'phone-360', viewport: { width: 360, height: 740 }, mobile: true },
    { name: 'phone-320', viewport: { width: 320, height: 700 }, mobile: true },
  ];
  const results = [];
  for (const profile of profiles) results.push(await verifyProfile(browser, profile));
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 4.2 Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
