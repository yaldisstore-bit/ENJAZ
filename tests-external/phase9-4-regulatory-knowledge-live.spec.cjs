const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_PHASE94_BASE_URL || 'http://127.0.0.1:4180/';
const viewports = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-320', width: 320, height: 720 },
];

for (const viewport of viewports) {
  test(`Phase 9.4 regulatory knowledge is authoritative, separated and stable at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });

    await page.goto(`${baseUrl}phase9-4-browser.html`, { waitUntil: 'networkidle' });
    const center = page.locator('[data-phase9-4-runtime="knowledge-center"]');
    await expect(center).toBeVisible();
    await expect(center).toHaveAttribute('data-regulatory-browser-dml', 'rpc-only');
    await expect(center.getByRole('heading', { name: 'مركز المعرفة التنظيمية' })).toBeVisible();
    await expect(center).toContainText('مصدر رسمي');
    await expect(center).toContainText('معرفة داخلية موثقة');
    await expect(center).toContainText('قانون الشركات — النص النافذ');
    await expect(center).toContainText('إجراء تدقيق محضر الشركة قبل الإيداع');

    const officialCard = center.getByRole('button', { name: /قانون الشركات — النص النافذ/ });
    await officialCard.click();
    const detail = page.locator('[data-regulatory-detail="authoritative"]');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('النص المعتمد');
    await expect(detail).toContainText('حقيقة تنظيمية · Authoritative');
    await expect(detail).toContainText('ليست مصدرًا رسميًا');
    await expect(detail.locator('[data-regulatory-derived-authority="false"]')).toContainText('ملخص مساعد');
    await expect(detail.getByRole('link', { name: /فتح المصدر الأصلي/ })).toHaveAttribute('rel', /noopener/);

    const search = center.getByLabel('البحث في المعرفة التنظيمية');
    await search.fill('إجراء تدقيق');
    await expect(center).toContainText('1 نتيجة');
    await expect(center).toContainText('إجراء تدقيق محضر الشركة قبل الإيداع');
    await expect(center).not.toContainText('قانون الشركات — النص النافذ');
    await search.fill('عبارة غير موجودة تمامًا');
    await expect(center).toContainText('لا توجد نتائج مطابقة');
    await center.getByRole('button', { name: 'مسح البحث' }).click();
    await expect(center).toContainText('2 نتيجة');

    const officialScope = center.getByRole('button', { name: 'مصدر رسمي', exact: true });
    await officialScope.click();
    await expect(center).toContainText('1 نتيجة');
    await expect(center).toContainText('قانون الشركات — النص النافذ');
    await center.getByRole('button', { name: 'كل المصادر', exact: true }).click();
    await expect(center).toContainText('2 نتيجة');

    const state = await page.evaluate(() => window.__ENJAZ_PHASE94_BROWSER__);
    expect(state.searchCalls.length).toBeGreaterThanOrEqual(4);
    expect(state.entryCalls.length).toBeGreaterThanOrEqual(1);

    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));
    expect(overflow.document, `document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body, `body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

    const controls = center.locator('button:visible, input:visible, a:visible');
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(3);
    for (let index = 0; index < controlCount; index += 1) {
      const box = await controls.nth(index).boundingBox();
      if (!box) continue;
      expect(box.height, `undersized regulatory control #${index} at ${viewport.width}px`).toBeGreaterThanOrEqual(40);
    }

    expect(runtimeErrors, `runtime errors at ${viewport.width}px`).toEqual([]);
    await page.screenshot({ path: `artifacts/phase9-4-regulatory/${viewport.name}.png`, fullPage: true });
    await context.close();
  });
}
