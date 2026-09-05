const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_CORE_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_CORE_ARTIFACT_DIR || 'artifacts/r2-core-work');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page, selector) {
  const sizes = await page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }).map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const size of sizes) {
    expect(size.height).toBeGreaterThanOrEqual(43.5);
    expect(size.width).toBeGreaterThanOrEqual(43.5);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

test('R2.0-5 transactions uses Phase 5.1 search, views, sorting, pagination and entity identity', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work-stage="R2.0-5"]')).toBeVisible();
  await expect(page.locator('[data-core-work="transactions"]')).toBeVisible();

  const search = page.getByRole('textbox', { name: 'بحث المعاملات' });
  await search.fill('1042');
  const row1042 = page.getByRole('button', { name: /فتح المعاملة 1042 تعديل عقد تأسيس/ });
  await expect(row1042).toBeVisible();
  await search.fill('');

  await page.getByRole('button', { name: /متلكئة/ }).click();
  await expect(page.getByRole('button', { name: /فتح المعاملة 1038 قرار تأسيس/ })).toBeVisible();
  await page.getByRole('button', { name: /جارية/ }).click();

  await page.getByLabel('ترتيب المعاملات').selectOption('fee-desc');
  await expect(page.locator('.r2-core-pagination')).toContainText('صفحة 1');
  await expect(page.getByRole('button', { name: 'التالي' })).toBeEnabled();
  await page.getByRole('button', { name: 'التالي' }).click();
  await expect(page.locator('.r2-core-pagination')).toContainText('صفحة 2');
  await page.getByRole('button', { name: 'السابق' }).click();

  await search.fill('1042');
  await row1042.click();
  await expect(page).toHaveURL(/dest=transactions\.detail/);
  await expect(page).toHaveURL(/tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/);
  await expect(page.locator('[data-core-work="transaction-360"]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await shot(page, 'transaction-360-390');
});

test('R2.0-5 360 exposes authoritative contextual sections without fake cross-domain cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions.detail&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
  await expect(page.locator('.r2-golden-context-tabs button')).toHaveCount(5);

  await page.getByRole('button', { name: 'الوثائق' }).click();
  await expect(page.locator('[data-golden-panel="documents"]')).toContainText('عقد التأسيس');
  await page.getByRole('button', { name: 'المالية' }).click();
  await expect(page.locator('[data-golden-panel="finance"]')).toContainText('الأتعاب الحالية');
  await expect(page.locator('[data-golden-panel="finance"]')).toContainText('الدفعات المثبتة');
  await expect(page.locator('[data-golden-panel="finance"]')).toContainText('المتبقي');
  await page.getByRole('button', { name: 'النشاط' }).click();
  await expect(page.locator('[data-golden-panel="activity"]')).toContainText('تحديث الحالة');
  await assertNoHorizontalOverflow(page);
});

test('R2.0-5 edit validates fee-history reason and never claims production persistence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions.editor&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work="transaction-editor"]')).toBeVisible();

  const fee = page.getByLabel('أتعاب المعاملة');
  await fee.fill('500000');
  await page.getByRole('button', { name: 'حفظ المعاينة' }).click();
  await expect(page.getByRole('alert')).toContainText('سببًا واضحًا');
  await page.getByLabel('سبب تغيير الأتعاب').fill('تعديل الأتعاب بعد مراجعة الاتفاق');
  await page.getByRole('button', { name: 'حفظ المعاينة' }).click();
  await expect(page.getByRole('status')).toContainText('لم تتغير أي بيانات إنتاجية');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'transaction-editor-390');
});

test('R2.0-5 create fails closed on required Phase 5.2 fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=create`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /معاملة جديدة/ }).click();
  await expect(page.locator('[data-core-work="transaction-editor"]')).toBeVisible();
  await expect(page).not.toHaveURL(/tx=/);
  await page.getByRole('button', { name: 'حفظ المعاينة' }).click();
  const alerts = page.getByRole('alert');
  await expect(alerts).toContainText(['اختر الشركة المرتبطة بالمعاملة.', 'أدخل نوع المعاملة.', 'أدخل أتعابًا موجبة']);
});

test('R2.0-5 lifecycle keeps archive, restore and reactivation distinct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions.lifecycle&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'محاكاة الأرشفة' })).toBeVisible();
  await page.getByRole('button', { name: 'محاكاة الأرشفة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('مؤرشفة · معاينة فقط');
  await expect(page.getByRole('button', { name: 'استعادة المعاينة' })).toBeVisible();
  await page.getByRole('button', { name: 'استعادة المعاينة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('نشطة · قيد المتابعة');

  await page.goto(`${previewUrl}?dest=transactions.lifecycle&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5`, { waitUntil: 'networkidle' });
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('مكتملة · معاينة فقط');
  await expect(page.getByRole('button', { name: 'محاكاة إعادة التنشيط' })).toBeVisible();
  await page.getByRole('button', { name: 'محاكاة إعادة التنشيط' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('نشطة · قيد المتابعة');
});

test('R2.0-5 Today and Followups preserve source semantics and local-only actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=today`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work="today"]')).toBeVisible();
  await expect(page.locator('.r2-core-focus')).toContainText('مستند تأسيس ناقص يوقف الإكمال');
  await page.getByRole('button', { name: 'متأخرة' }).click();
  await expect(page.locator('[data-work-source="followup"]')).toContainText('اتصال متابعة مع المحامي');
  await page.getByRole('button', { name: 'إكمال' }).click();
  await expect(page.locator('[data-work-source="followup"]')).toContainText('مكتملة في المعاينة');

  await page.goto(`${previewUrl}?dest=followups`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen="core-followups"]')).toBeVisible();
  await expect(page.locator('[data-work-source="followup"]')).toHaveCount(2);
  await expect(page.locator('.r2-core-scope-note')).toContainText('الإشعارات العامة');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'today-followups-390');
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-5 core work stays overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    for (const destination of ['transactions', 'today', 'followups']) {
      await page.goto(`${previewUrl}?dest=${destination}`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-core-work-stage="R2.0-5"]')).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
    if (width <= 430) await assertTouchTargets(page, '.r2-shell__mobile-nav button');
    await shot(page, `core-${width}`);
  });
}
