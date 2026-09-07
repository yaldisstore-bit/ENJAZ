const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE82_BASE_URL || 'http://127.0.0.1:4182/';
const previewUrl = new URL('phase8-2-preview.html', baseUrl).toString();

async function openPreview(page, width = 430, height = 920) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-automation-stage="8.2"][data-automation-mode="preview"][data-automation-authority="automation_rules_and_runs"][data-finance-write-authority="none"]');
  await expect(root).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الأتمتة', exact: true })).toBeVisible();
  return { root, errors };
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

test('Phase 8.2 exposes canonical rules, runs and human approvals without finance authority', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.getByRole('heading', { name: 'قواعد الأتمتة' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الموافقات البشرية' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'التشغيلات الأخيرة' })).toBeVisible();
  await expect(root.getByText('متابعة المعاملة المتأخرة')).toBeVisible();
  await expect(root.getByText(/workflow\.stage\.changed/)).toBeVisible();
  await expect(root.getByRole('button', { name: 'موافقة وتنفيذ' })).toBeVisible();
  expect(await root.innerText()).not.toMatch(/\b(?:NaN|undefined|Infinity)\b/);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 8.2 survives ${width}px without horizontal escape`, async ({ page }) => {
    const { root, errors } = await openPreview(page, width, width === 1280 ? 900 : 844);
    await expect(root.locator('.r2-automation-kpis')).toBeVisible();
    await expect(root.locator('.r2-automation-rule').first()).toBeVisible();
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
  });
}

test('activation mutation reloads canonical rule state', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  const manualRule = root.locator('[data-rule-key="manual_late_followup"]');
  await expect(manualRule).toHaveAttribute('data-rule-enabled', 'true');
  await manualRule.getByRole('button', { name: 'تعطيل قاعدة متابعة المعاملة المتأخرة' }).click();
  await expect(manualRule).toHaveAttribute('data-rule-enabled', 'false');
  await expect(manualRule.getByText('متوقفة')).toBeVisible();
  expect(errors).toEqual([]);
});

test('manual dispatch accepts explicit payload and records a succeeded run', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  const manualRule = root.locator('[data-rule-key="manual_late_followup"]');
  const before = await root.locator('[data-run-status]').count();
  await manualRule.getByLabel('حمولة التشغيل — متابعة المعاملة المتأخرة').fill('{"transactionId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"}');
  await manualRule.getByRole('button', { name: 'تشغيل يدوي', exact: true }).click();
  await expect(root.locator('[data-run-status="succeeded"]')).toHaveCount(before);
  await expect(root.getByText('manual-', { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('human rejection clears pending approval and updates the authoritative run', async ({ page }) => {
  const { root, errors } = await openPreview(page);
  await expect(root.locator('[data-approval-id]')).toHaveCount(1);
  await root.getByRole('button', { name: 'رفض', exact: true }).click();
  await expect(root.locator('[data-approval-id]')).toHaveCount(0);
  await expect(root.locator(`[data-run-status="skipped"]`)).toHaveCount(1);
  expect(errors).toEqual([]);
});
