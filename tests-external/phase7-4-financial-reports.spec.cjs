const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE74_BASE_URL || 'http://127.0.0.1:4184/';
const previewUrl = new URL('phase7-4-preview.html', baseUrl).toString();

async function openPreview(page, width = 430, height = 920) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-finance-stage="7.4"][data-finance-mode="preview"][data-finance-report-authority="canonical"]');
  await expect(root).toBeVisible();
  return { root, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test('Phase 7.4 renders deterministic totals, provenance and export controls', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.getByRole('heading', { name: 'التقارير المالية' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'حركة الفترة' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الأرصدة الحالية' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'المصدر والتدقيق' })).toBeVisible();
  await expect(root.getByRole('button', { name: 'طباعة / PDF' })).toBeVisible();
  await expect(root.getByRole('button', { name: 'CSV' })).toBeVisible();
  await expect(root.getByRole('button', { name: 'JSON' })).toBeVisible();
  await expect(root.getByText(/ENJAZ-FR-[0-9a-f]{16}/).first()).toBeVisible();
  expect(await root.innerText()).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 7.4 survives ${width}px without horizontal escape`, async ({ page }) => {
    const { root, errors } = await openPreview(page, width, width === 1280 ? 900 : 844);
    await expect(root.locator('.r2-f74-kpis')).toBeVisible();
    await expect(root.locator('.r2-f74-card').first()).toBeVisible();
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
  });
}

test('company and transaction report filters preserve scoped provenance', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  const kind = root.getByLabel('نوع التقرير');
  await kind.selectOption('company');
  await expect(root.getByLabel('الشركة')).toBeVisible();
  await expect(root.getByRole('heading', { name: /تقرير مالي —/ })).toBeVisible();
  await kind.selectOption('transaction');
  await expect(root.getByLabel('المعاملة')).toBeVisible();
  await expect(root.getByText(/payments:/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('cashbox report exposes schema limitation instead of fabricating movement', async ({ page }) => {
  const { root, errors } = await openPreview(page, 360, 844);
  await root.getByLabel('نوع التقرير').selectOption('cashbox');
  await expect(root.getByLabel('الصندوق')).toBeVisible();
  await expect(root.getByText(/لا يربط الدفعات أو القيود المالية بصندوق محدد/)).toBeVisible();
  await expect(root.getByText('لا توجد حركة مثبتة ضمن هذا النطاق.')).toBeVisible();
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});
