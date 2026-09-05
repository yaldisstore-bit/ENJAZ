const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_ZERO_LOST_BASE_URL || 'http://127.0.0.1:4175/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_ZERO_LOST_ARTIFACT_DIR || 'artifacts/r2-zero-lost');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page, selector) {
  const sizes = await page.locator(selector).evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      return style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(43.5);
    expect(size.height).toBeGreaterThanOrEqual(43.5);
  }
}

async function openSearch(page, width = 390) {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-zero-lost-stage="R2.0-8"]')).toBeVisible();
  await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
  await expect(page.locator('[data-zero-lost-search="R2.0-8"]')).toBeVisible();
  return page.getByPlaceholder('مثال: 1042، خزنة، أتمتة، شركة، مالية…');
}

test('R2.0-8 canonical feature alias navigation restores exact search state on back', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('خزنة');
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: 'الوثائق والتقارير' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/dest=documents/);
  await expect(page.locator('[data-records-domain="documents"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(input).toHaveValue('خزنة');
  await expect(page.locator('[data-find-kind="feature"]').filter({ hasText: 'الوثائق والتقارير' }).first()).toBeVisible();
});

test('R2.0-8 transaction record discovery opens canonical 360 and back restores query', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('1042');
  const record = page.locator('[data-find-kind="transaction"][data-find-source="preview-record"]').filter({ hasText: '#1042' }).first();
  await expect(record).toBeVisible();
  await expect(record).toContainText('عينة Preview');
  await record.click();
  await expect(page).toHaveURL(/dest=transactions\.detail/);
  await expect(page).toHaveURL(/tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/);
  await expect(page.locator('[data-core-work="transaction-360"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(input).toHaveValue('1042');
  await expect(page.locator('[data-find-kind="transaction"]').filter({ hasText: '#1042' }).first()).toBeVisible();
});

test('R2.0-8 Arabic normalization survives hamza, tatweel and mixed input', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('أتمــتة');
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: 'الأتمتة' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/dest=automation/);
  await expect(page.locator('[data-operational-domain="automation"]')).toBeVisible();
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-8 Find Anything remains usable and overflow-safe at ${width}px`, async ({ page }) => {
    const input = await openSearch(page, width);
    await input.fill('معاملة');
    await expect(page.locator('.r2-search-result').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (width <= 430) await assertTouchTargets(page, '.r2-search-result');
    await page.screenshot({ path: path.join(artifactDir, `zero-lost-${width}.png`), fullPage: true });
  });
}
