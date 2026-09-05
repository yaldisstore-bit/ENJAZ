const { test, expect } = require('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    docClient: document.documentElement.clientWidth,
    docScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect(geometry.docScroll).toBeLessThanOrEqual(geometry.docClient + 1);
  expect(geometry.bodyScroll).toBeLessThanOrEqual(geometry.docClient + 1);
}

for (const width of [430, 390, 360, 320]) {
  test(`R2 shell mobile reality ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(previewUrl, { waitUntil: 'networkidle' });

    const shell = page.locator('[data-r2-shell="R2.0-3"]');
    await expect(shell).toBeVisible();
    await expect(page.locator('.r2-shell__mobile-nav')).toBeVisible();
    await expect(page.locator('.r2-shell__rail')).toBeHidden();
    await expect(page.locator('.r2-shell__mobile-nav [data-door]')).toHaveCount(5);

    const targets = await page.locator('.r2-shell__mobile-nav [data-door]').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    for (const target of targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }

    await assertNoHorizontalOverflow(page);

    await page.locator('.r2-shell__mobile-nav [data-door="transactions"]').click();
    await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
    await expect(page).toHaveURL(/dest=transactions/);
    await expect(page.locator('.r2-location')).toContainText('المعاملات');
    await assertNoHorizontalOverflow(page);

    await page.goBack();
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
  });
}

test('R2 shell desktop rail and deep-link foundations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${previewUrl}?dest=more`, { waitUntil: 'networkidle' });

  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
  await expect(page.locator('.r2-shell__rail')).toBeVisible();
  await expect(page.locator('.r2-shell__mobile-nav')).toBeHidden();
  await expect(page.locator('[data-screen="more"]')).toBeVisible();
  await expect(page.locator('.r2-rail-nav [data-door]')).toHaveCount(5);
  await assertNoHorizontalOverflow(page);
});

test('R2 Find Anything aliases navigate to canonical feature homes and browser back restores search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();

  // Bind to the stable search contract rather than placeholder copy, which may evolve by stage.
  const input = page.locator('[data-overlay="search"] input').first();
  await expect(input).toBeVisible();
  await input.fill('خزنة');
  await page.getByRole('button', { name: /الوثائق والتقارير/ }).click();
  await expect(page).toHaveURL(/dest=documents/);
  await expect(page.locator('[data-records-domain="documents"], [data-screen="launcher-destination"]')).toContainText('الوثائق والتقارير');

  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(input).toHaveValue('خزنة');

  await input.fill('أتمتة');
  await page.getByRole('button', { name: /الأتمتة/ }).click();
  await expect(page).toHaveURL(/dest=automation/);
  await expect(page.locator('[data-operational-domain="automation"], [data-screen="launcher-destination"]')).toContainText('الأتمتة');
});

test('R2 overlay ownership closes with Escape without losing current destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=today`, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'الحساب ومساحة العمل' }).click();
  await expect(page.locator('[data-overlay="account"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-overlay="account"]')).toHaveCount(0);
  await expect(page.locator('[data-screen="today"]')).toBeVisible();
  await expect(page).toHaveURL(/dest=today/);
});
