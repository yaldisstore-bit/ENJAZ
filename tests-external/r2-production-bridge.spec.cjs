const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_PRODUCTION_BASE_URL || 'http://127.0.0.1:4176/';
const pageUrl = (query = '') => new URL(`r2-production-test.html${query}`, baseUrl).toString();

async function noHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test('R2.0-10 auth covers sign-in, sign-up and recovery through the authoritative AuthService', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('?test=anonymous'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'نوع الدخول' }).getByRole('button')).toHaveCount(3);

  await page.getByRole('button', { name: 'حساب جديد' }).click();
  await page.getByLabel('الاسم').fill('مختبر إنجاز');
  await page.getByLabel('البريد الإلكتروني').fill('tester@example.com');
  await page.getByLabel('كلمة المرور').fill('short');
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
  await expect(page.getByRole('alert')).toContainText('10 أحرف');

  await page.getByRole('button', { name: 'استعادة الحساب' }).click();
  await page.getByLabel('البريد الإلكتروني').fill('TESTER@EXAMPLE.COM');
  await page.getByRole('button', { name: 'إرسال رابط الاستعادة' }).click();
  await expect(page.getByRole('status')).toContainText('أرسلنا رابط استعادة الحساب');
  const recovery = await page.evaluate(() => window.__ENJAZ_R2_PRODUCTION_TEST__);
  expect(recovery.passwordResetRequests).toBe(1);
  expect(recovery.lastResetEmail).toBe('tester@example.com');
  expect(recovery.lastResetRedirect).toContain('auth=update-password');
  await noHorizontalOverflow(page);
});

test('R2.0-10 protected workspace reaches connected Home and Executive Briefing without fabricated data', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('?test=authenticated'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible();
  await expect(page.locator('[data-r2-live="home"]')).toBeVisible();
  await expect(page.locator('[data-r2-live="home"]')).toContainText('0 معاملة نشطة');
  await expect(page.locator('[data-r2-live="home"]')).toContainText('لا توجد أولوية');

  await page.getByRole('button', { name: 'الملخص التنفيذي' }).click();
  await expect(page.locator('[data-r2-live="executive-briefing"]')).toBeVisible();
  await expect(page.locator('[data-r2-live="executive-briefing"]')).toContainText('مستقرة');
  await expect(page.locator('[data-r2-live="executive-briefing"]')).toContainText('لا توجد قرارات استثنائية');
  await noHorizontalOverflow(page);
});

test('R2.0-10 account surface exposes the real session identity and authoritative logout only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('?test=authenticated'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-live="home"]')).toBeVisible();
  await page.getByRole('button', { name: 'الحساب ومساحة العمل' }).click();
  await expect(page.locator('[data-overlay="account"]')).toContainText('tester@enjaz.local');
  await expect(page.locator('[data-account-session="protected"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible();
  await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
  const state = await page.evaluate(() => window.__ENJAZ_R2_PRODUCTION_TEST__);
  expect(state.signOuts).toBe(1);
});

test('R2.0-10 recovery session updates password through AuthService and returns to the protected workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('?test=authenticated&auth=update-password'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-password-update="true"]')).toBeVisible();
  await page.getByLabel('كلمة المرور الجديدة').fill('abcdefghij');
  await page.getByLabel('تأكيد كلمة المرور').fill('abcdefghijk');
  await page.getByRole('button', { name: 'تحديث كلمة المرور' }).click();
  await expect(page.getByRole('alert')).toContainText('غير متطابقتين');
  await page.getByLabel('تأكيد كلمة المرور').fill('abcdefghij');
  await page.getByRole('button', { name: 'تحديث كلمة المرور' }).click();
  await expect(page.getByRole('status')).toContainText('تم تحديث كلمة المرور');
  const state = await page.evaluate(() => window.__ENJAZ_R2_PRODUCTION_TEST__);
  expect(state.passwordUpdates).toBe(1);
  await page.getByRole('button', { name: 'العودة إلى إنجاز' }).click();
  await expect(page).not.toHaveURL(/auth=update-password/);
  await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible();
});

test('R2.0-10 intentional restructuring preserves review-only create truthfulness and notification availability truthfulness', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl('?test=authenticated&dest=create'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-connected="create"]')).toBeVisible();
  await expect(page.locator('[data-core-connected="create"]')).toContainText('بقية الإنشاءات تبقى مؤجلة');
  await expect(page.locator('[data-core-connected="create"]')).toContainText('بدل حفظ وهمي');

  await page.goto(pageUrl('?test=authenticated&dest=today.notifications'), { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-connected="today"]')).toBeVisible();
  await expect(page.locator('[data-core-connected="today"]')).toContainText('العوائق أولًا');
  await expect(page.locator('[data-core-connected="today"]')).not.toContainText(/غير مقروء|unread|تم إرسال الإشعار/);
  await noHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-10 auth and protected shell stay overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.goto(pageUrl('?test=anonymous'), { waitUntil: 'networkidle' });
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
    await noHorizontalOverflow(page);

    await page.goto(pageUrl('?test=authenticated'), { waitUntil: 'networkidle' });
    await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible();
    await noHorizontalOverflow(page);
  });
}
