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

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 9.1 live Smart Risk is real, read-only and overflow-safe at ${width}px`, async ({ page }) => {
    const fatal = [];
    page.on('pageerror', (error) => fatal.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') fatal.push(message.text()); });

    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.goto(pageUrl('?test=authenticated&dest=risk'), { waitUntil: 'networkidle' });

    const risk = page.locator('[data-operational-domain="risk"][data-risk-stage="9.1"]');
    await expect(risk).toBeVisible();
    await expect(risk).toHaveAttribute('data-risk-authority', 'read_only_derived_intelligence');
    await expect(risk).toHaveAttribute('data-risk-write-authority', 'none');
    await expect(page.locator('[data-live-deferred="true"]')).toHaveCount(0);
    await expect(risk).toContainText('المخاطر والرؤى');
    await expect(risk).toContainText('لا توجد إشارة تحتاج تصعيدًا الآن');
    await expect(risk).toContainText('لا توجد write authority داخل Smart Risk');
    await noHorizontalOverflow(page);
    expect(fatal).toEqual([]);
  });
}
