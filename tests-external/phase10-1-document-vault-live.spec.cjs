const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_PHASE101_BASE_URL || 'http://127.0.0.1:4181/';
const viewports = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'mobile-320', width: 320, height: 720 },
];

for (const viewport of viewports) {
  test(`Phase 10.1 Document Vault survives real UI workflow at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(`console:${message.text()}`); });

    await page.goto(`${baseUrl}phase10-1-browser.html`, { waitUntil: 'domcontentloaded' });
    const vault = page.locator('[data-phase10-1="document-vault"]');
    await expect(vault).toBeVisible();
    await expect(vault).toHaveAttribute('data-vault-authority', 'documents+document_versions');
    await expect(vault).toHaveAttribute('data-binary-boundary', 'signed-broker-only');
    await expect(vault.getByRole('heading', { name: 'خزنة الوثائق' })).toBeVisible();

    // Loading must be truthful rather than an empty flash.
    await expect(vault.locator('.rk-skeleton').first()).toBeVisible();
    await expect(vault).toContainText('عقد تأسيس شركة الرافدين للتجارة العامة');
    await expect(vault).toContainText('شهادة تسجيل ومرفقات مصورة');
    await expect(vault).not.toContainText('كتاب رسمي مؤرشف مع تاريخ محفوظ');

    // Version drawer, real v2 UI path, and version-specific download intent.
    const originalCard = vault.locator('.rk-result').filter({ hasText: 'عقد تأسيس شركة الرافدين للتجارة العامة' });
    await originalCard.getByRole('button', { name: 'سجل النسخ' }).click();
    const dialog = page.getByRole('dialog', { name: 'تفاصيل الوثيقة' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('الإصدار 1');
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'rafidain-company-contract-v2.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nphase10.1-version-two\n'),
    });
    await expect(dialog).toContainText('الإصدار 2');
    const v1Card = dialog.locator('.rk-derived-card').filter({ hasText: 'الإصدار 1' });
    await v1Card.getByRole('button', { name: 'تنزيل' }).click();
    await expect.poll(async () => page.evaluate(() => window.__ENJAZ_PHASE101_BROWSER__.downloadCalls.length)).toBeGreaterThan(0);
    const download = await page.evaluate(() => window.__ENJAZ_PHASE101_BROWSER__.downloadCalls.at(-1));
    expect(download.versionNumber).toBe(1);
    await dialog.getByRole('button', { name: 'إغلاق' }).click();
    await expect(dialog).toBeHidden();

    // New document upload keeps company/transaction relation and becomes visible only after gateway success.
    const uploadForm = vault.locator('form[aria-label="رفع وثيقة"]');
    await uploadForm.locator('input[name="file"]').setInputFiles({
      name: 'new-company-certificate.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\nphase10.1-new-document\n'),
    });
    await uploadForm.locator('input[name="title"]').fill('شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة');
    await uploadForm.locator('input[name="kind"]').fill('شهادة تأسيس');
    await uploadForm.locator('select[name="company"]').selectOption('22222222-2222-4222-8222-222222222221');
    await uploadForm.locator('select[name="transaction"]').selectOption('33333333-3333-4333-8333-333333333331');
    await uploadForm.getByRole('button', { name: 'رفع واعتماد النسخة' }).click();
    await expect(vault).toContainText('شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة');
    const uploadState = await page.evaluate(() => window.__ENJAZ_PHASE101_BROWSER__.uploadCalls);
    const newUpload = uploadState.find(call => call.title.includes('شهادة تأسيس جديدة'));
    expect(newUpload).toBeTruthy();
    expect(newUpload.documentId).toBeNull();
    expect(newUpload.companyId).toBe('22222222-2222-4222-8222-222222222221');
    expect(newUpload.transactionId).toBe('33333333-3333-4333-8333-333333333331');

    // Archive removes from active list without deleting history, then includeArchived restores visibility.
    const newCard = vault.locator('.rk-result').filter({ hasText: 'شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة' });
    await newCard.getByRole('button', { name: 'أرشفة' }).click();
    await expect(vault).not.toContainText('شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة');
    await vault.getByRole('button', { name: 'إظهار المؤرشف' }).click();
    await expect(vault).toContainText('شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة');
    const archivedCard = vault.locator('.rk-result').filter({ hasText: 'شهادة تأسيس جديدة — اختبار الرفع الحقيقي للواجهة' });
    await expect(archivedCard).toContainText('مؤرشف');

    // Error and empty states are explicit and recoverable.
    const search = vault.locator('input[name="q"]');
    await search.fill('خطأ');
    await vault.locator('.rk-toolbar').getByRole('button', { name: 'بحث' }).click();
    await expect(vault.getByRole('alert')).toContainText('تعذر تحميل خزنة الوثائق');
    await search.fill('لا شيء');
    await vault.locator('.rk-toolbar').getByRole('button', { name: 'بحث' }).click();
    await expect(vault.getByRole('alert')).toHaveCount(0);
    await expect(vault).toContainText('لا توجد وثائق مطابقة حتى الآن');

    // Pagination wiring must request offset 100 instead of silently hiding documents after the first page.
    await search.fill('صفحات');
    await vault.locator('.rk-toolbar').getByRole('button', { name: 'بحث' }).click();
    await expect(vault).toContainText('1–2 من 105');
    const next = vault.getByRole('button', { name: 'التالي' });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(vault).toContainText('101–101 من 105');
    const listCalls = await page.evaluate(() => window.__ENJAZ_PHASE101_BROWSER__.listCalls);
    expect(listCalls.some(call => call.query === 'صفحات' && call.offset === 100)).toBe(true);

    // Responsive reality: no horizontal escape and usable touch targets at all governed widths.
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflow.document, `document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body, `body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);

    const controls = vault.locator('button:visible, input:visible, select:visible');
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(8);
    for (let index = 0; index < controlCount; index += 1) {
      const box = await controls.nth(index).boundingBox();
      if (!box) continue;
      expect(box.height, `undersized Document Vault control #${index} at ${viewport.width}px`).toBeGreaterThanOrEqual(40);
    }

    expect(runtimeErrors, `Document Vault runtime errors at ${viewport.width}px`).toEqual([]);
    await page.screenshot({ path: `artifacts/phase10-1-document-vault/${viewport.name}.png`, fullPage: true });
    await context.close();
  });
}
