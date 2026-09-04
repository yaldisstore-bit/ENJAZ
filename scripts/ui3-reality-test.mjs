import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI3_BASE_URL || 'http://127.0.0.1:4173';
const outDir = process.env.UI3_ARTIFACT_DIR || 'artifacts/ui3-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertInsideViewport(page, locator, label) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  assert(box && viewport, `${label}: geometry unavailable`);
  const epsilon = 1;
  assert(box.x >= -epsilon, `${label}: clipped at viewport left (${box.x})`);
  assert(box.y >= -epsilon, `${label}: clipped at viewport top (${box.y})`);
  assert(box.x + box.width <= viewport.width + epsilon, `${label}: clipped at viewport right (${box.x + box.width} > ${viewport.width})`);
  assert(box.y + box.height <= viewport.height + epsilon, `${label}: clipped at viewport bottom (${box.y + box.height} > ${viewport.height})`);
}

async function verifyViewport(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByRole('heading', { name: /مكوّنات تتحمل العمل الحقيقي/ }).waitFor();
  await page.waitForTimeout(200);

  assert(await page.locator('.vite-error-overlay').count() === 0, `${profile.name}: Vite error overlay is visible`);
  assert(await page.locator('main[data-stage="ui-3"]').count() === 1, `${profile.name}: UI-3 root is missing`);

  const initialOverflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(initialOverflow.html <= 1 && initialOverflow.body <= 1, `${profile.name}: horizontal overflow detected ${JSON.stringify(initialOverflow)}`);

  await page.screenshot({ path: path.join(outDir, `${profile.name}-full.png`), fullPage: true });

  await page.getByRole('button', { name: 'الأسبوع' }).click();
  assert(await page.getByRole('button', { name: 'الأسبوع' }).getAttribute('aria-pressed') === 'true', `${profile.name}: segmented control did not change`);

  await page.getByRole('button', { name: 'المزيد' }).click();
  const menu = page.getByRole('menu', { name: 'قائمة الإجراءات' });
  await menu.waitFor();
  await page.waitForTimeout(300);
  await assertInsideViewport(page, menu, `${profile.name} menu`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-menu.png`) });
  await page.getByRole('menuitem', { name: /تثبيت العرض/ }).click();
  await page.getByText(/تم اختيار: pin/).waitFor();

  const search = page.getByLabel('ابحث داخل إنجاز');
  await search.fill('شركة الرافدين للتجارة العامة — معاملة ١٠٤٢ ABC-2026');
  assert((await search.inputValue()).includes('ABC-2026'), `${profile.name}: field input failed`);

  await page.getByRole('button', { name: 'افتح Sheet' }).click();
  const sheet = page.getByRole('dialog', { name: 'إجراء سريع' });
  await sheet.waitFor();
  await page.waitForTimeout(450);
  await assertInsideViewport(page, sheet, `${profile.name} sheet`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-sheet.png`) });
  await page.getByLabel('العنوان').fill('متابعة اختبار حقيقية طويلة للتأكد من مرونة الحقل على الهاتف');
  await page.getByRole('button', { name: 'إنشاء المتابعة' }).click();
  await page.getByText(/تم اختبار إجراء الـSheet بنجاح/).waitFor();

  await page.getByRole('button', { name: 'افتح Dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'تأكيد إغلاق المعاملة؟' });
  await dialog.waitFor();
  await page.waitForTimeout(450);
  await assertInsideViewport(page, dialog, `${profile.name} dialog`);
  await page.screenshot({ path: path.join(outDir, `${profile.name}-dialog.png`) });
  await page.getByRole('button', { name: 'تأكيد الإغلاق' }).click();
  await page.getByText(/تم اختبار Dialog وإجراء التأكيد بنجاح/).waitFor();

  const finalOverflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(finalOverflow.html <= 1 && finalOverflow.body <= 1, `${profile.name}: overflow appeared after interaction ${JSON.stringify(finalOverflow)}`);

  const touchTargets = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const rect = button.getBoundingClientRect();
    return { label: button.getAttribute('aria-label') || button.textContent?.trim() || 'button', width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 };
  }).filter((item) => item.visible));

  const minTarget = profile.mobile ? 44 : 36;
  const undersized = touchTargets.filter((target) => target.height < minTarget || target.width < 30);
  assert(undersized.length === 0, `${profile.name}: undersized interactive targets ${JSON.stringify(undersized)}`);

  assert(consoleErrors.length === 0, `${profile.name}: console errors: ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors: ${pageErrors.join(' | ')}`);

  await context.close();
  return { profile: profile.name, touchTargets: touchTargets.length, overflow: finalOverflow };
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: 'desktop-1280', viewport: { width: 1280, height: 900 }, mobile: false },
    { name: 'phone-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'phone-360', viewport: { width: 360, height: 740 }, mobile: true },
  ];
  const results = [];
  for (const profile of profiles) results.push(await verifyViewport(browser, profile));
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`UI-3 Reality Gate PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
