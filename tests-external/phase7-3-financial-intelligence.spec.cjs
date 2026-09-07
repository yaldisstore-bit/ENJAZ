const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE73_BASE_URL || 'http://127.0.0.1:4183/';
const previewUrl = new URL('phase7-3-preview.html', baseUrl).toString();

async function openPreview(page, width = 430, height = 920) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-finance-stage="7.3"][data-finance-mode="preview"][data-m13-finance-anchor="true"]');
  await expect(root).toBeVisible();
  return { root, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test('Phase 7.3 exposes explainable financial intelligence without pretending due dates exist', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.getByRole('heading', { name: 'الرؤية المالية' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'عمر الأرصدة المفتوحة' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'اتجاه التحصيل' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'أولوية التحصيل' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الصحة المالية للشركات' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الإشارات والتفسير' })).toBeVisible();
  await expect(root.getByText(/لا يحتوي نموذج المعاملة الحالي على تاريخ استحقاق مالي مستقل/)).toBeVisible();
  await expect(root.getByText(/ليس توقعاً مضموناً/)).toBeVisible();
  expect(await root.innerText()).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 7.3 survives ${width}px without horizontal escape`, async ({ page }) => {
    const { root, errors } = await openPreview(page, width, width === 1280 ? 900 : 844);
    await expect(root.locator('.r2-f73-kpis')).toBeVisible();
    await expect(root.locator('.r2-f73-card--aging')).toBeVisible();
    await expect(root.locator('.r2-f73-card--trend')).toBeVisible();
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
  });
}

test('aging buckets and collection attention are populated from deterministic sample data', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.locator('[data-aging-bucket="0_30"]')).toBeVisible();
  await expect(root.locator('[data-aging-bucket="31_60"]')).toBeVisible();
  await expect(root.locator('[data-aging-bucket="61_90"]')).toBeVisible();
  await expect(root.locator('[data-aging-bucket="91_plus"]')).toBeVisible();
  await expect(root.locator('.r2-f73-attention').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('company health and signals remain explainable and visible on compact mobile', async ({ page }) => {
  const { root, errors } = await openPreview(page, 320, 780);
  await expect(root.locator('.r2-f73-health').first()).toBeVisible();
  await expect(root.locator('.r2-f73-signals article').first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
