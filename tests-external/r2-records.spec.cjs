const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_RECORDS_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_RECORDS_ARTIFACT_DIR || 'artifacts/r2-records');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page, selector) {
  const sizes = await page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node);
    return style.visibility !== 'hidden' && style.display !== 'none';
  }).map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const size of sizes) {
    expect(size.height).toBeGreaterThanOrEqual(43.5);
    expect(size.width).toBeGreaterThanOrEqual(43.5);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

test('R2.0-6 companies is entity-first and relationship-aware', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=companies`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-records-stage="R2.0-6"][data-records-domain="companies"]')).toBeVisible();
  await expect(page.locator('[data-entity-first="true"]')).toBeVisible();
  await expect(page.getByText('خريطة العلاقات')).toBeVisible();
  await page.getByRole('textbox', { name: 'بحث الشركات' }).fill('الفجر');
  await page.getByRole('button', { name: 'فتح شركة شركة الفجر' }).click();
  await expect(page.locator('[data-company-profile="company-fajr"]')).toContainText('علي كريم سلمان');
  await expect(page.locator('[data-company-profile="company-fajr"]')).toContainText('3');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'companies-390');
});

test('R2.0-6 people keeps identity, role and company links in one profile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=people`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-records-domain="people"]')).toBeVisible();
  await page.getByRole('textbox', { name: 'بحث الأشخاص' }).fill('نور');
  await page.getByRole('button', { name: 'فتح شخص نور حسين' }).click();
  await expect(page.locator('[data-person-profile="person-nour"]')).toContainText('قرارات الشركات والمراسلات');
  await expect(page.locator('[data-person-profile="person-nour"]')).toContainText('شركة الفجر');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'people-390');
});

test('R2.0-6 documents uses category list detail and never claims upload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=documents`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-records-domain="documents"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'فئات الوثائق' })).toBeVisible();
  await page.getByRole('button', { name: 'معاينة عقد تأسيس.pdf' }).click();
  await expect(page.locator('[data-document-detail="doc-2"]')).toContainText('قمر السلطان');
  await expect(page.locator('[data-document-detail="doc-2"]')).toContainText('لا يوجد رفع أو حذف إنتاجي');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'documents-390');
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-6 records stay overflow-safe and touch-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    for (const destination of ['companies', 'people', 'documents']) {
      await page.goto(`${previewUrl}?dest=${destination}`, { waitUntil: 'networkidle' });
      await expect(page.locator(`[data-records-domain="${destination}"]`)).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
    if (width <= 430) {
      await assertTouchTargets(page, '.r2-shell__mobile-nav button');
      await page.goto(`${previewUrl}?dest=companies`, { waitUntil: 'networkidle' });
      await assertTouchTargets(page, '.r2-records-directory-list button');
    }
    await shot(page, `records-${width}`);
  });
}
