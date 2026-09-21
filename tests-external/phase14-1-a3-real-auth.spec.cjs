const { test, expect } = require('@playwright/test');

const baseUrl = process.env.ENJAZ_A3_BASE_URL || 'http://127.0.0.1:4193/';
const ownerEmail = process.env.ENJAZ_A3_OWNER_EMAIL;
const ownerPassword = process.env.ENJAZ_A3_OWNER_PASSWORD;
const clientEmail = process.env.ENJAZ_A3_CLIENT_EMAIL;
const clientPassword = process.env.ENJAZ_A3_CLIENT_PASSWORD;

if (!ownerEmail || !ownerPassword || !clientEmail || !clientPassword) {
  throw new Error('A3_REAL_AUTH_CREDENTIALS_MISSING');
}

async function noHorizontalOverflow(page) {
  const g = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(g.doc).toBeLessThanOrEqual(g.client + 1);
  expect(g.body).toBeLessThanOrEqual(g.client + 1);
}

async function loginStaff(page) {
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible({ timeout: 20000 });
  await page.getByLabel('البريد الإلكتروني').fill(ownerEmail);
  await page.getByLabel('كلمة المرور').fill(ownerPassword);
  await page.getByRole('button', { name: 'دخول إلى إنجاز' }).click();
  await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible({ timeout: 30000 });
}

async function loginClient(page) {
  await page.goto(new URL('/portal', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-client-portal-auth="true"]')).toBeVisible({ timeout: 20000 });
  await page.getByLabel('البريد الإلكتروني').fill(clientEmail);
  await page.getByLabel('كلمة المرور').fill(clientPassword);
  await page.getByRole('button', { name: 'دخول آمن' }).click();
  await expect(page.locator('[data-client-portal-shell="isolated"]')).toBeVisible({ timeout: 30000 });
}

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 14.1 A3 real staff Auth is RTL/overflow-safe at ${width}px`, async ({ page }) => {
    const fatal = [];
    page.on('pageerror', e => fatal.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fatal.push(m.text()); });
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await loginStaff(page);
    await expect(page.locator('[data-r2-live="home"]')).toBeVisible({ timeout: 20000 });
    await noHorizontalOverflow(page);
    expect(fatal).toEqual([]);
  });

  test(`Phase 14.1 A3 real client Auth is isolated RTL/overflow-safe at ${width}px`, async ({ page }) => {
    const fatal = [];
    page.on('pageerror', e => fatal.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fatal.push(m.text()); });
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await loginClient(page);
    const shell = page.locator('[data-client-portal-shell="isolated"]');
    await expect(shell).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('navigation', { name: 'تنقل بوابة العميل' })).toBeVisible();
    await expect(shell).not.toContainText('storage_path');
    await noHorizontalOverflow(page);
    expect(fatal).toEqual([]);
  });
}

test('Phase 14.1 A3 client portal survives offline refresh and recovers online', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginClient(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'تحديث' }).click();
  await expect(page.locator('.cp-notice--error')).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
  await page.getByRole('button', { name: 'تحديث' }).click();
  await expect(page.locator('[data-client-portal-shell="isolated"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.cp-skeleton')).toHaveCount(0, { timeout: 20000 });
  await noHorizontalOverflow(page);
});
