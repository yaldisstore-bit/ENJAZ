import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE54_BASE_URL || 'http://127.0.0.1:4198';
const outDir = process.env.PHASE54_ARTIFACT_DIR || 'artifacts/phase5-4-transaction-lifecycle';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.4 Reality FAIL: ${message}`);
}
function collectErrors(page) {
  const errors = { console: [], page: [] };
  page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', (error) => errors.page.push(error.message));
  return errors;
}
async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}
async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,[role="button"],input,select,textarea')).map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      name: el.getAttribute('aria-label') || el.textContent?.replace(/\s+/g, ' ').trim() || el.tagName,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05,
    };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized interactive targets ${JSON.stringify(undersized)}`);
}
async function assertOverlayOwnsModalLayer(page, selector, label) {
  const result = await page.evaluate((overlaySelector) => {
    const overlays = Array.from(document.querySelectorAll(overlaySelector));
    const overlay = overlays.at(-1);
    if (!(overlay instanceof HTMLElement)) return { bodyPortal: false, offenders: ['overlay-missing'] };
    const offenders = [];
    for (const shellSelector of ['.ez-bottom-dock', '.ez-app-shell__topbar']) {
      const element = document.querySelector(shellSelector);
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') continue;
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const top = document.elementFromPoint(x, y);
      if (top && !overlay.contains(top)) offenders.push(`${shellSelector}->${top instanceof HTMLElement ? top.className || top.tagName : String(top)}`);
    }
    return { bodyPortal: overlay.parentElement === document.body, offenders };
  }, selector);
  assert(result.bodyPortal, `${label}: overlay is not portaled to document.body`);
  assert(result.offenders.length === 0, `${label}: shell chrome rendered above lifecycle modal ${JSON.stringify(result.offenders)}`);
}
async function settle(page, selector) {
  await page.locator(selector).last().evaluate(async (overlay) => {
    const animations = overlay.getAnimations({ subtree: true });
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });
}
async function bootTransactions(page, label) {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  const app = page.locator('[data-core-app="true"]');
  await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${label}: frozen UI marker changed`);
  const phase = Number(await app.getAttribute('data-product-phase'));
  assert(Number.isFinite(phase) && phase >= 5.4, `${label}: product phase is below 5.4`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${label}: browser gate escaped preview isolation`);
  await page.getByRole('button', { name: 'مجالات إنجاز', exact: true }).click();
  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await page.locator('[data-domain-screen="transactions"][data-transaction-status="ready"]').waitFor();
}
async function findCard(page, search, label) {
  await page.getByLabel('بحث المعاملات').fill(search);
  const card = page.locator('[data-transaction-results="true"] [data-transaction-id]').first();
  await card.waitFor();
  assert(await card.locator('[data-transaction-lifecycle]').isVisible(), `${label}: lifecycle entry action is missing`);
  return card;
}
async function openLifecycle(page, card, label) {
  await card.locator('[data-transaction-lifecycle]').click();
  const sheet = page.getByRole('dialog', { name: 'إدارة حالة المعاملة' });
  await sheet.waitFor();
  await sheet.locator('[data-pattern="transaction-lifecycle"]').waitFor();
  await assertOverlayOwnsModalLayer(page, '.ez-overlay--sheet', `${label}-sheet`);
  await settle(page, '.ez-overlay--sheet');
  return sheet;
}
async function confirmAction(page, sheet, action, visibleLabel, label) {
  const trigger = sheet.locator(`[data-lifecycle-action="${action}"]`);
  await trigger.waitFor();
  assert(await trigger.isVisible(), `${label}: ${action} action is not visible`);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: visibleLabel });
  await dialog.waitFor();
  await assertOverlayOwnsModalLayer(page, '.ez-overlay:not(.ez-overlay--sheet)', `${label}-confirm`);
  await settle(page, '.ez-overlay:not(.ez-overlay--sheet)');
  await dialog.getByRole('button', { name: visibleLabel, exact: true }).click();
  await page.getByText('تم تحديث دورة الحياة', { exact: true }).waitFor();
}

async function verifyArchive(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await bootTransactions(page, 'archive-1280');
  const card = await findCard(page, '1042', 'archive-1280');
  const sheet = await openLifecycle(page, card, 'archive-1280');
  assert(await sheet.getByText('المتابعات المفتوحة المحفوظة', { exact: true }).isVisible(), 'archive-1280: followup preservation fact is missing');
  assert(await sheet.locator('[data-lifecycle-action="archive"]').isVisible(), 'archive-1280: archive action missing for active transaction');
  assert(await sheet.locator('[data-lifecycle-action="restore"]').count() === 0, 'archive-1280: restore is offered before archive');
  await sheet.getByLabel('ملاحظة دورة حياة المعاملة').fill('أرشفة اختبارية مع إبقاء المتابعات محفوظة');
  await confirmAction(page, sheet, 'archive', 'أرشفة المعاملة', 'archive-1280');
  assert(await sheet.getByText('مؤرشفة', { exact: true }).isVisible(), 'archive-1280: archived state did not settle in lifecycle surface');
  assert(await sheet.locator('[data-lifecycle-action="restore"]').isVisible(), 'archive-1280: restore did not become available after archive');
  assert(await sheet.locator('[data-lifecycle-action="archive"]').count() === 0, 'archive-1280: repeated archive remained available');
  await noHorizontalOverflow(page, 'archive-1280');
  await assertTouchTargets(page, 'archive-1280');
  await page.screenshot({ path: path.join(outDir, 'lifecycle-archive-1280.png'), fullPage: false });
  assert(errors.console.length === 0, `archive-1280: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `archive-1280: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 1280, archive: true, confirmation: true, preservedFollowups: true };
}

async function verifyRestore(browser) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await bootTransactions(page, 'restore-430');
  await page.getByRole('button', { name: /المؤرشفة/ }).click();
  const card = await findCard(page, '0994', 'restore-430');
  const sheet = await openLifecycle(page, card, 'restore-430');
  assert(await sheet.locator('[data-lifecycle-action="restore"]').isVisible(), 'restore-430: restore missing for archived active transaction');
  assert(await sheet.locator('[data-lifecycle-action="reactivate"]').count() === 0, 'restore-430: reactivation offered for non-completed archived transaction');
  await confirmAction(page, sheet, 'restore', 'استعادة من الأرشيف', 'restore-430');
  assert(await sheet.getByText('جارية', { exact: true }).isVisible(), 'restore-430: restored active transaction did not return to current state');
  assert(await sheet.locator('[data-lifecycle-action="archive"]').isVisible(), 'restore-430: archive did not return after restore');
  await noHorizontalOverflow(page, 'restore-430');
  await assertTouchTargets(page, 'restore-430');
  await page.screenshot({ path: path.join(outDir, 'lifecycle-restore-430.png'), fullPage: false });
  assert(errors.console.length === 0, `restore-430: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `restore-430: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 430, restore: true, touch: true };
}

async function verifyReactivate(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await bootTransactions(page, 'reactivate-390');
  await page.getByRole('button', { name: /المؤرشفة/ }).click();
  const card = await findCard(page, '1008', 'reactivate-390');
  const sheet = await openLifecycle(page, card, 'reactivate-390');
  assert(await sheet.getByText('مكتملة', { exact: true }).isVisible(), 'reactivate-390: completed state is not explicit');
  assert(await sheet.locator('[data-lifecycle-action="reactivate"]').isVisible(), 'reactivate-390: reactivation missing for completed transaction');
  assert(await sheet.locator('[data-lifecycle-action="restore"]').count() === 0, 'reactivate-390: restore incorrectly offered for non-archived completed transaction');
  await confirmAction(page, sheet, 'reactivate', 'إعادة تنشيط المعاملة', 'reactivate-390');
  assert(await sheet.getByText('جارية', { exact: true }).isVisible(), 'reactivate-390: completed transaction did not become active');
  assert(await sheet.locator('[data-lifecycle-action="reactivate"]').count() === 0, 'reactivate-390: repeated reactivation remained available');
  await noHorizontalOverflow(page, 'reactivate-390');
  await assertTouchTargets(page, 'reactivate-390');
  await page.screenshot({ path: path.join(outDir, 'lifecycle-reactivate-390.png'), fullPage: false });
  assert(errors.console.length === 0, `reactivate-390: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `reactivate-390: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 390, reactivate: true, completedBoundary: true, touch: true };
}

async function verifyNarrowLongText(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await bootTransactions(page, `narrow-${width}`);
  const card = await findCard(page, 'ENJAZ-LONG-MIXED-TOKEN-2026', `narrow-${width}`);
  const sheet = await openLifecycle(page, card, `narrow-${width}`);
  assert(await sheet.getByText('ENJAZ-LONG-MIXED-TOKEN-2026', { exact: false }).isVisible(), `narrow-${width}: long mixed identity disappeared from lifecycle sheet`);
  assert(await sheet.locator('[data-lifecycle-action="archive"]').isVisible(), `narrow-${width}: archive action disappeared on narrow screen`);
  await noHorizontalOverflow(page, `narrow-${width}`);
  await assertTouchTargets(page, `narrow-${width}`);
  await page.screenshot({ path: path.join(outDir, `lifecycle-long-${width}.png`), fullPage: false });
  assert(errors.console.length === 0, `narrow-${width}: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `narrow-${width}: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width, longText: true, touch: true, modalLayer: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [
    await verifyArchive(browser),
    await verifyRestore(browser),
    await verifyReactivate(browser),
    await verifyNarrowLongText(browser, 360),
    await verifyNarrowLongText(browser, 320),
  ];
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 5.4 Transaction Lifecycle Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
