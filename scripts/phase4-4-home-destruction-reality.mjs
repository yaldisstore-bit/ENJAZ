import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE44_BASE_URL || 'http://127.0.0.1:4194';
const outDir = process.env.PHASE44_ARTIFACT_DIR || 'artifacts/phase4-4-home-destruction';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 4.4 Reality FAIL: ${message}`);
}

function scenarioUrl(name) {
  return `${baseUrl}/?phase44-home=${encodeURIComponent(name)}`;
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,[role="button"]')).map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      name: el.getAttribute('aria-label') || el.textContent?.replace(/\s+/g, ' ').trim() || el.tagName,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05,
    };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized touch targets ${JSON.stringify(undersized)}`);
}

async function attachErrorCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function assertRuntime(page, label) {
  const app = page.locator('[data-core-app="true"]');
  await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${label}: frozen UI marker changed`);
  const productPhase = Number(await app.getAttribute('data-product-phase'));
  assert(Number.isFinite(productPhase) && productPhase >= 4.4, `${label}: product phase regressed below Phase 4.4`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${label}: destruction runtime escaped preview isolation`);
  return app;
}

async function verifyEmpty(browser) {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = await attachErrorCollectors(page);
  await page.goto(scenarioUrl('empty'), { waitUntil: 'networkidle', timeout: 30_000 });
  await assertRuntime(page, 'empty');
  await page.locator('[data-home-status="ready"]').waitFor();
  assert(await page.locator('[data-home-empty="true"]').isVisible(), 'empty: explicit empty state missing');
  assert(await page.locator('[data-home-priority-list="true"] [data-home-priority]').count() === 0, 'empty: priority rows leaked into empty dataset');
  assert(await page.locator('[data-home-summary="true"]').isVisible(), 'empty: zero summary missing');
  await noHorizontalOverflow(page, 'empty-320');
  await assertTouchTargets(page, 'empty-320');
  await page.screenshot({ path: path.join(outDir, 'empty-320.png'), fullPage: true });
  assert(errors.consoleErrors.length === 0, `empty: console errors ${errors.consoleErrors.join(' | ')}`);
  assert(errors.pageErrors.length === 0, `empty: page errors ${errors.pageErrors.join(' | ')}`);
  await context.close();
  return { scenario: 'empty', passed: true };
}

async function verifyDense(browser) {
  const profiles = [
    { name: 'desktop-1280', width: 1280, height: 900, mobile: false },
    { name: 'phone-430', width: 430, height: 932, mobile: true },
    { name: 'phone-390', width: 390, height: 844, mobile: true },
    { name: 'phone-360', width: 360, height: 740, mobile: true },
    { name: 'phone-320', width: 320, height: 700, mobile: true },
  ];

  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1, hasTouch: profile.mobile, isMobile: profile.mobile });
    const page = await context.newPage();
    const errors = await attachErrorCollectors(page);
    await page.goto(scenarioUrl('dense'), { waitUntil: 'networkidle', timeout: 30_000 });
    await assertRuntime(page, `dense:${profile.name}`);
    await page.locator('[data-home-status="ready"]').waitFor();
    assert(await page.locator('[data-home-priority]').count() === 6, `${profile.name}: dense priority output is not bounded at six`);
    assert(await page.locator('[data-home-finance-precision="unsafe"]').isVisible(), `${profile.name}: unsafe huge money was not guarded`);
    assert(await page.getByText('قيمة مالية أكبر من نطاق الدقة الآمن', { exact: true }).isVisible(), `${profile.name}: huge-money warning missing`);
    await noHorizontalOverflow(page, `dense:${profile.name}`);
    if (profile.mobile) await assertTouchTargets(page, `dense:${profile.name}`);
    const boxes = await page.locator('[data-home-priority]').evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }));
    assert(boxes.every((box) => box.left >= -2 && box.right <= profile.width + 2 && box.width > 0), `${profile.name}: dense priority geometry escaped viewport ${JSON.stringify(boxes)}`);
    await page.screenshot({ path: path.join(outDir, `dense-${profile.name}.png`), fullPage: true });
    assert(errors.consoleErrors.length === 0, `${profile.name}: console errors ${errors.consoleErrors.join(' | ')}`);
    assert(errors.pageErrors.length === 0, `${profile.name}: page errors ${errors.pageErrors.join(' | ')}`);
    await context.close();
  }
  return { scenario: 'dense', profiles: profiles.length, passed: true };
}

async function verifyConflict(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = await attachErrorCollectors(page);
  await page.goto(scenarioUrl('conflict'), { waitUntil: 'networkidle', timeout: 30_000 });
  const app = await assertRuntime(page, 'conflict');
  await page.locator('[data-home-status="ready"]').waitFor();
  assert(await page.getByText('حالة متعارضة محسومة: العائق الحرج هو الأعلى', { exact: true }).first().isVisible(), 'conflict: resolved highest priority is not visible');
  for (const signal of ['overdue-followups', 'open-blockers', 'stalled-transactions']) {
    assert(await page.locator(`[data-home-signal="${signal}"]`).isVisible(), `conflict: signal missing ${signal}`);
  }
  await noHorizontalOverflow(page, 'conflict');
  await assertTouchTargets(page, 'conflict');

  await page.locator('[data-home-priority]').first().click();
  await page.locator('[data-domain-runtime="transactions"]').waitFor();
  assert(await app.getAttribute('data-active-domain') === 'transactions', 'conflict: priority click did not open transaction context');
  await page.getByRole('button', { name: 'العودة للأساسية', exact: true }).click();
  await page.locator('[data-home-status="ready"]').waitFor();
  await page.screenshot({ path: path.join(outDir, 'conflict-390.png'), fullPage: true });
  assert(errors.consoleErrors.length === 0, `conflict: console errors ${errors.consoleErrors.join(' | ')}`);
  assert(errors.pageErrors.length === 0, `conflict: page errors ${errors.pageErrors.join(' | ')}`);
  await context.close();
  return { scenario: 'conflict', passed: true };
}

async function verifySlow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = await attachErrorCollectors(page);
  await page.goto(scenarioUrl('slow'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await assertRuntime(page, 'slow');
  await page.locator('[data-home-status="loading"]').waitFor({ timeout: 2_000 });
  assert(await page.getByLabel('جارٍ تحميل لوحة العمل').isVisible(), 'slow: loading skeleton missing');
  await page.locator('[data-home-status="ready"]').waitFor({ timeout: 3_000 });
  await noHorizontalOverflow(page, 'slow-ready');
  await assertTouchTargets(page, 'slow-ready');
  assert(errors.consoleErrors.length === 0, `slow: console errors ${errors.consoleErrors.join(' | ')}`);
  assert(errors.pageErrors.length === 0, `slow: page errors ${errors.pageErrors.join(' | ')}`);
  await context.close();
  return { scenario: 'slow', passed: true };
}

async function verifyOfflineRecovery(browser) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = await attachErrorCollectors(page);
  await page.goto(scenarioUrl('offline'), { waitUntil: 'networkidle', timeout: 30_000 });
  await assertRuntime(page, 'offline');
  await page.locator('[data-home-status="error"]').waitFor();
  assert(await page.getByText('تعذر تحميل الرئيسية', { exact: true }).isVisible(), 'offline: failure notice missing');
  assert(await page.locator('[data-home-priority]').count() === 0, 'offline: stale priorities rendered during failure');
  assert(await page.locator('[data-home-finance-precision]').count() === 0, 'offline: stale financial facts rendered during failure');
  await noHorizontalOverflow(page, 'offline-error');
  await assertTouchTargets(page, 'offline-error');
  await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
  await page.locator('[data-home-status="loading"]').waitFor();
  await page.locator('[data-home-status="ready"]').waitFor({ timeout: 2_000 });
  await noHorizontalOverflow(page, 'offline-recovered');
  await page.screenshot({ path: path.join(outDir, 'offline-recovered-360.png'), fullPage: true });
  assert(errors.consoleErrors.length === 0, `offline: console errors ${errors.consoleErrors.join(' | ')}`);
  assert(errors.pageErrors.length === 0, `offline: page errors ${errors.pageErrors.join(' | ')}`);
  await context.close();
  return { scenario: 'offline', passed: true };
}

async function verifyInteractionTorture(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = await attachErrorCollectors(page);
  await page.goto(scenarioUrl('normal'), { waitUntil: 'networkidle', timeout: 30_000 });
  await assertRuntime(page, 'interaction');
  await page.locator('[data-home-status="ready"]').waitFor();

  const nav = page.getByRole('navigation', { name: 'التنقل الرئيسي' });
  await nav.getByRole('button', { name: 'اليوم', exact: true }).click();
  await page.locator('[data-core-screen="today"]').waitFor();
  await nav.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await page.locator('[data-home-status="ready"]').waitFor();

  await page.getByRole('button', { name: 'فتح الملخص التنفيذي', exact: true }).click();
  await page.locator('[data-core-screen="executive-briefing"]').waitFor();
  await page.getByRole('button', { name: 'العودة للرئيسية', exact: true }).click();
  await page.locator('[data-home-status="ready"]').waitFor();

  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'البحث العام', exact: true });
  await search.waitFor();
  await page.getByLabel('عبارة البحث').fill('ENJAZ 4.4 اختبار لوحة مفاتيح');
  await page.setViewportSize({ width: 390, height: 460 });
  await noHorizontalOverflow(page, 'interaction:keyboard-height');
  await page.keyboard.press('Escape');
  await search.waitFor({ state: 'detached' });

  await page.setViewportSize({ width: 844, height: 390 });
  await noHorizontalOverflow(page, 'interaction:landscape');
  await page.setViewportSize({ width: 320, height: 700 });
  await noHorizontalOverflow(page, 'interaction:320');
  await assertTouchTargets(page, 'interaction:320');
  await page.screenshot({ path: path.join(outDir, 'interaction-320.png'), fullPage: true });

  assert(errors.consoleErrors.length === 0, `interaction: console errors ${errors.consoleErrors.join(' | ')}`);
  assert(errors.pageErrors.length === 0, `interaction: page errors ${errors.pageErrors.join(' | ')}`);
  await context.close();
  return { scenario: 'interaction', passed: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  results.push(await verifyEmpty(browser));
  results.push(await verifyDense(browser));
  results.push(await verifyConflict(browser));
  results.push(await verifySlow(browser));
  results.push(await verifyOfflineRecovery(browser));
  results.push(await verifyInteractionTorture(browser));
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 4.4 Home Destruction Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
