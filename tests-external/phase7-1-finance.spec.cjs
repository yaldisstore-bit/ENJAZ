const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE71_BASE_URL || 'http://127.0.0.1:4181/';
const previewUrl = new URL('phase7-1-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE71_ARTIFACT_DIR || 'artifacts/phase7-1-finance');
fs.mkdirSync(artifactDir, { recursive: true });

async function openPreview(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const finance = page.locator('[data-finance-stage="7.1"][data-finance-mode="preview"][data-finance-readonly="true"]');
  await expect(finance).toBeVisible();
  return { finance, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test('Phase 7.1 exposes exact authoritative summary semantics without write controls', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 920 });
  const { finance, errors } = await openPreview(page);
  await expect(finance.getByRole('heading', { name: 'المالية' })).toBeVisible();
  await expect(finance.getByText('16,985,000 د.ع', { exact: true })).toBeVisible();
  await expect(finance.getByText('2,250,000 د.ع', { exact: true }).first()).toBeVisible();
  await expect(finance.getByText('الذمم المفتوحة', { exact: true })).toBeVisible();
  await expect(finance.getByText('معاملة 1042', { exact: true }).first()).toBeVisible();
  await expect(finance.getByText('معاملة 1048', { exact: true }).first()).toBeVisible();
  await expect(finance.getByText('عينة 7.1 للمعاينة فقط', { exact: true })).toBeVisible();
  await expect(finance.getByRole('button')).toHaveCount(0);
  const text = await finance.innerText();
  expect(text).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/);
  expect(text).not.toContain('R2.0-7');
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 7.1 finance survives ${width}px without clipping`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    const { finance, errors } = await openPreview(page);
    await expect(finance.locator('.r2-finance-balance-hero')).toBeVisible();
    await expect(finance.locator('.r2-finance-panel')).toHaveCount(2);
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
  });
}
