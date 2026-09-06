const { test, expect } = require('@playwright/test');

const baseURL = process.env.PHASE62_BASE_URL || 'http://127.0.0.1:4178/';
const viewports = [
  { width: 1280, height: 900 },
  { width: 430, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 720 },
];

async function openPreview(page) {
  await page.goto(`${baseURL}phase6-2-preview.html`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-phase6-2="lawyers-contacts"]')).toBeVisible();
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function assertTouchTargets(page) {
  const tooSmall = await page.locator('[data-phase6-2="lawyers-contacts"] button:visible, [data-phase6-2="lawyers-contacts"] input:visible, [data-phase6-2="lawyers-contacts"] select:visible').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, text: node.textContent?.trim() || node.getAttribute('aria-label') || '', height: node.getBoundingClientRect().height })).filter((item) => item.height < 43.5));
  expect(tooSmall).toEqual([]);
}

for (const viewport of viewports) {
  test(`people directory survives ${viewport.width}px without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openPreview(page);
    await expect(page.getByRole('heading', { name: 'المحامون وجهات الاتصال' })).toBeVisible();
    await expect(page.getByText('نور حسين', { exact: true }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (viewport.width <= 430) await assertTouchTargets(page);
  });
}

test('Arabic search and lawyer filter use the live contact directory', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPreview(page);
  await page.getByLabel('بحث الأشخاص').fill('نور');
  await expect(page.getByText('نور حسين', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('سارة علي', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /المحامون/ }).click();
  await expect(page.getByText('نور حسين', { exact: true }).first()).toBeVisible();
});

test('contact create and edit are real preview mutations', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await openPreview(page);
  await page.getByRole('button', { name: 'جهة اتصال جديدة' }).click();
  await page.getByLabel('إضافة جهة اتصال').getByText('الاسم').locator('..').getByRole('textbox').fill('مصطفى فيصل عبود');
  const editor = page.getByLabel('إضافة جهة اتصال');
  await editor.locator('label').filter({ hasText: 'النوع / الصفة' }).getByRole('textbox').fill('محامٍ');
  await editor.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('مصطفى فيصل عبود', { exact: true }).first()).toBeVisible();
  await expect(page.locator('[data-contact-profile]').getByRole('heading', { name: 'مصطفى فيصل عبود' })).toBeVisible();
  await page.getByRole('button', { name: 'تعديل البيانات' }).click();
  const edit = page.getByLabel('تعديل جهة اتصال');
  await edit.locator('label').filter({ hasText: 'الهاتف' }).getByRole('textbox').fill('07712345678');
  await edit.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByText('07712345678', { exact: true })).toBeVisible();
});

test('company relationship can be added and ended through canonical company_contacts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPreview(page);
  await page.getByText('سارة علي', { exact: true }).first().click();
  await expect(page.locator('[data-contact-profile]').getByRole('heading', { name: 'سارة علي' })).toBeVisible();
  const manager = page.locator('.r2-contacts-relation-create');
  await manager.locator('label').filter({ hasText: 'نوع العلاقة' }).getByRole('textbox').fill('متابعة');
  await manager.getByRole('button', { name: 'ربط بالشركة' }).click();
  await expect(page.locator('.r2-contacts-relations').getByText('قمر السلطان', { exact: true })).toBeVisible();
  await expect(page.locator('.r2-contacts-relations').getByText(/متابعة · حالية/)).toBeVisible();
  await page.locator('.r2-contacts-relations').getByRole('button', { name: 'إنهاء العلاقة' }).click();
  await expect(page.locator('.r2-contacts-relations').getByText(/متابعة · منتهية/)).toBeVisible();
});
