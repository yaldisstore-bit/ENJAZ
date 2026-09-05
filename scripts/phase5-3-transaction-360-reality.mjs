import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE53_BASE_URL || 'http://127.0.0.1:4197';
const outDir = process.env.PHASE53_ARTIFACT_DIR || 'artifacts/phase5-3-transaction-360';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.3 Reality FAIL: ${message}`);
}
async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({ html: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}
async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,[role="button"],input,select,textarea')).map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { name: el.getAttribute('aria-label') || el.textContent?.replace(/\s+/g, ' ').trim() || el.tagName, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05 };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized interactive targets ${JSON.stringify(undersized)}`);
}
async function assertSheetOwnsModalLayer(page, label) {
  const result = await page.evaluate(() => {
    const overlay = document.querySelector('.ez-overlay--sheet');
    if (!(overlay instanceof HTMLElement)) return { bodyPortal: false, offenders: ['overlay-missing'] };
    const offenders = [];
    for (const selector of ['.ez-bottom-dock', '.ez-app-shell__topbar']) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') continue;
      const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const top = document.elementFromPoint(x, y);
      if (top && !overlay.contains(top)) offenders.push(`${selector}->${top instanceof HTMLElement ? top.className || top.tagName : String(top)}`);
    }
    return { bodyPortal: overlay.parentElement === document.body, offenders };
  });
  assert(result.bodyPortal, `${label}: sheet overlay is trapped inside an app stacking context`);
  assert(result.offenders.length === 0, `${label}: shell chrome rendered above modal layer ${JSON.stringify(result.offenders)}`);
}
function collectErrors(page) {
  const errors = { console: [], page: [] };
  page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', (error) => errors.page.push(error.message));
  return errors;
}
async function boot(page, label) {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  const app = page.locator('[data-core-app="true"]');
  await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${label}: frozen UI marker changed`);
  const productPhase = Number(await app.getAttribute('data-product-phase'));
  assert(Number.isFinite(productPhase) && productPhase >= 5.3, `${label}: product phase is below 5.3`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${label}: CI runtime escaped preview isolation`);
}
async function openTransactions(page, label) {
  await boot(page, label);
  await page.getByRole('button', { name: 'مجالات إنجاز', exact: true }).click();
  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await page.locator('[data-domain-screen="transactions"][data-transaction-status="ready"]').waitFor();
}
async function openFirst360(page, label) {
  const button = page.locator('[data-transaction-open-360]').first();
  await button.waitFor();
  await button.click();
  const sheet = page.getByRole('dialog', { name: 'ملف المعاملة 360°' });
  await sheet.waitFor();
  await sheet.locator('[data-pattern="transaction-360"]').waitFor();
  await assertSheetOwnsModalLayer(page, label);
  return sheet;
}

async function verifyDesktopContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'desktop-1280');
  const sheet = await openFirst360(page, 'desktop-1280');
  for (const name of ['timeline', 'followups', 'finance', 'notes', 'documents']) {
    const selector = `[data-transaction-360-section="${name}"]`;
    assert(await sheet.locator(selector).isVisible(), `desktop-1280: missing 360 section ${selector}`);
  }
  assert(await sheet.getByText('للعمليات الكاملة افتح مركز المالية.', { exact: true }).isVisible(), 'desktop-1280: finance scope boundary missing');
  assert((await sheet.locator('[data-transaction-360-section="timeline"] li').count()) >= 3, 'desktop-1280: timeline did not compose multiple authoritative event families');
  await noHorizontalOverflow(page, 'desktop-1280');
  await assertTouchTargets(page, 'desktop-1280');
  await page.screenshot({ path: path.join(outDir, 'transaction-360-1280.png'), fullPage: false });
  assert(errors.console.length === 0, `desktop-1280: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `desktop-1280: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 1280, context: true, timeline: true, modalLayer: true };
}

async function verifyMissingRelation(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'missing-relation-390');
  await page.getByLabel('بحث المعاملات').fill('3001');
  await page.locator('[data-transaction-results="true"] [data-transaction-id]').first().waitFor();
  const sheet = await openFirst360(page, 'missing-relation-390');
  assert(await sheet.getByText('ربط الشركة يحتاج تحققًا', { exact: true }).isVisible(), 'missing-relation-390: missing company warning is hidden');
  assert(await sheet.getByText('بيانات الشركة غير متاحة', { exact: true }).isVisible(), 'missing-relation-390: missing company was fabricated');
  await noHorizontalOverflow(page, 'missing-relation-390');
  await assertTouchTargets(page, 'missing-relation-390');
  await page.screenshot({ path: path.join(outDir, 'transaction-360-missing-company-390.png'), fullPage: false });
  assert(errors.console.length === 0, `missing-relation-390: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `missing-relation-390: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 390, missingRelation: true, modalLayer: true };
}

async function verifyNarrowLongText(browser) {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'long-phone-320');
  await page.getByLabel('بحث المعاملات').fill('ENJAZ-LONG-MIXED-TOKEN-2026');
  const result = page.locator('[data-transaction-results="true"] [data-transaction-id]').first();
  await result.waitFor();
  assert(await result.locator('[data-transaction-open-360]').isVisible(), 'long-phone-320: 360 action disappeared on narrow long-text card');
  assert(await result.locator('[data-transaction-edit]').isVisible(), 'long-phone-320: edit action disappeared on narrow long-text card');
  const sheet = await openFirst360(page, 'long-phone-320');
  assert(await sheet.getByText('ENJAZ-LONG-MIXED-TOKEN-2026', { exact: false }).isVisible(), 'long-phone-320: long mixed transaction identity missing in 360');
  await noHorizontalOverflow(page, 'long-phone-320');
  await assertTouchTargets(page, 'long-phone-320');
  await sheet.getByRole('button', { name: 'إغلاق', exact: true }).focus();
  assert(await sheet.getByRole('button', { name: 'إغلاق', exact: true }).evaluate((node) => node === document.activeElement), 'long-phone-320: keyboard focus cannot reach sheet close action');
  await page.screenshot({ path: path.join(outDir, 'transaction-360-long-320.png'), fullPage: false });
  assert(errors.console.length === 0, `long-phone-320: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `long-phone-320: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 320, longText: true, touch: true, modalLayer: true };
}

async function verifyArchivedBoundary(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, `archived-${width}`);
  await page.getByRole('button', { name: /المؤرشفة/ }).click();
  const card = page.locator('[data-transaction-view="archived"]').first();
  await card.waitFor();
  assert(await card.locator('[data-transaction-open-360]').isVisible(), `archived-${width}: archived transaction lost read-only 360 access`);
  assert(await card.locator('[data-transaction-edit]').count() === 0, `archived-${width}: Phase 5.3 leaked archived edit/lifecycle action`);
  assert(await card.getByText('360° للعرض فقط؛ الاستعادة غير متاحة هنا.', { exact: true }).isVisible(), `archived-${width}: archived read-only boundary label missing`);
  await card.locator('[data-transaction-open-360]').click();
  const sheet = page.getByRole('dialog', { name: 'ملف المعاملة 360°' });
  await sheet.waitFor();
  assert(await sheet.locator('[data-pattern="transaction-360"]').isVisible(), `archived-${width}: archived 360 did not open`);
  assert(await sheet.getByText('المعاملة للعرض فقط؛ الاستعادة غير متاحة هنا.', { exact: true }).isVisible(), `archived-${width}: 360 lifecycle boundary missing`);
  await assertSheetOwnsModalLayer(page, `archived-${width}`);
  await noHorizontalOverflow(page, `archived-${width}`);
  await assertTouchTargets(page, `archived-${width}`);
  await page.screenshot({ path: path.join(outDir, `transaction-360-archived-${width}.png`), fullPage: false });
  assert(errors.console.length === 0, `archived-${width}: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `archived-${width}: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width, archivedReadOnly: true, modalLayer: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [await verifyDesktopContext(browser), await verifyMissingRelation(browser), await verifyNarrowLongText(browser), await verifyArchivedBoundary(browser, 430), await verifyArchivedBoundary(browser, 360)];
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 5.3 Transaction 360 Reality PASS: ${JSON.stringify(results)}`);
} finally { await browser.close(); }
