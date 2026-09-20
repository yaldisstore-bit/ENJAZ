const { test, expect } = require('@playwright/test');

// Phase 14.1 A3 preparatory UI smoke only. Staff uses a deterministic isolated
// production-bridge fixture; portal is the public pre-auth shell on an invalid
// Supabase test endpoint. These runs cannot certify a real client JWT, hosted
// RLS, a complete domain journey, Android IME or the published Pages runtime.
const staffBase = process.env.ENJAZ_A3_STAFF_BASE_URL || 'http://127.0.0.1:4176/';
const portalBase = process.env.ENJAZ_A3_PORTAL_BASE_URL || 'http://127.0.0.1:4193/portal';
const widths = [1280, 430, 390, 360, 320];

async function noOverflow(page) {
  const size = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(size.html).toBeLessThanOrEqual(1);
  expect(size.body).toBeLessThanOrEqual(1);
}

for (const width of widths) {
  const height = width === 1280 ? 900 : width === 430 ? 932 : width === 390 ? 844 : width === 360 ? 740 : 700;
  test(`A3 preparatory staff fixture: protected home, account, history-back and executive navigation at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(new URL('r2-production-test.html?test=authenticated', staffBase).toString(), {
        waitUntil: 'networkidle', timeout: 30_000,
      });
      await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible();
      await expect(page.locator('[data-r2-live="home"]')).toBeVisible();
      await noOverflow(page);

      const account = page.getByRole('button', { name: 'الحساب ومساحة العمل' });
      await expect(account).toBeVisible();
      const accountRect = await account.boundingBox();
      expect(accountRect).not.toBeNull();
      await account.click();
      await expect(page.locator('[data-account-session="protected"]')).toBeVisible();
      await noOverflow(page);

      // Browser history is the closest deterministic Chromium boundary to the
      // Android system Back action. The dedicated Android/IME certificate is
      // still a separate A3 requirement.
      await page.goBack();
      await expect(page.locator('[data-overlay="account"]')).toHaveCount(0);
      await expect(page.locator('[data-r2-live="home"]')).toBeVisible();

      const transactions = page.getByRole('button', { name: /فتح المعاملات/ });
      await transactions.click();
      await expect(page.locator('[data-r2-runtime-mode="live"][data-destination="transactions"]')).toBeVisible();
      await page.goBack();
      await expect(page.locator('[data-r2-live="home"]')).toBeVisible();

      const executive = page.getByRole('button', { name: 'الملخص التنفيذي' });
      await expect(executive).toBeVisible();
      await executive.click();
      await expect(page.locator('[data-r2-live="executive-briefing"]')).toBeVisible();
      await noOverflow(page);
      await page.getByRole('button', { name: 'العودة للرئيسية' }).click();
      await expect(page.locator('[data-r2-live="home"]')).toBeVisible();
      await noOverflow(page);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test(`A3 preparatory independent portal: RTL, keyboard-focusable auth and offline shell at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(portalBase, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const portal = page.locator('[data-client-portal-auth="true"]');
      await expect(portal).toBeVisible({ timeout: 15_000 });
      await expect(portal).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('[data-r2-runtime-mode]')).toHaveCount(0);
      const email = page.getByLabel('البريد الإلكتروني');
      const password = page.getByLabel('كلمة المرور');
      const submit = page.getByRole('button', { name: 'دخول آمن', exact: true });
      await email.fill('a3-only@example.invalid');
      await password.fill('NotAServerCredential123!');
      await password.focus();
      await expect(password).toBeFocused();
      await expect(submit).toBeVisible();
      const target = await submit.boundingBox();
      expect(target).not.toBeNull();
      expect(target.height).toBeGreaterThanOrEqual(44);
      await noOverflow(page);

      // Check only the already-loaded pre-auth shell; never send credentials,
      // reset links or test records to a real server.
      await context.setOffline(true);
      await expect(email).toHaveValue('a3-only@example.invalid');
      await expect(password).toHaveValue('NotAServerCredential123!');
      await expect(submit).toBeEnabled();
      await noOverflow(page);
      await context.setOffline(false);
      await expect(portal).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

for (const width of [430, 390, 360, 320]) {
  test(`A3 preparatory touch emulation: staff remains navigable during network loss at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: width === 430 ? 932 : width === 390 ? 844 : width === 360 ? 740 : 700 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(new URL('r2-production-test.html?test=authenticated', staffBase).toString(), {
        waitUntil: 'networkidle', timeout: 30_000,
      });
      await expect(page.locator('[data-r2-live="home"]')).toBeVisible();
      await context.setOffline(true);
      const executive = page.getByRole('button', { name: 'الملخص التنفيذي' });
      await executive.tap();
      await expect(page.locator('[data-r2-live="executive-briefing"]')).toBeVisible();
      await noOverflow(page);
      await context.setOffline(false);
      await page.getByRole('button', { name: 'الحساب ومساحة العمل' }).tap();
      await expect(page.locator('[data-account-session="protected"]')).toBeVisible();
      await noOverflow(page);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
