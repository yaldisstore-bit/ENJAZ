const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHASE104_REPORTS_BASE_URL || 'http://127.0.0.1:4184/';
const previewUrl = new URL('phase7-4-preview.html', baseUrl).toString();

async function open(page, width, height) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  const root = page.locator('[data-phase10-4-browser-certificate="enabled"]');
  await expect(root).toBeVisible();
  await expect(root.locator('[data-phase10-4-report-pdf="governed"]')).toBeVisible();
  await expect(root.locator('[data-phase10-4-pdf-preflight="safe"]')).toBeVisible();
  return { root, errors };
}

async function noHorizontalEscape(page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport + 1);
}

test('governed server-PDF journey downloads only after safe preflight and exposes certificate', async ({ page }) => {
  const { root, errors } = await open(page, 430, 920);
  const fingerprint = (await root.getByTitle('بصمة التقرير').textContent()).trim();
  expect(fingerprint).toMatch(/^ENJAZ-FR-[0-9a-f]{16}$/);
  const downloadPromise = page.waitForEvent('download');
  await root.getByRole('button', { name: 'طباعة / PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`enjaz-finance-${fingerprint}.pdf`);
  const certificate = root.locator('[data-phase10-4-server-pdf="certified"]');
  await expect(certificate).toBeVisible();
  await expect(certificate).toContainText('3 صفحات');
  await expect(certificate).toContainText(fingerprint);
  await expect(certificate).toContainText('ENJAZ:REPORT:v1:');
  expect(errors).toEqual([]);
  await noHorizontalEscape(page);
});

for (const [width, height] of [[1280, 900], [430, 920], [390, 844], [360, 800], [320, 760]]) {
  test(`reports and PDF controls remain usable at ${width}px`, async ({ page }) => {
    const { root, errors } = await open(page, width, height);
    await expect(root.getByRole('heading', { name: 'التقارير المالية' })).toBeVisible();
    await expect(root.getByRole('button', { name: 'طباعة / PDF' })).toBeEnabled();
    await expect(root.getByRole('button', { name: 'CSV' })).toBeVisible();
    await expect(root.getByRole('button', { name: 'JSON' })).toBeVisible();
    await expect(root.locator('[data-pdf-ready="true"]')).toBeVisible();
    expect(errors).toEqual([]);
    await noHorizontalEscape(page);
  });
}

test('mobile print media hides controls and keeps report body printable without horizontal escape', async ({ page }) => {
  const { root, errors } = await open(page, 360, 800);
  await page.emulateMedia({ media: 'print' });
  await expect(root.locator('.r2-f74-actions')).toBeHidden();
  await expect(root.locator('[data-phase10-4-pdf-preflight="safe"]')).toBeHidden();
  await expect(root.locator('[data-pdf-ready="true"]')).toBeVisible();
  await expect(root.getByRole('heading', { name: 'حركة الفترة' })).toBeVisible();
  await expect(root.getByRole('heading', { name: 'الأرصدة الحالية' })).toBeVisible();
  const printGeometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    tables: [...document.querySelectorAll('.r2-f74-card table')].map(table => ({ width: table.getBoundingClientRect().width, parent: table.parentElement?.getBoundingClientRect().width || 0 })),
  }));
  for (const table of printGeometry.tables) expect(table.width).toBeLessThanOrEqual(table.parent + 1);
  expect(errors).toEqual([]);
});

test('scope changes invalidate prior server certificate before a new PDF is generated', async ({ page }) => {
  const { root, errors } = await open(page, 430, 920);
  const firstDownload = page.waitForEvent('download');
  await root.getByRole('button', { name: 'طباعة / PDF' }).click();
  await firstDownload;
  await expect(root.locator('[data-phase10-4-server-pdf="certified"]')).toBeVisible();
  await root.getByRole('combobox', { name: 'نوع التقرير', exact: true }).selectOption('company');
  await expect(root.locator('[data-phase10-4-server-pdf="certified"]')).toHaveCount(0);
  await expect(root.locator('[data-phase10-4-pdf-preflight="safe"]')).toBeVisible();
  expect(errors).toEqual([]);
});
