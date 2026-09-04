import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI9_BASE_URL || 'http://127.0.0.1:4179';
const outDir = process.env.UI9_ARTIFACT_DIR || 'artifacts/ui9-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) { if (!condition) throw new Error(message); }

async function noOverflow(page, label) {
  const value = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(value.html <= 1 && value.body <= 1, `${label}: horizontal overflow ${JSON.stringify(value)}`);
}

async function insideViewport(locator, viewport, label, allowance = 2) {
  const box = await locator.boundingBox();
  assert(box, `${label}: missing geometry`);
  assert(box.x >= -allowance && box.y >= -allowance && box.x + box.width <= viewport.width + allowance && box.y + box.height <= viewport.height + allowance, `${label}: outside viewport ${JSON.stringify(box)}`);
}

async function touchTargets(page, label) {
  const bad = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect();
    const s = getComputedStyle(button);
    return {
      name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g, ' ').trim() || 'button',
      w: r.width,
      h: r.height,
      visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > .05,
    };
  }).filter((x) => x.visible && (x.w < 44 || x.h < 44)));
  assert(bad.length === 0, `${label}: undersized touch targets ${JSON.stringify(bad)}`);
}

async function verifyMotionDuration(page, reduced, label) {
  const duration = await page.locator('.ez-motion-stage').evaluate((element) => {
    const raw = getComputedStyle(element).animationDuration;
    return raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
  });
  if (reduced) assert(duration <= 5, `${label}: reduced motion duration remained ${duration}ms`);
  else assert(duration >= 100 && duration <= 400, `${label}: motion duration outside intentional range ${duration}ms`);
}

async function closeSheetWithExit(page, dialog, label, reduced = false) {
  await dialog.getByLabel('إغلاق', { exact: true }).click();
  if (!reduced) {
    const closing = page.locator('.ez-overlay[data-motion-state="closing"]');
    await closing.waitFor({ state: 'visible', timeout: 1000 });
    assert(await closing.count() >= 1, `${label}: exit-presence state missing`);
  }
  await dialog.waitFor({ state: 'detached', timeout: 1500 });
}

async function verifyStandardProfile(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 1,
    hasTouch: profile.mobile,
    isMobile: profile.mobile,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('[data-core-app="true"][data-stage="ui-9"]').waitFor();
  await page.waitForTimeout(120);

  const orientation = await page.locator('html').getAttribute('data-enjaz-orientation');
  assert(orientation === (profile.viewport.width > profile.viewport.height ? 'landscape' : 'portrait'), `${profile.name}: wrong orientation marker ${orientation}`);
  const vv = await page.evaluate(() => ({
    width: getComputedStyle(document.documentElement).getPropertyValue('--ez-visual-viewport-width'),
    height: getComputedStyle(document.documentElement).getPropertyValue('--ez-visual-viewport-height'),
  }));
  assert(vv.width && vv.height, `${profile.name}: visual viewport CSS variables missing`);
  await verifyMotionDuration(page, false, profile.name);
  await noOverflow(page, `${profile.name}:initial`);
  if (profile.mobile) await touchTargets(page, `${profile.name}:initial`);

  const primary = page.getByRole('button', { name: 'إجراء جديد', exact: true });
  const touchAction = await primary.evaluate((element) => getComputedStyle(element).touchAction);
  assert(touchAction === 'manipulation', `${profile.name}: primary action touch feedback contract missing (${touchAction})`);

  const dock = page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button', { name: 'اليوم', exact: true }).click();
  await page.locator('[data-motion-surface^="core-today"]').waitFor();
  await verifyMotionDuration(page, false, `${profile.name}:today`);
  await dock.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await page.locator('[data-motion-surface^="core-home"]').waitFor();

  await page.getByRole('button', { name: 'الإشعارات', exact: true }).click();
  const notifications = page.getByRole('dialog', { name: 'الإشعارات', exact: true });
  await notifications.waitFor();
  await page.waitForTimeout(240);
  await insideViewport(notifications, profile.viewport, `${profile.name}:notifications`);
  await closeSheetWithExit(page, notifications, `${profile.name}:notifications`);

  await page.getByRole('button', { name: 'الحساب', exact: true }).click();
  const account = page.getByRole('dialog', { name: 'الحساب ومساحة العمل', exact: true });
  await account.waitFor();
  await page.goBack();
  if (await account.count()) {
    const closing = page.locator('.ez-overlay[data-motion-state="closing"]');
    await closing.waitFor({ state: 'visible', timeout: 1000 });
  }
  await account.waitFor({ state: 'detached', timeout: 1500 });

  await page.screenshot({ path: path.join(outDir, `${profile.name}-portrait-home.png`), fullPage: true });

  if (profile.mobile) {
    const landscape = { width: Math.max(profile.viewport.width, profile.viewport.height), height: Math.min(profile.viewport.width, profile.viewport.height) };
    await page.setViewportSize(landscape);
    await page.waitForFunction(() => document.documentElement.dataset.enjazOrientation === 'landscape');
    await page.waitForTimeout(120);
    await noOverflow(page, `${profile.name}:landscape`);
    await insideViewport(page.locator('[data-shell-part="topbar"]'), landscape, `${profile.name}:landscape-topbar`);
    await insideViewport(page.locator('[data-shell-part="bottom-dock"]'), landscape, `${profile.name}:landscape-dock`);
    await touchTargets(page, `${profile.name}:landscape`);

    await page.getByRole('button', { name: 'إجراء جديد', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'إجراء جديد', exact: true });
    await create.waitFor();
    await page.waitForTimeout(240);
    await insideViewport(create, landscape, `${profile.name}:landscape-create`);
    await noOverflow(page, `${profile.name}:landscape-create`);
    await page.screenshot({ path: path.join(outDir, `${profile.name}-landscape-create.png`) });
    await closeSheetWithExit(page, create, `${profile.name}:landscape-create`);

    await page.setViewportSize(profile.viewport);
    await page.waitForFunction(() => document.documentElement.dataset.enjazOrientation === 'portrait');
    await page.evaluate(() => { document.documentElement.dataset.enjazKeyboard = 'open'; });
    await page.waitForTimeout(220);
    const keyboardDock = await page.locator('[data-shell-part="bottom-dock"]').evaluate((element) => {
      const s = getComputedStyle(element);
      return { opacity: Number(s.opacity), pointerEvents: s.pointerEvents };
    });
    assert(keyboardDock.opacity < .1 && keyboardDock.pointerEvents === 'none', `${profile.name}: keyboard-open dock behavior failed ${JSON.stringify(keyboardDock)}`);
    await page.evaluate(() => { document.documentElement.dataset.enjazKeyboard = 'closed'; });
  }

  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);
  await context.close();
}

async function verifyReducedMotion(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('[data-core-app="true"][data-stage="ui-9"]').waitFor();
  await verifyMotionDuration(page, true, 'reduced-motion');
  await page.getByRole('button', { name: 'الإشعارات', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'الإشعارات', exact: true });
  await dialog.waitFor();
  const sheetDuration = await dialog.evaluate((element) => getComputedStyle(element).animationDuration);
  assert(sheetDuration === '0.001s' || sheetDuration === '1ms', `reduced-motion: sheet animation not collapsed (${sheetDuration})`);
  await closeSheetWithExit(page, dialog, 'reduced-motion', true);
  await page.screenshot({ path: path.join(outDir, 'phone-390-reduced-motion.png'), fullPage: true });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: 'desktop-1280', viewport: { width: 1280, height: 900 }, mobile: false },
    { name: 'phone-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'phone-320', viewport: { width: 320, height: 700 }, mobile: true },
  ];
  for (const profile of profiles) await verifyStandardProfile(browser, profile);
  await verifyReducedMotion(browser);
  const result = { passed: true, profiles: profiles.map((p) => p.name), rotation: true, reducedMotion: true, exitPresence: true, touch44: true, back: true };
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(`UI-9 Reality Gate PASS: ${JSON.stringify(result)}`);
} finally {
  await browser.close();
}
