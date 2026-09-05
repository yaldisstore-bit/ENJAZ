const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_GOLDEN_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertRoundedAndLayered(page, selector) {
  const style = await page.locator(selector).first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      radius: parseFloat(computed.borderTopLeftRadius),
      shadow: computed.boxShadow,
    };
  });
  expect(style.radius).toBeGreaterThan(8);
  expect(style.shadow).not.toBe('none');
}

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Golden Home + More stay polished and overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.goto(previewUrl, { waitUntil: 'networkidle' });

    await expect(page.locator('[data-golden-stage="R2.0-4"]')).toBeVisible();
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
    await assertRoundedAndLayered(page, '.r2-hero__signal');
    await assertNoHorizontalOverflow(page);

    const moreDoor = width >= 960
      ? page.locator('.r2-rail-nav [data-door="more"]')
      : page.locator('.r2-shell__mobile-nav [data-door="more"]');
    await moreDoor.click();
    await expect(page.locator('[data-screen="more"]')).toBeVisible();
    await assertRoundedAndLayered(page, '.r2-section-heading--hero');
    await expect(page.locator('.r2-launcher-group')).toHaveCount(4);
    await assertNoHorizontalOverflow(page);
  });
}

test('Golden Transactions provides real filtering/search and one complete journey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=transactions`, { waitUntil: 'networkidle' });

  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
  const search = page.getByRole('textbox', { name: 'بحث المعاملات' });
  await search.fill('1042');
  await expect(page.getByRole('button', { name: /فتح المعاملة 1042/ })).toBeVisible();
  await search.fill('');

  await page.getByRole('button', { name: 'متلكئة' }).click();
  await expect(page.locator('.r2-record-row--static')).toContainText('1029');
  await page.getByRole('button', { name: 'جارية' }).click();

  await page.getByRole('button', { name: /فتح المعاملة 1042/ }).click();
  await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
  await expect(page).toHaveURL(/dest=transactions.detail/);
  await assertRoundedAndLayered(page, '.r2-golden-transaction__hero');
  await assertNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'الوثائق' }).click();
  await expect(page.locator('[data-golden-panel="documents"]')).toContainText('عقد التأسيس');

  await page.getByRole('button', { name: 'تعديل المعاملة' }).click();
  await expect(page.locator('[data-screen="golden-transaction-editor"]')).toBeVisible();
  const title = page.getByLabel('عنوان المعاملة');
  await title.fill('تعديل عقد تأسيس — مراجعة Golden');
  await page.getByRole('button', { name: 'حفظ المعاينة' }).click();
  await expect(page.getByRole('status')).toContainText('لم تتغير أي بيانات إنتاجية');
  await page.getByRole('button', { name: 'العودة إلى 360°' }).click();

  await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
  await page.getByRole('button', { name: 'دورة الحياة' }).click();
  await expect(page.locator('[data-screen="golden-transaction-lifecycle"]')).toBeVisible();
  await page.getByRole('button', { name: 'محاكاة الأرشفة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('مؤرشفة · معاينة فقط');
  await page.getByRole('button', { name: 'استعادة المعاينة' }).click();
  await expect(page.locator('.r2-golden-lifecycle__state')).toContainText('نشطة · قيد المتابعة');
  await assertNoHorizontalOverflow(page);
});

for (const width of [430, 390, 360, 320]) {
  test(`Golden 360 mobile composition remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${previewUrl}?dest=transactions.detail`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-screen="golden-transaction-360"]')).toBeVisible();
    await expect(page.locator('.r2-golden-context-tabs button')).toHaveCount(5);
    await page.getByRole('button', { name: 'المالية' }).click();
    await expect(page.locator('[data-golden-panel="finance"]')).toContainText('250,000 د.ع');
    await assertNoHorizontalOverflow(page);
  });
}
