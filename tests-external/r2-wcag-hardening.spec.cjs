const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.R2_WCAG_BASE_URL || 'http://127.0.0.1:4178/';

function previewUrl(destination = 'home') {
  const url = new URL('r2-preview.html', BASE_URL);
  if (destination !== 'home') url.searchParams.set('dest', destination);
  return url.toString();
}

async function openSurface(page, destination, width, height = 844) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(previewUrl(destination), { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response, `${destination}: navigation response`).not.toBeNull();
  expect(response.status(), `${destination}: HTTP status`).toBeLessThan(400);
  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
  await expect(page.locator('[data-enjaz-ui="v2"]')).toHaveCount(0);
}

function writeAxeDiagnostics(label, violations) {
  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const outputDir = path.join(process.cwd(), 'test-results', 'wcag-diagnostics');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${safeLabel}.json`),
    JSON.stringify({ label, violationCount: violations.length, violations }, null, 2),
    'utf8',
  );
}

async function assertWcagAA(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  if (result.violations.length > 0) {
    writeAxeDiagnostics(label, result.violations);
    console.error(`[R2 WCAG] ${label}: ${result.violations.length} violation group(s)`);
    for (const violation of result.violations) {
      console.error(`[R2 WCAG] ${violation.id}: ${violation.help}`);
      for (const node of violation.nodes) {
        console.error(`[R2 WCAG] target=${JSON.stringify(node.target)} summary=${node.failureSummary || ''}`);
      }
    }
  }

  expect(result.violations, `${label}: WCAG A/AA violations`).toEqual([]);
}

async function assertFocusRowsAreFullyOpaque(page, label) {
  const opacities = await page.locator('.r2-focus-row').evaluateAll((rows) =>
    rows.map((row) => getComputedStyle(row).opacity),
  );
  expect(opacities.length, `${label}: focus rows exist`).toBeGreaterThan(0);
  expect(opacities, `${label}: actionable focus rows must not lose text contrast through parent opacity`)
    .toEqual(opacities.map(() => '1'));
}

for (const width of [360, 390, 1280]) {
  test(`R2 home is WCAG A/AA clean at ${width}px`, async ({ page }) => {
    await openSurface(page, 'home', width, width >= 960 ? 900 : 844);
    await assertFocusRowsAreFullyOpaque(page, `home:${width}`);
    await assertWcagAA(page, `home:${width}`);
  });
}

for (const destination of ['transactions', 'create']) {
  test(`R2 ${destination} core-work surface is WCAG A/AA clean`, async ({ page }) => {
    await openSurface(page, destination, 390);
    await assertWcagAA(page, destination);
  });
}

test('R2 operations surface is WCAG A/AA clean on mobile', async ({ page }) => {
  await openSurface(page, 'operations', 390);
  await expect(page.locator('[data-operational-domain="operations"]')).toBeVisible();
  await assertWcagAA(page, 'operations:390');
});
