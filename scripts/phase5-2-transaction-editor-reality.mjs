import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHASE52_BASE_URL || 'http://127.0.0.1:4196';
const outDir = process.env.PHASE52_ARTIFACT_DIR || 'artifacts/phase5-2-transaction-editor';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(`Phase 5.2 Reality FAIL: ${message}`);
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
  assert(Number.isFinite(productPhase) && productPhase >= 5.2, `${label}: product phase is below 5.2`);
  assert(await app.getAttribute('data-daily-work-mode') === 'preview', `${label}: CI runtime escaped preview isolation`);
}

async function openTransactions(page, label) {
  await boot(page, label);
  await page.getByRole('button', { name: 'مجالات إنجاز', exact: true }).click();
  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await page.locator('[data-domain-screen="transactions"][data-transaction-status="ready"]').waitFor();
}

async function fillValidCreate(page) {
  const editor = page.locator('[data-transaction-editor="create"]');
  await editor.waitFor();
  await editor.getByLabel('الشركة').selectOption({ index: 1 });
  await editor.getByLabel('جهة الاتصال الأساسية').selectOption({ index: 1 });
  await editor.getByLabel('نوع المعاملة').fill('تعديل عقد تأسيس جديد');
  await editor.getByLabel('الجهة / الدائرة').fill('دائرة تسجيل الشركات');
  await editor.getByLabel('الأتعاب الحالية').fill('٤٥٠٬٠٠٠٫٥٠');
  await editor.getByLabel('المحطة الحالية').fill('التدقيق القانوني');
  await editor.getByLabel('المسؤول / المكلف').fill('أحمد هادي');
  await editor.getByLabel('الملاحظات').fill('ملاحظة أولية لاختبار مسار الإنشاء الحقيقي دون أي كتابة إنتاجية.');
}

async function verifyCreateAndEdit(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'create-edit');

  await page.locator('[data-transaction-create="true"]').click();
  const createEditor = page.locator('[data-transaction-editor="create"]');
  await createEditor.waitFor();
  await createEditor.getByRole('button', { name: 'حفظ المعاملة', exact: true }).click();
  assert(await createEditor.getByText('راجع الحقول المعلّمة', { exact: true }).isVisible(), 'empty create did not fail validation');
  assert(await createEditor.getByLabel('الشركة').getAttribute('aria-invalid') === 'true', 'company validation is not accessible');
  assert(await createEditor.getByLabel('نوع المعاملة').getAttribute('aria-invalid') === 'true', 'type validation is not accessible');

  await fillValidCreate(page);
  await createEditor.getByRole('button', { name: 'حفظ المعاملة', exact: true }).click();
  await page.locator('[data-transaction-editor-saved="true"]').waitFor();
  await page.getByRole('button', { name: 'العودة إلى المعاملات', exact: true }).click();
  await page.locator('[data-domain-screen="transactions"]').waitFor();

  const editButton = page.locator('[data-transaction-edit]').first();
  await editButton.click();
  const editEditor = page.locator('[data-transaction-editor="edit"]');
  await editEditor.waitFor();
  assert((await editEditor.getByLabel('نوع المعاملة').inputValue()).trim().length > 0, 'edit source did not prefill transaction type');
  assert((await editEditor.getByLabel('الأتعاب الحالية').inputValue()).trim().length > 0, 'edit source did not prefill fee');
  await editEditor.getByLabel('الأتعاب الحالية').fill('475000');
  await editEditor.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
  assert(await editEditor.getByLabel('سبب تغيير الأتعاب').getAttribute('aria-invalid') === 'true', 'fee change did not require reason');
  await editEditor.getByLabel('سبب تغيير الأتعاب').fill('تحديث الأتعاب حسب اتفاق جديد');
  await editEditor.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
  await page.locator('[data-transaction-editor-saved="true"]').waitFor();

  await noHorizontalOverflow(page, 'create-edit');
  await assertTouchTargets(page, 'create-edit');
  await page.screenshot({ path: path.join(outDir, 'transaction-edit-390.png'), fullPage: true });
  assert(errors.console.length === 0, `create-edit: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `create-edit: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { createValidation: true, editPrefill: true, feeReason: true };
}

async function verifyGlobalCreate(browser) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await boot(page, 'global-create');
  await page.getByRole('button', { name: 'إجراء جديد', exact: true }).click();
  await page.locator('[data-core-overlay="create"]').waitFor();
  assert(await page.locator('[data-create-type="transaction"]').getAttribute('class') === 'is-selected', 'transaction is not the default global create type');
  await page.locator('[data-transaction-editor="create"]').waitFor();
  await noHorizontalOverflow(page, 'global-create');
  await assertTouchTargets(page, 'global-create');
  await page.getByLabel('نوع المعاملة').focus();
  assert(await page.getByLabel('نوع المعاملة').evaluate((node) => node === document.activeElement), 'keyboard focus cannot enter the authoritative editor');
  assert(errors.console.length === 0, `global-create: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `global-create: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { globalCreate: true, focus: true };
}

async function verifyNarrow(browser) {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await openTransactions(page, 'phone-320');
  await page.locator('[data-transaction-create="true"]').click();
  await page.locator('[data-transaction-editor="create"]').waitFor();
  await noHorizontalOverflow(page, 'phone-320');
  await assertTouchTargets(page, 'phone-320');
  await page.screenshot({ path: path.join(outDir, 'transaction-create-320.png'), fullPage: true });
  assert(errors.console.length === 0, `phone-320: console errors ${errors.console.join(' | ')}`);
  assert(errors.page.length === 0, `phone-320: page errors ${errors.page.join(' | ')}`);
  await context.close();
  return { width: 320, passed: true };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [await verifyCreateAndEdit(browser), await verifyGlobalCreate(browser), await verifyNarrow(browser)];
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`Phase 5.2 Transaction Editor Reality PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
