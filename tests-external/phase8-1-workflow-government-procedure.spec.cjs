const { test, expect } = require('@playwright/test');

const baseURL = process.env.PHASE81_BASE_URL || 'http://127.0.0.1:4188/';
const widths = [1280, 430, 390, 360, 320];

async function assertNoHorizontalEscape(page) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(metrics.scroll, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.body, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 1);
}

for (const width of widths) {
  test(`Phase 8.1 workflow surface stays inside ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1000 ? 900 : 900 });
    await page.goto(`${baseURL}phase8-1-preview.html`, { waitUntil: 'networkidle' });
    const root = page.locator('[data-p81-workflow="active"]');
    await expect(root).toBeVisible();
    await expect(root.getByRole('heading', { name: 'الإجراء الحكومي' })).toBeVisible();
    await expect(root.locator('[data-money-authority="reference_fees_only_no_finance_write"]')).toContainText('مرجع إجرائي فقط');
    await expect(root.getByText('تقديم الطلب', { exact: true }).first()).toBeVisible();
    await assertNoHorizontalEscape(page);
  });
}

test('required items block transition until canonical requirement is completed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${baseURL}phase8-1-preview.html`, { waitUntil: 'networkidle' });
  const advance = page.getByRole('button', { name: /إرسال إلى التدقيق/ });
  await expect(advance).toBeDisabled();
  await expect(advance).toContainText('1 متطلب إلزامي معلّق');
  await page.getByRole('button', { name: 'تم الإنجاز' }).click();
  await expect(page.getByText('تم تثبيت إنجاز المتطلب في حالة الـWorkflow الكانونية.')).toBeVisible();
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(page.getByText('التدقيق', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('تم الانتقال إلى المرحلة التالية وتحديث السياق من المصدر الموثوق.')).toBeVisible();
});

test('workflow can advance, complete, and reopen with an audited reason', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 1000 });
  await page.goto(`${baseURL}phase8-1-preview.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'تم الإنجاز' }).click();
  await page.getByRole('button', { name: /إرسال إلى التدقيق/ }).click();
  await page.getByRole('button', { name: /إرسال للمصادقة/ }).click();
  await expect(page.getByText('المصادقة', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /إكمال الإجراء/ }).click();
  await expect(page.locator('[data-p81-workflow="completed"]')).toBeVisible();
  await expect(page.getByText('مكتمل', { exact: true })).toBeVisible();
  const reopen = page.getByRole('button', { name: /إعادة فتح المصادقة/ });
  await expect(reopen).toBeDisabled();
  await page.getByLabel('سبب الانتقال / إعادة الفتح').fill('تصحيح مستند المصادقة');
  await expect(reopen).toBeEnabled();
  await reopen.click();
  await expect(page.locator('[data-p81-workflow="active"]')).toBeVisible();
  await expect(page.getByText('تمت إعادة فتح المرحلة مع حفظ السبب في السجل.')).toBeVisible();
});

test('empty transaction can start the catalog procedure and create one visible workflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${baseURL}phase8-1-preview.html?mode=empty`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-p81-start-surface="true"]')).toBeVisible();
  await expect(page.getByLabel('الإجراء الحكومي')).toHaveValue('cccccccc-cccc-4ccc-8ccc-ccccccccccc1');
  await expect(page.getByLabel('فرع الجهة الحكومية')).toHaveValue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1');
  await page.getByRole('button', { name: 'بدء الإجراء وربط Snapshot' }).click();
  await expect(page.locator('[data-p81-workflow="active"]')).toBeVisible();
  await expect(page.getByText('تم بدء الإجراء الحكومي وتثبيت Snapshot المراحل والمتطلبات.')).toBeVisible();
  await expect(page.locator('[data-p81-start-surface="true"]')).toHaveCount(0);
});