const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const baseURL = process.env.R2_PHASE112_BASE_URL || 'http://127.0.0.1:4192/';
const path = 'phase11-2-universal-inbox-browser.html';
const evidenceDir = 'artifacts/phase11-2-universal-inbox';

fs.mkdirSync(evidenceDir, { recursive: true });

async function openInbox(page, width, height) {
  await page.setViewportSize({ width, height });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
  await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-phase11-2-universal-inbox="live"]')).toBeVisible();
  return errors;
}

test('Universal Inbox composes authoritative work with notification attention without duplication', async ({ page }) => {
  const errors = await openInbox(page, 430, 932);
  const rows = page.locator('.r2-core-work-row');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('[data-universal-inbox-attention="true"]')).toHaveCount(1);
  await expect(page.locator('[data-universal-inbox-attention="false"]')).toHaveCount(1);
  await expect(page.locator('[data-universal-inbox-unread="true"]')).toHaveCount(1);
  await expect(page.getByText('متابعة توقيع العقد والوثائق النهائية', { exact: true })).toHaveCount(1);
  await expect(page.getByText('عائق حرج يحتاج مراجعة المستند الأصلي', { exact: true })).toHaveCount(1);
  await expect(page.getByText(/تنبيه جديد/)).toHaveCount(1);
  await expect(page.locator('[data-inbox-attention-priority="high"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Universal Inbox filters source-owned work without manufacturing notification rows', async ({ page }) => {
  const errors = await openInbox(page, 390, 844);
  await page.getByRole('button', { name: 'بحاجة إجراء', exact: true }).click();
  const rows = page.locator('.r2-core-work-row');
  await expect(rows).toHaveCount(1);
  await expect(page.getByText('عائق حرج يحتاج مراجعة المستند الأصلي', { exact: true })).toBeVisible();
  await expect(page.getByText('متابعة توقيع العقد والوثائق النهائية', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Universal Inbox remains RTL and overflow-safe through 320px', async ({ page }) => {
  for (const [width, height] of [[1280, 900], [430, 932], [390, 844], [360, 740], [320, 700]]) {
    const errors = await openInbox(page, width, height);
    const metrics = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(metrics.dir).toBe('rtl');
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    await expect(page.locator('[data-universal-inbox-attention="true"]')).toHaveCount(1);
    const attention = await page.locator('[data-inbox-attention-priority="high"]').boundingBox();
    expect(attention).not.toBeNull();
    expect(attention.x).toBeGreaterThanOrEqual(0);
    expect(attention.x + attention.width).toBeLessThanOrEqual(width + 1);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `${evidenceDir}/universal-inbox-${width}.png`, fullPage: true });
  }
});
