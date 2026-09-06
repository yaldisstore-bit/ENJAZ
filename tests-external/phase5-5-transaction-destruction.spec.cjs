const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE55_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE55_ARTIFACT_DIR || 'artifacts/phase5-5-transaction-destruction');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

test('Phase 5.5 long mixed search remains bounded, responsive and overflow-safe at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${previewUrl}?dest=transactions`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work="transactions"]')).toBeVisible();

  const search = page.getByRole('textbox', { name: 'بحث المعاملات' });
  const hostileSearch = `${'أإآشركة-XYZ_2026 / RENEWAL '.repeat(20)}1042`;
  await search.fill(hostileSearch);
  await expect(search).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await search.fill('1042');
  await expect(page.getByRole('button', { name: /فتح المعاملة 1042 تعديل عقد تأسيس/ })).toBeVisible();
  await shot(page, 'long-mixed-search-320');
});

test('Phase 5.5 repeated lifecycle activation never produces an impossible third state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions.lifecycle&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });

  const archive = page.getByRole('button', { name: 'محاكاة الأرشفة' });
  await expect(archive).toBeVisible();
  await archive.evaluate((node) => {
    node.click();
    node.click();
  });

  const state = page.locator('.r2-golden-lifecycle__state');
  await expect(state).toContainText('مؤرشفة · معاينة فقط');
  await expect(page.getByRole('button', { name: 'استعادة المعاينة' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'محاكاة الأرشفة' })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
  await shot(page, 'double-archive-390');
});

test('Phase 5.5 malformed transaction identity fails visibly without crashing the shell', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(`${previewUrl}?dest=transactions.detail&tx=%00not-a-uuid-${'x'.repeat(160)}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work-stage="R2.0-5"]')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
  await shot(page, 'malformed-transaction-id-360');
});

test('Phase 5.5 transaction navigation survives list-detail-back-lifecycle pressure on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions`, { waitUntil: 'networkidle' });
  const search = page.getByRole('textbox', { name: 'بحث المعاملات' });
  await search.fill('1042');
  await page.getByRole('button', { name: /فتح المعاملة 1042 تعديل عقد تأسيس/ }).click();
  await expect(page).toHaveURL(/dest=transactions\.detail/);
  await page.goBack({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work="transactions"]')).toBeVisible();

  await page.goto(`${previewUrl}?dest=transactions.lifecycle&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });
  await expect(page.locator('.r2-golden-lifecycle__state')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
