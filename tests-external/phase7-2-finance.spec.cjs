const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE72_BASE_URL || 'http://127.0.0.1:4182/';
const previewUrl = new URL('phase7-2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE72_ARTIFACT_DIR || 'artifacts/phase7-2-finance');
fs.mkdirSync(artifactDir, { recursive: true });

async function openPreview(page, width = 430, height = 920) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-finance-stage="7.2"][data-finance-mode="preview"][data-m16-finance="true"]');
  await expect(root).toBeVisible();
  return { root, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => {
    const client = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          position: style.position,
          overflowX: style.overflowX,
          boxSizing: style.boxSizing,
        };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > client + 1))
      .sort((a, b) => Math.max(Math.abs(b.left), b.right - client) - Math.max(Math.abs(a.left), a.right - client))
      .slice(0, 12);
    return { client, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, offenders };
  });
  const detail = JSON.stringify(geometry, null, 2);
  expect(geometry.doc, detail).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body, detail).toBeLessThanOrEqual(geometry.client + 1);
}

test('Phase 7.2 exposes payment, cashbox, M16 and reconciliation surfaces without fake money authority', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.getByRole('heading', { name: 'المالية والتحصيل' })).toBeVisible();
  await expect(root.getByText('المطابقة المالية سليمة', { exact: true })).toBeVisible();
  await expect(root.getByRole('button', { name: /دفعة جديدة/ })).toBeVisible();
  await expect(root.getByRole('button', { name: 'خزنة', exact: true })).toBeVisible();
  await expect(root.getByRole('button', { name: 'عقد / Retainer' })).toBeVisible();
  await expect(root.getByText('M16 · العقود والـRetainers', { exact: true })).toBeVisible();
  await expect(root.getByText('ENJ-R-2026-00000001', { exact: true })).toBeVisible();
  expect(await root.innerText()).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('Phase 7.2 creates a payment and returns an immutable receipt surface', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await root.getByRole('button', { name: /دفعة جديدة/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'تسجيل دفعة جديدة' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/الخزنة/).selectOption('66666666-6666-4666-8666-666666666661');
  await dialog.getByRole('button', { name: 'ترحيل الدفعة وإصدار الإيصال' }).click();
  const receipt = page.locator('[data-print-receipt="true"]');
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('ENJ-R-2026-00000002', { exact: true })).toBeVisible();
  await expect(receipt.getByText('رمز تحقق فريد للإيصال', { exact: true })).toBeVisible();
  await expect(receipt.getByText('قمر السلطان', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('Phase 7.2 reversal is compensating evidence, not deletion', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  const firstCard = root.locator('[data-receipt-ref="ENJ-R-2026-00000001"]');
  await firstCard.getByRole('button', { name: 'عكس' }).click();
  const dialog = page.getByRole('dialog', { name: /عكس ENJ-R-2026-00000001/ });
  await dialog.getByLabel('سبب العكس').fill('إلغاء الدفعة بعد مراجعة الاستلام');
  await dialog.getByRole('button', { name: 'تأكيد عكس الدفعة' }).click();
  const receipt = page.locator('[data-print-receipt="true"]');
  await expect(receipt.getByText('هذا الإيصال معكوس', { exact: true })).toBeVisible();
  await expect(receipt.getByText('ENJ-RV-2026-00000001', { exact: true })).toBeVisible();
  await expect(receipt.getByText('إلغاء الدفعة بعد مراجعة الاستلام', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('M16 commercial engagement can be created without creating a second money store', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await root.getByRole('button', { name: 'عقد / Retainer' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'ربط عقد أو Retainer' });
  await dialog.getByLabel('العنوان').fill('Retainer سنوي لمتابعة معاملات الشركة');
  await dialog.getByLabel('النوع').selectOption('retainer');
  await dialog.getByLabel('أسلوب الفوترة').selectOption('retainer');
  await dialog.getByRole('button', { name: 'إنشاء وربط' }).click();
  await expect(dialog).toBeHidden();
  await expect(root.getByText(/تم إنشاء .* وربطه بالمعاملة/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('cashbox creation is a controlled command', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await root.getByRole('button', { name: 'خزنة', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'إنشاء خزنة مالية' });
  await dialog.getByLabel('اسم الخزنة').fill('خزنة فرع المنصور');
  await dialog.getByLabel('الرصيد الافتتاحي').fill('250000.00');
  await dialog.getByRole('button', { name: 'إنشاء الخزنة' }).click();
  await expect(dialog).toBeHidden();
  await expect(root.getByText('تم إنشاء خزنة فرع المنصور.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 7.2 survives ${width}px with no horizontal escape`, async ({ page }) => {
    const { root, errors } = await openPreview(page, width, width === 1280 ? 900 : 844);
    await expect(root.locator('.r2-f72-command-grid')).toBeVisible();
    await expect(root.locator('.r2-f72-receipts')).toBeVisible();
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
  });
}

test('mobile payment sheet survives focused inputs and close/back-style action', async ({ page }) => {
  const { root, errors } = await openPreview(page, 320, 700);
  await root.getByRole('button', { name: /دفعة جديدة/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'تسجيل دفعة جديدة' });
  const amount = dialog.getByLabel('المبلغ');
  await amount.focus();
  await expect(amount).toBeFocused();
  await assertNoHorizontalOverflow(page);
  await dialog.getByRole('button', { name: 'إغلاق' }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});