const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_GOLDEN_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_GOLDEN_ARTIFACT_DIR || 'artifacts/r2-golden');
fs.mkdirSync(artifactDir, { recursive: true });

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertRoundedAndLayered(page, selector) {
  const style = await page.locator(selector).first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return { radius: parseFloat(computed.borderTopLeftRadius), shadow: computed.boxShadow };
  });
  expect(style.radius).toBeGreaterThan(8);
  expect(style.shadow).not.toBe('none');
}

async function shot(page, name) { await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true }); }

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Approved Golden Home + More stay polished and overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-golden-stage="R2.0-4"]')).toBeVisible();
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
    await assertRoundedAndLayered(page, '.r2-hero__signal');
    await assertNoHorizontalOverflow(page);
    await shot(page, `home-${width}`);

    const moreDoor = width >= 960 ? page.locator('.r2-rail-nav [data-door="more"]') : page.locator('.r2-shell__mobile-nav [data-door="more"]');
    await moreDoor.click();
    await expect(page.locator('[data-screen="more"]')).toBeVisible();
    await assertRoundedAndLayered(page, '.r2-section-heading--hero');
    await expect(page.locator('.r2-launcher-group')).toHaveCount(4);
    await assertNoHorizontalOverflow(page);
    await shot(page, `more-${width}`);
  });
}

test('Approved Golden transaction grammar survives R2.0-5 authoritative migration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
  await shot(page, 'transactions-390');
  const search = page.getByRole('textbox', { name: 'بحث المعاملات' });
  await search.fill('1042');
  const target = page.getByRole('button', { name: /فتح المعاملة 1042/ });
  await expect(target).toBeVisible();
  await search.fill('');

  await page.getByRole('button', { name: /متلكئة/ }).click();
  await expect(page.getByRole('button', { name: /فتح المعاملة 1038/ })).toBeVisible();
  await page.getByRole('button', { name: /جارية/ }).click();
  await search.fill('1042');
  await target.click();

  await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
  await expect(page).toHaveURL(/dest=transactions\.detail/);
  await assertRoundedAndLayered(page, '.r2-golden-transaction__hero');
  await assertNoHorizontalOverflow(page);
  await shot(page, 'transaction-360-overview-390');

  await page.getByRole('button', { name: 'الوثائق' }).click();
  await expect(page.locator('[data-golden-panel="documents"]')).toContainText('عقد التأسيس');
  await shot(page, 'transaction-360-documents-390');

  await page.getByRole('button', { name: 'تعديل المعاملة' }).click();
  await expect(page.locator('[data-screen="golden-transaction-editor"]')).toBeVisible();
  await page.getByLabel('عنوان المعاملة').fill('تعديل عقد تأسيس — مراجعة Golden');
  await page.getByRole('button', { name: 'حفظ المعاينة' }).click();
  await expect(page.getByRole('status')).toContainText('لم تتغير أي بيانات إنتاجية');
  await shot(page, 'transaction-editor-390');
  await page.getByRole('button', { name: 'العودة إلى 360°' }).click();

  await page.getByRole('button', { name: 'دورة الحياة' }).click();
  await expect(page.locator('[data-screen="golden-transaction-lifecycle"]')).toBeVisible();
  await page.getByRole('button', { name: 'محاكاة الأرشفة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('مؤرشفة · معاينة فقط');
  await shot(page, 'transaction-lifecycle-archived-390');
  await page.getByRole('button', { name: 'استعادة المعاينة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('نشطة · قيد المتابعة');
  await assertNoHorizontalOverflow(page);
});

for (const width of [430, 390, 360, 320]) {
  test(`Approved Golden 360 composition remains usable at ${width}px after R2.0-5`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${previewUrl}?dest=transactions.detail&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
    await expect(page.locator('.r2-golden-context-tabs button')).toHaveCount(5);
    await page.getByRole('button', { name: 'المالية' }).click();
    await expect(page.locator('[data-golden-panel="finance"]')).toContainText('المتبقي');
    await assertNoHorizontalOverflow(page);
    await shot(page, `transaction-360-finance-${width}`);
  });
}
