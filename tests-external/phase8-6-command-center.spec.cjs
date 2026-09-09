const { test, expect } = require('@playwright/test');

const BASE = process.env.PHASE86_BASE_URL || 'http://127.0.0.1:4186/';
const URL = `${BASE}phase8-6-preview.html`;

async function open(page, width = 1280) {
  await page.setViewportSize({ width, height: width <= 430 ? 900 : 820 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-command-stage="8.6"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'مركز القيادة', exact: true })).toBeVisible();
  await expect(page.locator('[data-command-authority="delegated_existing_domain_gateways_only"]')).toHaveAttribute('data-command-write-authority', 'none');
  await expect(page.locator('[data-command-stage="8.6"]')).toHaveAttribute('data-finance-write-authority', 'none');
}

test('Global Command Center presents a complete delegated-authority executive snapshot', async ({ page }) => {
  await open(page);
  await expect(page.getByText('إشارات قرار')).toBeVisible();
  await expect(page.getByText('نزاهة المالية')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'قرارات العمل ذات الأولوية' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'موافقات الأتمتة' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'إعادة إسناد العمل الميداني' })).toBeVisible();
  await expect(page.getByText('Command write authority')).toBeVisible();
});

test('automation human approval is executed and then removed after authoritative reload', async ({ page }) => {
  await open(page);
  await expect(page.getByText('انتقال سير عمل حساس')).toBeVisible();
  await page.getByRole('button', { name: 'موافقة', exact: true }).click();
  await expect(page.getByText('لا توجد موافقات أتمتة معلقة.')).toBeVisible();
  await expect(page.getByText('تم تأكيد القرار من السلطة المالكة وإعادة مزامنة مركز القيادة.')).toBeVisible();
});

test('workflow action preserves required reason and reloads the allowed-transition state', async ({ page }) => {
  await open(page);
  await page.getByLabel('سبب اعتماد الانتقال — توقف يتطلب قرار الإدارة').fill('اعتماد إداري بعد مراجعة المستندات');
  await page.getByRole('button', { name: 'اعتماد الانتقال', exact: true }).click();
  await expect(page.getByText('لا يوجد انتقال مسموح به من الحالة الحالية.')).toBeVisible();
});

test('field reassignment uses the authoritative member list and versioned field gateway', async ({ page }) => {
  await open(page);
  const fieldSection = page.getByRole('heading', { name: 'إعادة إسناد العمل الميداني' }).locator('..').locator('..');
  await fieldSection.getByLabel('المالك الجديد').selectOption({ label: 'أحمد كريم' });
  await fieldSection.getByLabel('سبب إعادة الإسناد').fill('توازن عبء العمل');
  await fieldSection.getByRole('button', { name: 'إعادة الإسناد', exact: true }).click();
  await expect(page.getByText('المالك الحالي أحمد كريم')).toBeVisible();
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Global Command Center remains usable without horizontal clipping at ${width}px`, async ({ page }) => {
    await open(page, width);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const box = await page.locator('[data-command-stage="8.6"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(width + 1);
    await expect(page.getByRole('button', { name: 'اعتماد الانتقال', exact: true })).toBeVisible();
  });
}
