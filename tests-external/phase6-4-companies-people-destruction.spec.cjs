const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE64_BASE_URL || 'http://127.0.0.1:4180/';
const previewUrl = new URL('phase6-3-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.PHASE64_ARTIFACT_DIR || 'artifacts/phase6-4-companies-people-destruction');
fs.mkdirSync(artifactDir, { recursive: true });

async function openPreview(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-phase6-3-preview="true"]')).toBeVisible();
  await expect(page.locator('[data-phase6-1="companies"]')).toBeVisible();
  await expect(page.locator('[data-phase6-2="lawyers-contacts"]')).toBeVisible();
  await expect(page.locator('[data-entity360-kind="company"]')).toBeVisible();
  await expect(page.locator('[data-entity360-kind="contact"]')).toBeVisible();
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

async function assertBoundedNormalizedSearch(input, longMixed) {
  await input.fill(longMixed);
  const value = await input.inputValue();
  expect(value.length).toBeLessThanOrEqual(160);
  expect(value).toContain('شركة-alpha-٢٠٢٦');
}

test('long mixed company/person search is bounded and never creates layout overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const errors = await openPreview(page);
  const longMixed = `${'شركة-ALPHA-٢٠٢٦-'.repeat(30)} بغداد Baghdad 12345`;
  const companySearch = page.getByRole('textbox', { name: 'بحث الشركات' });
  await assertBoundedNormalizedSearch(companySearch, longMixed);
  const peopleSearch = page.locator('.r2-contacts-directory input').first();
  await assertBoundedNormalizedSearch(peopleSearch, longMixed);
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
  await assertTouchTargets(page);
});

test('repeated company and people filter pressure stays deterministic', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPreview(page);
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: /نشطة/ }).first().click();
    await page.getByRole('button', { name: /الكل/ }).first().click();
    await page.getByRole('button', { name: /المحامون/ }).click();
    await page.locator('.r2-contacts-filters').getByRole('button', { name: /الكل/ }).click();
  }
  await expect(page.locator('[data-entity360-kind="company"]')).toBeVisible();
  await expect(page.locator('[data-entity360-kind="contact"]')).toBeVisible();
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

test('relationship end remains historical after destructive interaction', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  const errors = await openPreview(page);
  const contact = page.locator('[data-contact-profile]');
  await expect(contact.getByText('محامية · حالية', { exact: true })).toBeVisible();
  await contact.getByRole('button', { name: 'إنهاء العلاقة' }).click();
  const endedStatus = contact.getByText('محامية · منتهية', { exact: true });
  await expect(endedStatus).toBeVisible();
  await expect(endedStatus.locator('..')).toContainText('قمر السلطان');
  expect(errors).toEqual([]);
  await assertNoHorizontalOverflow(page);
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`companies people destruction survives ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    const errors = await openPreview(page);
    const text = await page.locator('[data-phase6-3-preview="true"]').innerText();
    expect(text).not.toMatch(/\b(?:NaN|undefined)\b/);
    expect(errors).toEqual([]);
    await assertNoHorizontalOverflow(page);
    if (width <= 430) await assertTouchTargets(page);
  });
}
