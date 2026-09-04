import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI6_BASE_URL || 'http://127.0.0.1:4176';
const outDir = process.env.UI6_ARTIFACT_DIR || 'artifacts/ui6-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) { if (!condition) throw new Error(`UI-6 cumulative reality FAIL: ${message}`); }
async function box(locator) { const value = await locator.boundingBox(); assert(value, 'geometry unavailable'); return value; }
async function noX(page, label) {
  const value = await page.evaluate(() => ({ html: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));
  assert(value.html <= 1 && value.body <= 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
}
async function inside(locator, viewport, label) {
  const r = await box(locator);
  assert(r.x >= -2 && r.y >= -2 && r.x + r.width <= viewport.width + 2 && r.y + r.height <= viewport.height + 2, `${label}: outside viewport ${JSON.stringify(r)}`);
}
async function touch44(page, label) {
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect(); const s = getComputedStyle(button);
    return { name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g, ' ').trim(), width: r.width, height: r.height,
      visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > .05 };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(bad.length === 0, `${label}: touch targets below 44px ${JSON.stringify(bad)}`);
}
async function close(dialog) { await dialog.getByLabel('إغلاق', { exact: true }).click(); await dialog.waitFor({ state: 'detached' }); }

async function profile(browser, spec) {
  const context = await browser.newContext({ viewport: spec.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = []; const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  const app = page.locator('[data-core-app="true"]'); await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${spec.name}: frozen stage marker changed`);
  await page.locator('[data-core-screen="home"]').waitFor();
  await noX(page, `${spec.name}:home`);
  assert(await page.getByText('إنجاز', { exact: true }).first().isVisible(), `${spec.name}: ENJAZ title missing`);

  const dock = page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button', { name: 'اليوم', exact: true }).click();
  const today = page.locator('[data-core-screen="today"]'); await today.waitFor();
  assert(await today.getAttribute('data-daily-work-status') === 'ready', `${spec.name}: current Daily Work core surface is not ready`);
  assert(await page.locator('[data-daily-work-focus]').isVisible(), `${spec.name}: Daily Work focal action missing`);
  await noX(page, `${spec.name}:today`);
  if (spec.mobile) {
    const dockBox = await box(dock); const actionBox = await box(page.locator('[data-daily-work-focus]').getByRole('button').first());
    assert(actionBox.y + actionBox.height <= dockBox.y - 6, `${spec.name}: Daily Work core action occluded by dock`);
  }
  await page.screenshot({ path: path.join(outDir, `${spec.name}-today-current.png`), fullPage: true });

  await page.getByRole('button', { name: 'متابعة جديدة', exact: true }).click();
  const followup = page.getByRole('dialog', { name: 'إجراء جديد', exact: true }); await followup.waitFor(); await page.waitForTimeout(360);
  await inside(followup, spec.viewport, `${spec.name}:followup-create`);
  assert(await page.locator('[data-create-type="followup"].is-selected').count() === 1, `${spec.name}: followup selection lost`);
  await close(followup);

  await dock.getByRole('button', { name: 'العمليات', exact: true }).click();
  await page.locator('[data-core-screen="operations"]').waitFor();
  await page.getByRole('button', { name: 'فتح مركز القيادة', exact: true }).click();
  await page.locator('[data-core-screen="command"]').waitFor();
  assert((await page.locator('.ez-core-command__hero').evaluate((el) => getComputedStyle(el).backgroundImage)).includes('gradient'), `${spec.name}: command focal treatment lost`);
  await page.getByRole('button', { name: 'العودة للعمليات', exact: true }).click();

  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'البحث العام', exact: true }); await search.waitFor();
  await page.getByLabel('عبارة البحث').fill('الرافدين');
  assert(await page.locator('.ez-core-search-result').count() >= 2, `${spec.name}: global search regressed`);
  await page.keyboard.press('Escape'); await search.waitFor({ state: 'detached' });

  await page.getByRole('button', { name: 'الإشعارات', exact: true }).click();
  const notifications = page.getByRole('dialog', { name: 'الإشعارات', exact: true }); await notifications.waitFor(); await page.waitForTimeout(320); await inside(notifications, spec.viewport, `${spec.name}:notifications`); await close(notifications);

  await page.getByRole('button', { name: 'الحساب', exact: true }).click();
  const account = page.getByRole('dialog', { name: 'الحساب ومساحة العمل', exact: true }); await account.waitFor(); await page.waitForTimeout(320); await inside(account, spec.viewport, `${spec.name}:account`); await close(account);

  await dock.getByRole('button', { name: 'المالية', exact: true }).click();
  await page.locator('[data-core-screen="finance"]').waitFor(); await noX(page, `${spec.name}:finance`);
  assert(await dock.isVisible(), `${spec.name}: bottom dock disappeared`);
  if (spec.mobile) await touch44(page, spec.name);
  assert(consoleErrors.length === 0, `${spec.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${spec.name}: page errors ${pageErrors.join(' | ')}`);
  await context.close();
  return { profile: spec.name, coreRegression: true, dailyWorkCompatible: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const specs = [
    { name: 'desktop-1280', viewport: { width: 1280, height: 900 }, mobile: false },
    { name: 'phone-430', viewport: { width: 430, height: 932 }, mobile: true },
    { name: 'phone-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'phone-360', viewport: { width: 360, height: 740 }, mobile: true },
    { name: 'phone-320', viewport: { width: 320, height: 700 }, mobile: true },
  ];
  const results = [];
  for (const spec of specs) results.push(await profile(browser, spec));
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`UI-6 cumulative reality PASS: ${JSON.stringify(results)}`);
} finally { await browser.close(); }
