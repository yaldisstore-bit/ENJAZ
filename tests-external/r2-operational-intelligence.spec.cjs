const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_OPERATIONAL_BASE_URL || 'http://127.0.0.1:4174/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_OPERATIONAL_ARTIFACT_DIR || 'artifacts/r2-operational');
fs.mkdirSync(artifactDir, { recursive: true });

const destinations = ['finance', 'operations', 'workflow', 'automation', 'command', 'risk', 'copilot'];

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(page, selector) {
  const sizes = await page.locator(selector).evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      return style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
      disabled: 'disabled' in node ? node.disabled : false,
    })));
  for (const size of sizes) {
    if (size.disabled) continue;
    expect(size.height).toBeGreaterThanOrEqual(43.5);
    expect(size.width).toBeGreaterThanOrEqual(43.5);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
}

async function open(page, destination, width = 390) {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
  await page.goto(`${previewUrl}?dest=${destination}`, { waitUntil: 'networkidle' });
  await expect(page.locator(`[data-operational-domain="${destination}"]`)).toBeVisible();
  await expect(page.locator('[data-operational-stage="R2.0-7"]')).toBeVisible();
}

test('R2.0-7 gives each operational domain its own task grammar', async ({ page }) => {
  const expectations = {
    finance: 'دفتر اليوم',
    operations: 'ما يحتاج حركة الآن',
    workflow: 'مراحل سير العمل',
    automation: 'مشغّل',
    command: 'قرار اليوم',
    risk: 'لماذا ظهرت؟',
    copilot: 'السياق الحالي',
  };
  for (const destination of destinations) {
    await open(page, destination);
    await expect(page.getByText(expectations[destination], { exact: false }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
  await shot(page, 'operational-seven-grammars-390');
});

test('R2.0-7 preview remains explicit about truthfulness and no fake AI execution', async ({ page }) => {
  await open(page, 'copilot');
  await expect(page.getByText('لا يدّعي استدعاء نموذج', { exact: false })).toBeVisible();
  await expect(page.getByText('لا تدّعي بيانات إنتاج', { exact: false })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'رسالة إلى مساعد إنجاز' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'إرسال' })).toBeDisabled();
  await open(page, 'finance');
  await expect(page.getByText('عينة بصرية فقط')).toBeVisible();
  await expect(page.getByText('لا تدّعي بيانات إنتاج', { exact: false })).toBeVisible();
  await shot(page, 'operational-truthfulness-390');
});

test('R2.0-7 workflow uses intentional local lane scrolling without page overflow', async ({ page }) => {
  await open(page, 'workflow', 320);
  const laneGeometry = await page.locator('.r2-workflow-lanes').evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
    overflowX: getComputedStyle(node).overflowX,
  }));
  expect(laneGeometry.scroll).toBeGreaterThan(laneGeometry.client);
  expect(['auto', 'scroll']).toContain(laneGeometry.overflowX);
  await assertNoHorizontalOverflow(page);
  await shot(page, 'workflow-320');
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-7 operational workspaces are overflow-safe at ${width}px`, async ({ page }) => {
    for (const destination of destinations) {
      await open(page, destination, width);
      await assertNoHorizontalOverflow(page);
    }
    if (width <= 430) {
      await assertTouchTargets(page, '.r2-shell__mobile-nav button');
      await open(page, 'risk', width);
      await assertTouchTargets(page, '.r2-risk-node');
    }
    await open(page, width === 320 ? 'risk' : 'command', width);
    await shot(page, `operational-${width}`);
  });
}
