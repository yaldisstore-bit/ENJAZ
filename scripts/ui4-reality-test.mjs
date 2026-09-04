import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI4_BASE_URL || 'http://127.0.0.1:4174';
const outDir = process.env.UI4_ARTIFACT_DIR || 'artifacts/ui4-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rect(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
}

function assertWithinViewport(box, viewport, label, allowance = 1) {
  assert(box.left >= -allowance, `${label}: left clipped ${JSON.stringify(box)}`);
  assert(box.right <= viewport.width + allowance, `${label}: right clipped ${JSON.stringify(box)}`);
  assert(box.top >= -allowance, `${label}: top clipped ${JSON.stringify(box)}`);
  assert(box.bottom <= viewport.height + allowance, `${label}: bottom clipped ${JSON.stringify(box)}`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function verifyOverlayWithinViewport(page, locator, profile, label) {
  const box = await locator.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
  assertWithinViewport(box, profile.viewport, `${profile.name}:${label}`, 2);
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('[data-stage="ui-4"]').waitFor();
  await page.waitForTimeout(250);

  assert(await page.locator('.vite-error-overlay').count() === 0, `${profile.name}: Vite error overlay visible`);
  await assertNoHorizontalOverflow(page, `${profile.name}:initial`);

  const topbar = await rect(page, '[data-shell-part="topbar"]');
  const dock = await rect(page, '[data-shell-part="bottom-dock"]');
  assertWithinViewport(topbar, profile.viewport, `${profile.name}:topbar`, 2);
  assertWithinViewport(dock, profile.viewport, `${profile.name}:dock`, 2);
  assert(topbar.height >= 60, `${profile.name}: topbar too small ${topbar.height}`);
  assert(dock.height >= 70, `${profile.name}: dock too small ${dock.height}`);

  const brand = page.getByText('إنجاز', { exact: true });
  assert(await brand.isVisible(), `${profile.name}: ENJAZ title hidden`);

  const primary = page.getByRole('button', { name: 'إجراء جديد' });
  const primaryBox = await primary.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, center: r.left + r.width / 2 };
  });
  const dockCenter = dock.left + dock.width / 2;
  assert(Math.abs(primaryBox.center - dockCenter) <= 3, `${profile.name}: central action is not centered ${JSON.stringify({ primaryBox, dockCenter })}`);
  assert(primaryBox.width >= 44 && primaryBox.height >= 44, `${profile.name}: central action undersized`);

  await page.screenshot({ path: path.join(outDir, `${profile.name}-home.png`), fullPage: true });

  for (const [label, heading] of [['اليوم', 'اليوم'], ['العمليات', 'العمليات'], ['المالية', 'المالية'], ['الرئيسية', 'الرئيسية']]) {
    await page.getByRole('button', { name: label }).click();
    await page.getByRole('heading', { name: heading, level: 1 }).waitFor();
    assert(await page.locator('[data-shell-part="bottom-dock"]').isVisible(), `${profile.name}: dock disappeared after ${label}`);
    await assertNoHorizontalOverflow(page, `${profile.name}:nav-${label}`);
  }

  await page.getByRole('button', { name: 'بحث' }).click();
  const searchDialog = page.getByRole('dialog', { name: 'البحث العام' });
  await searchDialog.waitFor();
  await page.waitForTimeout(280);
  await verifyOverlayWithinViewport(page, page.locator('.ez-shell-search__panel'), profile, 'search-panel');
  const searchInput = page.getByLabel('عبارة البحث');
  await searchInput.fill('شركة الرافدين — معاملة ABC-2026 ١٠٤٢');
  assert((await searchInput.inputValue()).includes('ABC-2026'), `${profile.name}: search typing failed`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-search.png`) });

  await page.keyboard.press('Escape');
  await searchDialog.waitFor({ state: 'detached' });
  assert(await page.locator('[data-shell-part="bottom-dock"]').isVisible(), `${profile.name}: dock missing after search close`);

  await page.getByRole('button', { name: 'الإشعارات' }).click();
  const notifications = page.getByRole('dialog', { name: 'الإشعارات' });
  await notifications.waitFor();
  await page.waitForTimeout(420);
  await verifyOverlayWithinViewport(page, notifications, profile, 'notifications-sheet');
  await page.screenshot({ path: path.join(outDir, `${profile.name}-notifications.png`) });
  await page.goBack();
  await notifications.waitFor({ state: 'detached' });

  await primary.click();
  const createSheet = page.getByRole('dialog', { name: 'إجراء جديد' });
  await createSheet.waitFor();
  await page.waitForTimeout(420);
  await verifyOverlayWithinViewport(page, createSheet, profile, 'create-sheet');
  await page.screenshot({ path: path.join(outDir, `${profile.name}-create.png`) });
  await page.getByRole('button', { name: 'إغلاق' }).last().click();
  await createSheet.waitFor({ state: 'detached' });

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(120);
  const dockAfterScroll = await rect(page, '[data-shell-part="bottom-dock"]');
  assertWithinViewport(dockAfterScroll, profile.viewport, `${profile.name}:dock-after-scroll`, 2);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-scrolled.png`) });

  if (profile.mobile) {
    const targets = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
      const r = button.getBoundingClientRect();
      return { label: button.getAttribute('aria-label') || button.textContent?.trim() || 'button', width: r.width, height: r.height, visible: r.width > 0 && r.height > 0 };
    }).filter((item) => item.visible));
    const undersized = targets.filter((target) => target.width < 44 || target.height < 44);
    assert(undersized.length === 0, `${profile.name}: undersized touch targets ${JSON.stringify(undersized)}`);

    await page.evaluate(() => { document.documentElement.dataset.enjazKeyboard = 'open'; });
    await page.waitForTimeout(240);
    const keyboardDockState = await page.locator('[data-shell-part="bottom-dock"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, pointerEvents: style.pointerEvents, transform: style.transform };
    });
    assert(Number(keyboardDockState.opacity) < 0.1 && keyboardDockState.pointerEvents === 'none', `${profile.name}: keyboard-open dock contract failed ${JSON.stringify(keyboardDockState)}`);
    await page.evaluate(() => { document.documentElement.dataset.enjazKeyboard = 'closed'; });
  }

  await assertNoHorizontalOverflow(page, `${profile.name}:final`);
  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);

  await context.close();
  return { profile: profile.name, topbar, dock, primaryCenterDelta: Math.abs(primaryBox.center - dockCenter) };
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
  console.log(`UI-4 Reality Gate PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
