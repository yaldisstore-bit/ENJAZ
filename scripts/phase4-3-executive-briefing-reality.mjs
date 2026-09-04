import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE43_BASE_URL || 'http://127.0.0.1:4193';
const outDir = process.env.PHASE43_ARTIFACT_DIR || 'artifacts/phase4-3-executive-briefing';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 4.3 Reality FAIL: ${message}`);
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

async function openBriefing(page) {
  await page.locator('[data-core-screen="home"]').waitFor();
  await page.getByRole('button', { name: 'فتح الملخص التنفيذي', exact: true }).click();
  await page.locator('[data-core-screen="executive-briefing"]').waitFor();
}

async function stressExecutiveContent(page, label) {
  const longArabic = 'ملخص تنفيذي لاختبار اسم شركة طويل جدًا مع تفاصيل تشغيلية متعددة وملاحظات عربية ممتدة للتأكد من التفاف النص دون كسر البطاقة أو دفع أي عنصر خارج حدود الشاشة';
  const mixed = 'ENJAZ-EXECUTIVE-2026-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-LONG-REFERENCE';
  const hugeMoney = '999999999999999999.99 د.ع';
  const changed = await page.evaluate(({ longArabic, mixed, hugeMoney }) => {
    const hero = document.querySelector('.ez-executive-briefing__hero-copy h2');
    const decisionTitle = document.querySelector('.ez-executive-decision strong');
    const decisionDetail = document.querySelector('.ez-executive-decision b');
    const finance = document.querySelector('.ez-executive-finance-value');
    if (hero) hero.textContent = longArabic;
    if (decisionTitle) decisionTitle.textContent = mixed;
    if (decisionDetail) decisionDetail.textContent = `${longArabic} — ${mixed}`;
    if (finance) finance.textContent = hugeMoney;
    return [hero, decisionTitle, decisionDetail, finance].filter(Boolean).length;
  }, { longArabic, mixed, hugeMoney });
  assert(changed >= 3, `${label}: realistic stress targets were not found`);
  await page.waitForTimeout(80);
  await noHorizontalOverflow(page, `${label}:stress`);
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1, hasTouch: profile.mobile, isMobile: profile.mobile });
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
  assert(Number.isFinite(productPhase) && productPhase >= 4.3, `${profile.name}: Phase 4.3 marker missing`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${profile.name}: public reality runtime escaped preview isolation`);
  assert(await page.locator('[data-executive-entry="true"]').isVisible(), `${profile.name}: Executive Briefing Home entry missing`);

  await openBriefing(page);
  const briefing = page.locator('[data-core-screen="executive-briefing"]');
  assert(await app.getAttribute('data-executive-briefing') === 'open', `${profile.name}: briefing runtime state not open`);
  assert(await page.locator('[data-executive-hero="true"]').isVisible(), `${profile.name}: executive hero missing`);
  for (const panel of ['risk', 'workload', 'finance']) {
    assert(await page.locator(`[data-executive-panel="${panel}"]`).isVisible(), `${profile.name}: panel missing ${panel}`);
  }
  assert(await page.locator('[data-executive-decision]').count() === 3, `${profile.name}: preview decision count mismatch`);
  await noHorizontalOverflow(page, `${profile.name}:briefing`);
  if (profile.mobile) await assertTouchTargets(page, `${profile.name}:briefing`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-briefing.png`), fullPage: true });

  await stressExecutiveContent(page, profile.name);
  if (profile.mobile) await assertTouchTargets(page, `${profile.name}:stress`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-briefing-stress.png`), fullPage: true });

  await page.getByRole('button', { name: 'العودة للرئيسية', exact: true }).click();
  await page.locator('[data-core-screen="home"]').waitFor();
  assert(await app.getAttribute('data-executive-briefing') === 'closed', `${profile.name}: briefing state did not close`);

  await openBriefing(page);
  await page.getByRole('button', { name: 'فتح صندوق العمل', exact: true }).click();
  await page.locator('[data-core-screen="today"][data-daily-work-status="ready"]').waitFor();
  assert(await page.locator('[data-daily-work-list="true"]').isVisible(), `${profile.name}: Executive -> Daily Work navigation failed`);

  const dock = page.locator('[data-shell-part="bottom-dock"]');
  await dock.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await openBriefing(page);
  await page.getByRole('button', { name: 'فتح المالية', exact: true }).click();
  await page.locator('[data-core-screen="finance"]').waitFor();
  assert(await dock.getByRole('button', { name: 'المالية', exact: true }).getAttribute('aria-current') === 'page', `${profile.name}: Executive -> Finance did not activate finance tab`);

  await dock.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await openBriefing(page);
  await page.locator('[data-executive-decision]').first().click();
  await page.locator('[data-domain-runtime="transactions"]').waitFor();
  assert(await page.locator('[data-domain-rail="true"]').isVisible(), `${profile.name}: Executive -> Transactions context failed`);
  await page.getByRole('button', { name: 'العودة للأساسية', exact: true }).click();
  await page.locator('[data-core-screen="home"]').waitFor();

  if (profile.mobile) await assertTouchTargets(page, `${profile.name}:final`);
  await noHorizontalOverflow(page, `${profile.name}:final`);
  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);

  const result = {
    profile: profile.name,
    productPhase,
    executiveBriefing: true,
    panels: true,
    stress: true,
    dailyNavigation: true,
    financeNavigation: true,
    transactionNavigation: true,
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
  console.log(`Phase 4.3 Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
