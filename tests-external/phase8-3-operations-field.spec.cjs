const { test, expect } = require('@playwright/test');

const baseURL = process.env.PHASE83_BASE_URL || 'http://127.0.0.1:4183/';

async function openPreview(page) {
  await page.goto(`${baseURL}phase8-3-preview.html`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-field-stage="8.3"]')).toBeVisible();
  await expect(page.locator('[data-field-authority="field_assignments_visits_evidence_receipts"]')).toBeVisible();
  await expect(page.locator('[data-finance-write-authority="none"]')).toBeVisible();
  await expect(page.locator('[data-location-tracking="visit_scoped_only"]')).toBeVisible();
}

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 8.3 layout is readable and overflow-safe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 800 ? 900 : 820 });
    await openPreview(page);
    await expect(page.getByRole('heading', { name: 'مركز العمليات', exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole('tab', { name: 'Runner Mode' }).click();
    await expect(page.getByRole('heading', { name: 'Runner Mode', exact: true })).toBeVisible();
    const runnerOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(runnerOverflow).toBeLessThanOrEqual(1);
  });
}

test('operations center shows canonical health and can create a real preview assignment', async ({ page }) => {
  await openPreview(page);
  await expect(page.getByText('مانعات High/Critical')).toBeVisible();
  await expect(page.getByText('موافقات أتمتة')).toBeVisible();
  await expect(page.getByText('حل المانع: إكمال مستمسك ناقص')).toBeVisible();
  await page.getByLabel('المعاملة').selectOption({ index: 1 });
  await page.getByLabel('الموظف').selectOption({ index: 1 });
  await page.getByLabel('الجهة / الوجهة').fill('هيئة تجريبية للاختبار');
  await page.getByRole('button', { name: 'إنشاء التكليف' }).click();
  await expect(page.getByText('هيئة تجريبية للاختبار')).toBeVisible();
});

test('Runner performs check-in, explicit visit outcome and office handoff without finance mutation claims', async ({ page }) => {
  await openPreview(page);
  await page.getByRole('tab', { name: 'Runner Mode' }).click();
  await expect(page.getByText('رسم رسمي مدفوع — دليل فقط، ليس Payment')).toHaveCount(0);
  await page.getByRole('button', { name: 'تسجيل الوصول' }).click();
  await expect(page.getByText('الزيارة جارية')).toBeVisible();
  await page.getByLabel('ملخص الزيارة').fill('تمت مراجعة المعاملة لدى الجهة');
  await page.getByLabel('رسم رسمي مدفوع — دليل فقط، ليس Payment').fill('12500.00');
  await page.getByRole('button', { name: 'إنهاء الزيارة' }).click();
  await expect(page.getByRole('button', { name: 'تسليم للمكتب' })).toBeVisible();
  await page.getByLabel('تسليم للمكتب').fill('تمت الزيارة والرسم المذكور دليل ميداني فقط.');
  await page.getByRole('button', { name: 'تسليم للمكتب' }).click();
  await expect(page.getByText('لا توجد زيارة مكلّف بها حالياً.')).toBeVisible();
});

test('offline check-in and checkout survive reconnect with replay-safe identities', async ({ page, context }) => {
  await openPreview(page);
  await context.setOffline(true);
  await page.getByRole('tab', { name: 'Runner Mode' }).click();
  await page.getByRole('button', { name: 'تسجيل الوصول' }).click();
  await expect(page.getByText('محلي غير مزامن')).toBeVisible();
  await expect(page.locator('[data-offline-pending="1"]')).toBeVisible();
  await page.getByLabel('ملخص الزيارة').fill('أنجزت الزيارة أثناء انقطاع الشبكة');
  await page.getByRole('button', { name: 'إنهاء الزيارة' }).click();
  await expect(page.locator('[data-offline-pending="2"]')).toBeVisible();
  const queued = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('enjaz.field-operations.offline.v1.')).map((key) => JSON.parse(localStorage.getItem(key) || '[]'))[0] || []);
  expect(queued).toHaveLength(2);
  expect(queued[0].operation.operationId).toBe(queued[1].operation.visitId);
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('[data-offline-pending]')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText('تمت مزامنة 2 عملية ميدانية دون تكرار.')).toBeVisible();
});

test('location policy remains visit-scoped and never introduces continuous tracking UI', async ({ page }) => {
  await openPreview(page);
  await expect(page.getByText('لا يوجد background tracking.')).toBeVisible();
  await expect(page.locator('[data-location-tracking="visit_scoped_only"]')).toHaveCount(1);
  await expect(page.getByText(/تتبع مستمر|تتبع بالخلفية|background location/i)).toHaveCount(0);
});
