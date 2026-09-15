const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.PHASE113_PORTAL_BASE_URL || 'http://127.0.0.1:4193/portal';
const artifactDir = process.env.PHASE113_PORTAL_ARTIFACT_DIR || 'artifacts/phase11-3-client-portal';
fs.mkdirSync(artifactDir, { recursive: true });

const profiles = [
  ['desktop-1280', 1280, 900],
  ['phone-430', 430, 932],
  ['phone-390', 390, 844],
  ['phone-360', 360, 740],
  ['phone-320', 320, 700],
];

async function horizontalOverflow(page) {
  return page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
}

for (const [name, width, height] of profiles) {
  test(`${name}: isolated RTL portal auth shell fits the viewport`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const portal = page.locator('[data-client-portal-auth="true"]');
    await expect(portal).toBeVisible({ timeout: 15_000 });
    await expect(portal).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('دخول العملاء', { exact: true })).toBeVisible();
    await expect(page.getByText('بوابة إنجاز', { exact: true }).first()).toBeVisible();

    // External client entry must not accidentally mount the staff application shell.
    await expect(page.locator('[data-r2-runtime-mode]')).toHaveCount(0);
    await expect(page.locator('[data-shell-part="bottom-dock"]')).toHaveCount(0);
    await expect(page.locator('[data-client-portal-shell="isolated"]')).toHaveCount(0);

    // Portal styling stays inside the lazy client chunk and retains mobile contracts.
    const style = page.locator('style[data-client-portal-styles="lazy"]');
    await expect(style).toHaveCount(1);
    const css = await style.textContent();
    expect(css).toContain('@media(max-width:680px)');
    expect(css).toContain('@media(max-width:360px)');
    expect(css).toContain('min-height:100dvh');

    const email = page.getByLabel('البريد الإلكتروني');
    const password = page.getByLabel('كلمة المرور');
    const submit = page.getByRole('button', { name: 'دخول آمن', exact: true });
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();
    const submitBox = await submit.boundingBox();
    expect(submitBox).not.toBeNull();
    expect(submitBox.height).toBeGreaterThanOrEqual(44);

    const overflow = await horizontalOverflow(page);
    expect(overflow.html).toBeLessThanOrEqual(1);
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(pageErrors).toEqual([]);

    await page.screenshot({ path: path.join(artifactDir, `${name}-portal-auth.png`), fullPage: true });
    await context.close();
  });
}
