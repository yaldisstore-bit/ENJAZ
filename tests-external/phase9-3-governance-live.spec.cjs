const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_PHASE93_BASE_URL || 'http://127.0.0.1:4179/';
const viewports = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-320', width: 320, height: 720 },
];

for (const viewport of viewports) {
  test(`Phase 9.3 governance cockpit is truthful and stable at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });

    await page.goto(`${baseUrl}phase9-3-browser.html`, { waitUntil: 'networkidle' });
    const governance = page.locator('[data-phase9-3="governance"]');
    await expect(governance).toBeVisible();
    await expect(page.locator('[data-company-profile="22222222-2222-4222-8222-222222222222"]')).toBeVisible();
    await expect(governance.getByRole('heading', { name: 'مركز حوكمة الشركة' })).toBeVisible();
    await expect(governance).toContainText('100%');
    await expect(governance).toContainText('محمد حيدر محسن');
    await expect(governance).toContainText('اعتماد هيكل الإدارة والتخويل');
    const localizedCapital = await page.evaluate(() => new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 2 }).format('9999999999999999.99'));
    await expect(governance).toContainText(localizedCapital);
    await expect(governance).toContainText('لا توجد إشارات حوكمة مفتوحة');
    await expect(governance.getByRole('button', { name: 'تحديث الهيكل' })).toBeVisible();

    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));
    expect(overflow.document, `document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body, `body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

    const visibleControls = governance.locator('button:visible, input:visible, select:visible, textarea:visible');
    const controlCount = await visibleControls.count();
    expect(controlCount).toBeGreaterThan(1);
    for (let index = 0; index < controlCount; index += 1) {
      const box = await visibleControls.nth(index).boundingBox();
      if (!box) continue;
      expect(box.height, `undersized governance control #${index} at ${viewport.width}px`).toBeGreaterThanOrEqual(40);
    }

    if (viewport.width === 1280) {
      const asOf = governance.getByLabel('تاريخ لقطة الحوكمة');
      await asOf.fill('2026-06-01');
      await expect.poll(async () => page.evaluate(() => window.__ENJAZ_PHASE93_BROWSER__?.loads.includes('2026-06-01') ?? false)).toBe(true);

      await page.getByRole('button', { name: 'تعديل البيانات' }).click();
      const capitalField = page.locator('label').filter({ hasText: 'رأس المال' }).locator('input').first();
      await expect(capitalField).toHaveAttribute('readonly', '');
      await expect(page.getByText('تغييره بعد التأسيس يتم من مركز الحوكمة فقط حتى يبقى التاريخ القانوني محفوظاً.')).toBeVisible();
    }

    expect(runtimeErrors, `runtime errors at ${viewport.width}px`).toEqual([]);
    await page.screenshot({ path: `artifacts/phase9-3-governance/${viewport.name}.png`, fullPage: true });
    await context.close();
  });
}
