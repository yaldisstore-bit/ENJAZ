import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI6_BASE_URL || 'http://127.0.0.1:4176';
const outDir = process.env.UI6_ARTIFACT_DIR || 'artifacts/ui6-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

async function assertInsideViewport(locator, viewport, label, allowance = 2) {
  const box = await rect(locator);
  assert(box.x >= -allowance, `${label}: clipped left ${JSON.stringify(box)}`);
  assert(box.y >= -allowance, `${label}: clipped top ${JSON.stringify(box)}`);
  assert(box.x + box.width <= viewport.width + allowance, `${label}: clipped right ${JSON.stringify(box)}`);
  assert(box.y + box.height <= viewport.height + allowance, `${label}: clipped bottom ${JSON.stringify(box)}`);
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

async function assertCriticalActionAboveDock(page, label, actionName) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  const dock = await rect(page.locator('[data-shell-part="bottom-dock"]'));
  const action = await rect(page.getByRole('button', { name: actionName, exact: true }));
  assert(action.y + action.height <= dock.y - 6, `${label}: ${actionName} is occluded by dock ${JSON.stringify({ actionBottom: action.y + action.height, dockTop: dock.y })}`);
}

async function openAndCheckSheet(page, profile, triggerName, dialogName, marker) {
  await page.getByRole('button', { name: triggerName, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
  await dialog.waitFor();
  await page.waitForTimeout(380);
  await assertInsideViewport(dialog, profile.viewport, `${profile.name}:${marker}`);
  assert(await page.locator(`[data-core-overlay="${marker}"]`).count() === 1, `${profile.name}:${marker}: core overlay marker missing`);
  return dialog;
}

async function closeSheet(dialog) {
  await dialog.getByLabel('إغلاق', { exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('[data-core-app="true"]').waitFor();
  await page.locator('[data-core-screen="home"]').waitFor();
  await page.waitForTimeout(220);

  assert(await page.locator('.vite-error-overlay').count() === 0, `${profile.name}: Vite error overlay visible`);
  await noHorizontalOverflow(page, `${profile.name}:home`);
  assert(await page.getByText('إنجاز', { exact: true }).first().isVisible(), `${profile.name}: ENJAZ title missing`);

  const visibleText = await page.locator('body').innerText();
  for (const forbidden of ['UI-6', 'Reality Gate', 'PROOF', 'AUDIT', 'تجريبية', 'معاينة']) {
    assert(!visibleText.includes(forbidden), `${profile.name}: developer/preview terminology leaked: ${forbidden}`);
  }

  if (!profile.mobile) {
    const priority = await rect(page.locator('.ez-core-priority'));
    const signal = await rect(page.locator('.ez-core-signal'));
    assert(priority.width > signal.width * 1.35, `${profile.name}: Home lost asymmetric focal hierarchy`);
  }
  if (profile.mobile) await assertCriticalActionAboveDock(page, `${profile.name}:home`, 'فتح المعاملة');
  await page.screenshot({ path: path.join(outDir, `${profile.name}-home.png`), fullPage: true });

  const dock = page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button', { name: 'اليوم', exact: true }).click();
  await page.locator('[data-core-screen="today"]').waitFor();
  await noHorizontalOverflow(page, `${profile.name}:today`);
  if (profile.mobile) await assertCriticalActionAboveDock(page, `${profile.name}:today`, 'بدء المهمة');
  await page.getByRole('button', { name: 'متابعة جديدة', exact: true }).click();
  const followupSheet = page.getByRole('dialog', { name: 'إجراء جديد', exact: true });
  await followupSheet.waitFor();
  await page.waitForTimeout(380);
  await assertInsideViewport(followupSheet, profile.viewport, `${profile.name}:followup-create`);
  assert(await page.locator('[data-create-type="followup"].is-selected').count() === 1, `${profile.name}: follow-up quick-create selection was not preserved`);
  await closeSheet(followupSheet);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-today.png`), fullPage: true });

  await dock.getByRole('button', { name: 'العمليات', exact: true }).click();
  await page.locator('[data-core-screen="operations"]').waitFor();
  await page.getByRole('button', { name: 'فتح مركز القيادة', exact: true }).click();
  await page.locator('[data-core-screen="command"]').waitFor();
  const commandHero = page.locator('.ez-core-command__hero');
  const commandBackground = await commandHero.evaluate((element) => getComputedStyle(element).backgroundImage);
  assert(commandBackground.includes('gradient'), `${profile.name}: Command Center lost executive focal treatment`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-command.png`), fullPage: true });
  await page.getByRole('button', { name: 'العودة للعمليات', exact: true }).click();
  await page.locator('[data-core-screen="operations"]').waitFor();

  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  const searchDialog = page.getByRole('dialog', { name: 'البحث العام', exact: true });
  await searchDialog.waitFor();
  await page.waitForTimeout(220);
  await assertInsideViewport(page.locator('.ez-shell-search__panel'), profile.viewport, `${profile.name}:search`);
  const searchInput = page.getByLabel('عبارة البحث');
  await searchInput.fill('الرافدين');
  assert(await page.locator('.ez-core-search-result').count() >= 2, `${profile.name}: global search did not render mixed results`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-search.png`) });
  await page.keyboard.press('Escape');
  await searchDialog.waitFor({ state: 'detached' });

  const notifications = await openAndCheckSheet(page, profile, 'الإشعارات', 'الإشعارات', 'notifications');
  assert(await notifications.getByText('3', { exact: true }).count() >= 1, `${profile.name}: attention count missing`);
  await closeSheet(notifications);

  const account = await openAndCheckSheet(page, profile, 'الحساب', 'الحساب ومساحة العمل', 'account');
  assert(await account.getByText('مساحة إنجاز الرئيسية', { exact: true }).isVisible(), `${profile.name}: workspace identity missing`);
  await closeSheet(account);

  await page.getByRole('button', { name: 'إجراء جديد', exact: true }).click();
  const createSheet = page.getByRole('dialog', { name: 'إجراء جديد', exact: true });
  await createSheet.waitFor();
  await page.waitForTimeout(320);
  await assertInsideViewport(createSheet, profile.viewport, `${profile.name}:create`);
  await page.locator('[data-create-type="payment"]').click();
  assert(await page.locator('[data-create-type="payment"].is-selected').count() === 1, `${profile.name}: payment create selection failed`);
  await closeSheet(createSheet);

  await dock.getByRole('button', { name: 'المالية', exact: true }).click();
  await page.locator('[data-core-screen="finance"]').waitFor();
  assert(await page.getByText('18,450,000 د.ع', { exact: true }).isVisible(), `${profile.name}: finance entry surface missing`);
  await noHorizontalOverflow(page, `${profile.name}:finance`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-finance.png`), fullPage: true });

  assert(await dock.isVisible(), `${profile.name}: bottom dock disappeared`);
  if (profile.mobile) await assertTouchTargets(page, profile.name);
  await noHorizontalOverflow(page, `${profile.name}:final`);
  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);

  const result = { profile: profile.name, core: true };
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
  console.log(`UI-6 Reality Gate PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
