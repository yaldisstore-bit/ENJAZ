const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE63_BASE_URL || 'http://127.0.0.1:4179/';
const previewUrl = new URL('phase6-3-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE63_ARTIFACT_DIR || 'artifacts/phase6-3-entity-360');
fs.mkdirSync(artifactDir, { recursive: true });

async function openPreview(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-phase6-3-preview="true"]')).toBeVisible();
  await expect(page.locator('[data-phase6-3="company-lawyer-360"][data-entity360-kind="company"]')).toBeVisible();
  await expect(page.locator('[data-phase6-3="company-lawyer-360"][data-entity360-kind="contact"]')).toBeVisible();
  return errors;
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page) {
  const tooSmall = await page.locator('[data-phase6-3-preview="true"] button:visible, [data-phase6-3-preview="true"] input:visible, [data-phase6-3-preview="true"] select:visible').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent?.trim() || node.getAttribute('aria-label') || '', width: rect.width, height: rect.height };
  }).filter(item => item.width < 43.5 || item.height < 43.5));
  expect(tooSmall).toEqual([]);
}

test('company and lawyer 360 compose the same authoritative relationship graph', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  const errors = await openPreview(page);
  const company = page.locator('[data-entity360-kind="company"]');
  const contact = page.locator('[data-entity360-kind="contact"]');
  await expect(company.getByRole('heading', { name: 'قمر السلطان' })).toBeVisible();
  await expect(company.getByText('تعديل عقد تأسيس', { exact: true })).toBeVisible();
  await expect(company.getByText('نور حسين', { exact: true })).toBeVisible();
  await expect(company.getByText('البيانات القانونية', { exact: true })).toBeVisible();
  await expect(contact.getByRole('heading', { name: 'نور حسين' })).toBeVisible();
  await expect(contact.getByText('قمر السلطان', { exact: true })).toBeVisible();
  await expect(contact.getByText('تعديل عقد تأسيس', { exact: true })).toBeVisible();
  await expect(page.getByText('مصادر الحقيقة محفوظة')).toHaveCount(2);
  const text = await page.locator('[data-phase6-3-preview="true"]').innerText();
  expect(text).not.toMatch(/\b(?:NaN|undefined)\b/);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
  await assertTouchTargets(page);
});

test('ending a company relationship preserves it as historical 360 context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPreview(page);
  const contact = page.locator('[data-entity360-kind="contact"]');
  await expect(contact.getByText(/محامية · حالية/)).toBeVisible();
  await page.getByRole('button', { name: 'إنهاء العلاقة' }).click();
  await expect(contact.getByText(/محامية · منتهية/)).toBeVisible();
  await expect(page.locator('.r2-contacts-relations').getByRole('button', { name: 'إنهاء العلاقة' })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 6.3 dual 360 survives ${width}px without clipping`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    const errors = await openPreview(page);
    await expect(page.locator('[data-entity360-kind="company"]')).toBeVisible();
    await expect(page.locator('[data-entity360-kind="contact"]')).toBeVisible();
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
    if (width <= 430) await assertTouchTargets(page);
  });
}
