import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE51_BASE_URL || 'http://127.0.0.1:4195';
const outDir = process.env.PHASE51_ARTIFACT_DIR || 'artifacts/phase5-1-transaction-list';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.1 Reality FAIL: ${message}`);
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({ html: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,[role="button"]')).map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { name: el.getAttribute('aria-label') || el.textContent?.replace(/\s+/g, ' ').trim() || el.tagName, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05 };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized touch targets ${JSON.stringify(undersized)}`);
}

function collectErrors(page) {
  const errors = { console: [], page: [] };
  page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', (error) => errors.page.push(error.message));
  return errors;
}

async function openTransactions(page, label) {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  const app = page.locator('[data-core-app="true"]');
  await app.waitFor();
  assert(await app.getAttribute('data-stage') === 'ui-10', `${label}: frozen UI marker changed`);
  const productPhase = Number(await app.getAttribute('data-product-phase'));
  assert(Number.isFinite(productPhase) && productPhase >= 4.4, `${label}: product phase regressed below Phase 4.4`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${label}: CI runtime escaped preview isolation`);
  await page.getByRole('button', { name: 'مجالات إنجاز', exact: true }).click();
  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await page.locator('[data-domain-screen="transactions"][data-transaction-status="ready"]').waitFor();
  assert(await page.locator('[data-saved-view-anchor="transactions"]').getAttribute('data-saved-view-schema') === 'enjaz.transactions.list.v1', `${label}: saved-view anchor/schema missing`);
}

async function verifyResponsive(browser) {
  const profiles = [
    { name: 'desktop-1280', width: 1280, height: 900, mobile: false },
    { name: 'phone-430', width: 430, height: 932, mobile: true },
    { name: 'phone-390', width: 390, height: 844, mobile: true },
    { name: 'phone-360', width: 360, height: 800, mobile: true },
    { name: 'phone-320', width: 320, height: 700, mobile: true },
  ];
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1, hasTouch: profile.mobile, isMobile: profile.mobile });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await openTransactions(page, profile.name);
    assert(await page.locator('[data-transaction-results="true"] .ez-transaction-card').count() === 20, `${profile.name}: default transaction page is not bounded at 20`);
    assert(await page.getByText('28 نتيجة', { exact: true }).isVisible(), `${profile.name}: current total fixture count changed`);
    await noHorizontalOverflow(page, profile.name);
    if (profile.mobile) await assertTouchTargets(page, profile.name);
    const cards = await page.locator('.ez-transaction-card').evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width }; }));
    assert(cards.every((box) => box.left >= -2 && box.right <= profile.width + 2 && box.width > 0), `${profile.name}: transaction card escaped viewport ${JSON.stringify(cards)}`);
    if (profile.name === 'phone-320') await page.screenshot({ path: path.join(outDir, 'transactions-320.png'), fullPage: true });
    assert(errors.console.length === 0, `${profile.name}: console errors ${errors.console.join(' | ')}`);
    assert(errors.page.length === 0, `${profile.name}: page errors ${errors.page.join(' | ')}`);
    await context.close();
  }
  return { responsiveProfiles: profiles.length, passed: true };
}

async function verifyInteraction(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'interaction');

  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await page.getByText('2 / 2', { exact: true }).waitFor();
  assert(await page.locator('[data-transaction-results="true"] .ez-transaction-card').count() === 8, 'pagination: second page must contain eight rows');
  await page.getByRole('button', { name: 'السابق', exact: true }).click();
  await page.getByText('1 / 2', { exact: true }).waitFor();

  const search = page.getByLabel('بحث المعاملات');
  await search.fill('روز بغداد');
  await page.waitForTimeout(80);
  assert(await page.locator('.ez-transaction-card').count() === 1, 'Arabic/company search did not reduce current view to one row');
  assert(await page.getByText('تعديل عنوان الشركة', { exact: true }).isVisible(), 'company search returned the wrong current transaction');

  await search.fill('');
  await page.locator('.ez-segmented button').filter({ hasText: 'متلكئة' }).click();
  await page.waitForTimeout(60);
  assert(await page.getByText('2 نتيجة', { exact: true }).isVisible(), 'stalled/delayed view count is not two');
  await search.fill('قرار تأسيس');
  await page.waitForTimeout(60);
  assert(await page.locator('.ez-transaction-card').count() === 1, 'stalled search did not isolate قرار تأسيس');

  await search.fill('');
  await page.locator('.ez-segmented button').filter({ hasText: 'المؤرشفة' }).click();
  await page.waitForTimeout(60);
  assert(await page.getByText('2 نتيجة', { exact: true }).isVisible(), 'archived/closed view count is not two');

  await page.locator('.ez-segmented button').filter({ hasText: 'الجارية' }).click();
  await page.getByLabel('ترتيب المعاملات').selectOption('fee-desc');
  await page.waitForTimeout(60);
  const first = page.locator('.ez-transaction-card').first();
  assert(await first.getByText('تحقق من المالية', { exact: true }).isVisible(), 'unsafe largest money was rendered as exact');
  assert(await first.getByText('تحقق من الربط', { exact: true }).isVisible(), 'missing company relation warning missing');

  const longQuery = `إضَافة ENJAZ-2026 ${'شركة '.repeat(80)}`;
  await search.fill(longQuery);
  await page.waitForTimeout(60);
  assert((await search.inputValue()).length <= 120, 'search input escaped the 120-character contract');
  assert(await page.locator('[data-transaction-empty="true"]').isVisible(), 'long impossible search did not produce explicit empty state');

  await search.fill('');
  await page.getByLabel('ترتيب المعاملات').selectOption('activity-desc');
  await noHorizontalOverflow(page, 'interaction-final');
  await assertTouchTargets(page, 'interaction-final');
  await page.screenshot({ path: path.join(outDir, 'transactions-interaction-390.png'), fullPage: true });
  assert(errors.console.length === 0, `interaction: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `interaction: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { searchSortPagination: true, passed: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [await verifyResponsive(browser), await verifyInteraction(browser)];
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 5.1 Transaction List Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
