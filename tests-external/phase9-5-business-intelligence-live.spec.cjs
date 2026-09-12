const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_PHASE95_BASE_URL || 'http://127.0.0.1:4181/';
const viewports = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-320', width: 320, height: 720 },
];

for (const viewport of viewports) {
  test(`Phase 9.5 BI is explainable, non-authoritative and stable at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });

    await page.goto(`${baseUrl}phase9-5-browser.html`, { waitUntil: 'networkidle' });
    const center = page.locator('[data-phase9-5-runtime="business-intelligence"]');
    await expect(center).toBeVisible();
    await expect(center).toHaveAttribute('data-bi-authority', 'read-only-derived');
    await expect(center).toHaveAttribute('data-bi-provenance', 'required');
    await expect(center.getByRole('heading', { name: 'مركز ذكاء الأعمال' })).toBeVisible();
    await expect(center).toContainText('التشغيل');
    await expect(center).toContainText('المالية');
    await expect(center).toContainText('السعة الميدانية');
    await expect(center).toContainText('التوقعات الاتجاهية');
    await expect(center).toContainText('سلامة المصدر');
    await expect(center).toContainText('نفس مساحة العمل فقط');
    await expect(center).toContainText('اتجاهي');
    await expect(center).toContainText('عينات غير كافية');
    await expect(center).toContainText('trailing_run_rate');

    const kpis = center.locator('[data-bi-kpi]');
    expect(await kpis.count()).toBeGreaterThanOrEqual(7);
    const forecasts = center.locator('[data-bi-forecast]');
    expect(await forecasts.count()).toBe(2);
    await expect(forecasts.nth(0)).toHaveAttribute('data-bi-authoritative', 'false');
    await expect(forecasts.nth(1)).toHaveAttribute('data-bi-authoritative', 'false');
    await expect(forecasts.nth(0)).toHaveAttribute('data-bi-forecast-confidence', 'directional');
    await expect(forecasts.nth(1)).toHaveAttribute('data-bi-forecast-confidence', 'insufficient');

    const state = await page.evaluate(() => window.__ENJAZ_PHASE95_BROWSER__);
    expect(state.workspaceId).toBe('11111111-1111-4111-8111-111111111111');
    expect(state.kpiCount).toBeGreaterThanOrEqual(7);
    expect(state.forecastCount).toBe(2);

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
      main: document.getElementById('r2-main').scrollWidth - document.getElementById('r2-main').clientWidth,
    }));
    expect(overflow.document, `document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body, `body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.main, `main horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

    const visibleRows = center.locator('[data-bi-kpi], [data-bi-forecast], [data-bi-provenance-summary] .r2-search-result');
    const rowCount = await visibleRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(10);
    for (let index = 0; index < rowCount; index += 1) {
      const box = await visibleRows.nth(index).boundingBox();
      if (!box) continue;
      expect(box.width, `collapsed BI row #${index} at ${viewport.width}px`).toBeGreaterThan(120);
      expect(box.height, `undersized BI row #${index} at ${viewport.width}px`).toBeGreaterThanOrEqual(40);
    }

    expect(runtimeErrors, `runtime errors at ${viewport.width}px`).toEqual([]);
    await page.screenshot({ path: `artifacts/phase9-5-business-intelligence/${viewport.name}.png`, fullPage: true });
    await context.close();
  });
}
