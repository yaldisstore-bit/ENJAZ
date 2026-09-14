const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const baseUrl = process.env.R2_PHASE111_BASE_URL || 'http://127.0.0.1:4191/';
const pageUrl = new URL('phase11-1-notifications-browser.html', baseUrl).toString();
const evidenceDir = 'artifacts/phase11-1-notifications';

async function noHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test.beforeAll(() => { fs.mkdirSync(evidenceDir, { recursive: true }); });

test('Phase 11.1 notification center renders authoritative state and governed actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  const center = page.locator('[data-phase11-1-notifications="live"]');
  await expect(center).toBeVisible();
  await expect(center).toContainText('Canonical In-App State');
  await expect(center).toContainText('غير مقروءة');
  await expect(center.locator('[data-notification-id]')).toHaveCount(2);
  await expect(center).not.toContainText(/تم إرسال الإشعار|push ناجح|email ناجح/i);

  const critical = center.locator('[data-notification-id="55555555-5555-4555-8555-555555555555"]');
  await expect(critical).toHaveAttribute('data-notification-read', 'false');
  await critical.getByRole('button', { name: 'تعليم كمقروء' }).click();
  await expect(critical).toHaveAttribute('data-notification-read', 'true');

  const renewal = center.locator('[data-notification-id="66666666-6666-4666-8666-666666666666"]');
  await renewal.getByRole('button', { name: 'تأجيل ساعتين' }).click();
  await expect(renewal).toContainText('مؤجل حتى');
  await expect(renewal.getByRole('button', { name: 'تأجيل ساعتين' })).toHaveCount(0);

  await critical.getByRole('button', { name: 'إلغاء الإشعار' }).click();
  await expect(center.locator('[data-notification-id]')).toHaveCount(1);
  const mutations = await page.evaluate(() => window.__ENJAZ_PHASE111_BROWSER__?.mutations ?? []);
  expect(mutations).toContain('55555555-5555-4555-8555-555555555555:mark_read');
  expect(mutations).toContain('66666666-6666-4666-8666-666666666666:snooze');
  expect(mutations).toContain('55555555-5555-4555-8555-555555555555:cancel');
  await noHorizontalOverflow(page);
  await page.screenshot({ path: `${evidenceDir}/notification-center-390.png`, fullPage: true });
});

test('Phase 11.1 unread filter is truthful and keyboard/touch controls remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  const center = page.locator('[data-phase11-1-notifications="live"]');
  await center.getByRole('button', { name: /غير المقروءة/ }).click();
  await expect(center.locator('[data-notification-id]')).toHaveCount(1);
  await expect(center.locator('[data-notification-id]').first()).toHaveAttribute('data-notification-read', 'false');
  await center.getByRole('button', { name: /الكل/ }).click();
  await expect(center.locator('[data-notification-id]')).toHaveCount(2);
  const buttons = center.locator('button:visible');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(3);
  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox();
    if (!box) continue;
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
  await noHorizontalOverflow(page);
});

for (const width of [390, 360, 320]) {
  test(`Phase 11.1 notification center is RTL and overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    const center = page.locator('[data-phase11-1-notifications="live"]');
    await expect(center).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(center.locator('[data-notification-id]')).toHaveCount(2);
    await noHorizontalOverflow(page);
    if (width === 320) await page.screenshot({ path: `${evidenceDir}/notification-center-320.png`, fullPage: true });
  });
}
