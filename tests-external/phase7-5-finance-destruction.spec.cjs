const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE75_BASE_URL || 'http://127.0.0.1:4185/';
const previewUrl = new URL('phase7-2-preview.html', baseUrl).toString();

async function openFinance(page, width = 430, height = 920) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-finance-stage="7.2"][data-finance-mode="preview"][data-m16-finance="true"]');
  await expect(root).toBeVisible();
  return { root, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.client + 1);
}

async function openPaymentDialog(root, page) {
  await root.getByRole('button', { name: /دفعة جديدة/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'تسجيل دفعة جديدة' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/الخزنة/).selectOption('66666666-6666-4666-8666-666666666661');
  return dialog;
}

test('sub-cent input fails closed and creates no receipt', async ({ page }) => {
  const { root, errors } = await openFinance(page);
  const before = await root.locator('[data-receipt-ref]').count();
  const dialog = await openPaymentDialog(root, page);
  await dialog.getByLabel('المبلغ').fill('1.001');
  await dialog.getByRole('button', { name: 'ترحيل الدفعة وإصدار الإيصال' }).click();
  await expect(root.getByRole('alert')).toContainText('بعض البيانات غير صالحة');
  await expect(dialog).toBeVisible();
  expect(await root.locator('[data-receipt-ref]').count()).toBe(before);
  expect(errors).toEqual([]);
});

test('numeric(18,2) overflow fails closed before finance mutation', async ({ page }) => {
  const { root, errors } = await openFinance(page);
  const before = await root.locator('[data-receipt-ref]').count();
  const dialog = await openPaymentDialog(root, page);
  await dialog.getByLabel('المبلغ').fill('10000000000000000.00');
  await dialog.getByRole('button', { name: 'ترحيل الدفعة وإصدار الإيصال' }).click();
  await expect(root.getByRole('alert')).toBeVisible();
  expect(await root.locator('[data-receipt-ref]').count()).toBe(before);
  expect(errors).toEqual([]);
});

test('reversal is single compensating evidence and cannot be repeated from stale UI state', async ({ page }) => {
  const { root, errors } = await openFinance(page);
  const card = root.locator('[data-receipt-ref="ENJ-R-2026-00000001"]');
  await card.getByRole('button', { name: 'عكس' }).click();
  const dialog = page.getByRole('dialog', { name: /عكس ENJ-R-2026-00000001/ });
  const submit = dialog.getByRole('button', { name: 'تأكيد عكس الدفعة' });
  await dialog.getByLabel('سبب العكس').fill('لا');
  await expect(submit).toBeDisabled();
  await dialog.getByLabel('سبب العكس').fill('عكس تدميري مضبوط ضمن Phase 7.5');
  await submit.click();
  const receipt = page.locator('[data-print-receipt="true"]');
  await expect(receipt.getByText('هذا الإيصال معكوس', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إغلاق الإيصال' }).click();
  await expect(card.getByRole('button', { name: 'عكس' })).toHaveCount(0);
  await expect(card).toHaveClass(/is-reversed/);
  expect(errors).toEqual([]);
});

test('finance surface explicitly preserves idempotency recovery guidance', async ({ page }) => {
  const { root, errors } = await openFinance(page);
  const dialog = await openPaymentDialog(root, page);
  await expect(dialog.getByText('حماية التكرار فعالة', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/نفس المحاولة تستخدم نفس المفتاح/)).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 7.5 finance destruction remains contained at ${width}px`, async ({ page }) => {
    const { root, errors } = await openFinance(page, width, width === 1280 ? 900 : 760);
    const dialog = await openPaymentDialog(root, page);
    await dialog.getByLabel('المبلغ').fill('10000000000000000.00');
    await dialog.getByRole('button', { name: 'ترحيل الدفعة وإصدار الإيصال' }).click();
    await expect(root.getByRole('alert')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });
}
