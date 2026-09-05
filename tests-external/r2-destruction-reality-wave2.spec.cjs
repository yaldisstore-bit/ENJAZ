const path = require('node:path');
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_DESTRUCTION_BASE_URL || 'http://127.0.0.1:4176/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_DESTRUCTION_ARTIFACT_DIR || 'artifacts/r2-destruction-reality');
fs.mkdirSync(artifactDir, { recursive: true });

const WAVE2_SCENARIOS = Object.freeze([
  'search modal focus containment',
  'account modal focus containment and restoration',
  'repeated overlay ownership stress',
  'tiny-height bottom navigation clearance',
  '360 extreme content across all tabs',
  'malformed transaction deep links fail safely',
  'rapid search-open navigation back restoration',
  'focus visibility after narrow navigation',
]);

if (WAVE2_SCENARIOS.length !== 8) throw new Error(`R2.0-9 wave 2 must keep 8 declared scenarios, found ${WAVE2_SCENARIOS.length}`);

async function gotoPreview(page, width = 390, height = 844, search = '') {
  await page.setViewportSize({ width, height });
  await page.goto(`${previewUrl}${search}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
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

async function expectFocusInside(page, overlaySelector) {
  const inside = await page.evaluate((selector) => {
    const overlay = document.querySelector(selector);
    return Boolean(overlay && document.activeElement && overlay.contains(document.activeElement));
  }, overlaySelector);
  expect(inside).toBe(true);
}

test('R2.0-9 wave2 search modal keeps keyboard focus contained', async ({ page }) => {
  await gotoPreview(page, 390, 844);
  const opener = page.getByRole('button', { name: 'ابحث عن أي شيء' }).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const overlay = page.locator('[data-overlay="search"]');
  await expect(overlay).toBeVisible();
  await expectFocusInside(page, '[data-overlay="search"]');

  for (let index = 0; index < 28; index += 1) {
    await page.keyboard.press('Tab');
    await expectFocusInside(page, '[data-overlay="search"]');
  }

  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('R2.0-9 wave2 account modal traps focus and restores its opener', async ({ page }) => {
  await gotoPreview(page, 390, 844);
  const opener = page.getByRole('button', { name: 'الحساب ومساحة العمل' }).first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const overlay = page.locator('[data-overlay="account"]');
  await expect(overlay).toBeVisible();
  await expectFocusInside(page, '[data-overlay="account"]');

  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press(index % 5 === 0 ? 'Shift+Tab' : 'Tab');
    await expectFocusInside(page, '[data-overlay="account"]');
  }

  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('R2.0-9 wave2 repeated overlay ownership never stacks dialogs', async ({ page }) => {
  await gotoPreview(page, 390, 844);
  for (let round = 0; round < 12; round += 1) {
    await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
    await expect(page.locator('.r2-overlay')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.r2-overlay')).toHaveCount(0);

    await page.getByRole('button', { name: 'الحساب ومساحة العمل' }).first().click();
    await expect(page.locator('.r2-overlay')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.r2-overlay')).toHaveCount(0);
  }
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 wave2 tiny-height viewport can reach final More action above bottom navigation', async ({ page }) => {
  await gotoPreview(page, 320, 568, '?dest=more');
  const lastRow = page.locator('.r2-launcher-row').last();
  const nav = page.locator('.r2-shell__mobile-nav');
  await expect(lastRow).toBeVisible();
  await expect(nav).toBeVisible();
  await lastRow.scrollIntoViewIfNeeded();
  const rowBox = await lastRow.boundingBox();
  const navBox = await nav.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(rowBox.y).toBeGreaterThanOrEqual(-1);
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(navBox.y + 1);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(artifactDir, 'wave2-tiny-height-more-320x568.png'), fullPage: false });
});

test('R2.0-9 wave2 transaction 360 contains extreme real copy across every tab', async ({ page }) => {
  await gotoPreview(page, 320, 700, '?dest=transactions.detail&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
  const root = page.locator('[data-core-work="transaction-360"]');
  await expect(root).toBeVisible();
  const longToken = `بغداد_${'UNBROKENIDENTIFIER'.repeat(55)}_نهاية`;

  for (const label of ['نظرة عامة', 'النشاط', 'المتابعات', 'الوثائق', 'المالية']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    const candidate = root.locator('main p, main small, main strong, main h2, main h3').filter({ visible: true }).first();
    await expect(candidate).toBeVisible();
    await candidate.evaluate((node, text) => { node.textContent = text; }, longToken);
    await assertNoHorizontalOverflow(page);
    const containment = await candidate.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    expect(containment.scroll).toBeLessThanOrEqual(containment.client + 1);
  }
});

test('R2.0-9 wave2 malformed transaction deep links fail safely without crashing shell', async ({ page }) => {
  const cases = [
    '?dest=transactions.detail',
    '?dest=transactions.detail&tx=%20%20%20',
    '?dest=transactions.detail&tx=not-a-real-uuid-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '?dest=transactions.editor&tx=%00%00bad',
  ];
  for (const search of cases) {
    await gotoPreview(page, 390, 844, search);
    await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
    await expect(page.locator('.r2-location')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('TypeError');
    await expect(page.locator('body')).not.toContainText('Unhandled');
    await assertNoHorizontalOverflow(page);
  }
});

test('R2.0-9 wave2 rapid search navigation and Back repeatedly restore query context', async ({ page }) => {
  await gotoPreview(page, 390, 844);
  for (const query of ['خزنة', 'أتمــتة', 'مالية', 'محامي', 'شركة']) {
    await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
    const input = page.locator('[data-overlay="search"] input').first();
    await input.fill(query);
    const result = page.locator('.r2-search-result').first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.locator('[data-overlay="search"]')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('[data-overlay="search"]')).toBeVisible();
    await expect(page.locator('[data-overlay="search"] input').first()).toHaveValue(query);
    await page.keyboard.press('Escape');
  }
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 wave2 keyboard navigation retains visible focus at 320px', async ({ page }) => {
  await gotoPreview(page, 320, 700);
  await page.keyboard.press('Tab');
  for (let index = 0; index < 18; index += 1) {
    const focus = await page.evaluate(() => {
      const node = document.activeElement;
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        tag: node.tagName,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        visible: style.visibility !== 'hidden' && style.display !== 'none',
      };
    });
    expect(focus).not.toBeNull();
    expect(focus.visible).toBe(true);
    expect(focus.right).toBeGreaterThanOrEqual(0);
    expect(focus.left).toBeLessThanOrEqual(320);
    await page.keyboard.press('Tab');
  }
  await assertNoHorizontalOverflow(page);
});
