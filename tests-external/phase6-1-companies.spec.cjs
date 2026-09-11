const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE61_BASE_URL || 'http://127.0.0.1:4177/';
const previewUrl = new URL('phase6-1-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE61_ARTIFACT_DIR || 'artifacts/phase6-1-companies');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page) {
  const sizes = await page.locator('button:visible, input:visible, select:visible').evaluateAll((nodes) => nodes.map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, text: node.textContent || node.getAttribute('aria-label') || '' })));
  for (const size of sizes) {
    expect(size.height, size.text).toBeGreaterThanOrEqual(43.5);
    expect(size.width, size.text).toBeGreaterThanOrEqual(43.5);
  }
}

test('Phase 6.1 company directory is connected, searchable and bounded', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const companies = page.locator('[data-phase6-1="companies"][data-company-source="workspace"]');
  const truth = companies.locator(':scope > .r2-records-truth');
  const governance = companies.locator('[data-phase9-3="governance"]');
  await expect(companies).toBeVisible();
  await expect(truth.getByText('مصادر الحقيقة محفوظة', { exact: true })).toBeVisible();
  await expect(truth.getByText(/بيانات الشركة الأساسية تبقى في Companies/)).toBeVisible();
  await expect(governance).toBeVisible();
  await expect(governance.getByText('قراءة فقط', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'بحث الشركات' }).fill('الكرادة');
  await expect(page.getByText('روز بغداد', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'نشطة 1', exact: true }).click();
  await expect(page.getByText('لا توجد شركة مطابقة للبحث والتصفية الحالية.')).toBeVisible();
  await page.getByRole('button', { name: 'الكل 2', exact: true }).click();
  await page.getByRole('textbox', { name: 'بحث الشركات' }).fill('');
  await expect(page.locator('.r2-records-directory-list').getByText('قمر السلطان', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('Phase 6.1 edit persists through the isolated authoritative preview repository', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /قمر السلطان/ }).first().click();
  await expect(page.getByText('تعديل عقد تأسيس')).toBeVisible();
  await page.getByRole('button', { name: 'تعديل البيانات' }).click();
  const address = page.getByLabel('العنوان');
  await address.fill('بغداد - الخضراء - Phase 6.1');
  await page.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(page.getByText('تم حفظ الشركة')).toBeVisible();
  await page.getByRole('button', { name: 'العودة إلى التفاصيل' }).click();
  await expect(page.getByText('بغداد - الخضراء - Phase 6.1')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test('Phase 6.1 create confirms one company and exposes no fake later-phase CRUD', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '＋ شركة جديدة' }).click();
  await expect(page.locator('[data-company-editor="create"]')).toBeVisible();
  await expect(page.locator('.r2-records-directory')).toBeHidden();
  await page.getByLabel('الاسم القانوني *').fill('شركة اختبار Phase 6.1 للتجارة العامة محدودة المسؤولية');
  await page.getByLabel('الاسم المختصر').fill('اختبار 6.1');
  await page.getByLabel('رأس المال').fill('١٠٠٠٠٠٠٠٠');
  await page.getByLabel('العنوان').fill('بغداد - المنصور');
  await page.getByRole('button', { name: 'إنشاء الشركة' }).click();
  await expect(page.getByText('تم حفظ الشركة')).toBeVisible();
  await page.getByRole('button', { name: 'العودة إلى التفاصيل' }).click();
  await expect(page.getByText('اختبار 6.1', { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-phase6-1="companies"] > .r2-records-truth').getByText(/الأشخاص والعلاقات في مسارها القانوني/)).toBeVisible();
  await expect(page.locator('[data-phase9-3="governance"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'تحديث الهيكل' })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 6.1 Companies stays responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-phase6-1="companies"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (width <= 430) await assertTouchTargets(page);
  });
}