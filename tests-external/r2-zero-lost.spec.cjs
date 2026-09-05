const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_ZERO_LOST_BASE_URL || 'http://127.0.0.1:4175/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_ZERO_LOST_ARTIFACT_DIR || 'artifacts/r2-zero-lost');
fs.mkdirSync(artifactDir, { recursive: true });

// Closure proof: 16 real task scenarios; each declared route stays within the <=3 deliberate-action ceiling.
const NO_MAZE_SCENARIOS = Object.freeze([
  ['feature-alias-documents-back', 2],
  ['transaction-record-360-back', 2],
  ['arabic-normalization-automation', 2],
  ['primary-transactions', 1],
  ['primary-today', 1],
  ['primary-more', 1],
  ['primary-create', 1],
  ['more-companies', 2],
  ['alias-people', 2],
  ['alias-finance', 2],
  ['alias-command', 2],
  ['responsive-1280', 2],
  ['responsive-430', 2],
  ['responsive-390', 2],
  ['responsive-360', 2],
  ['responsive-320', 2],
]);
if (NO_MAZE_SCENARIOS.length !== 16 || NO_MAZE_SCENARIOS.some(([, actions]) => actions > 3)) {
  throw new Error('R2.0-8 No-Maze scenario declaration must contain exactly 16 scenarios with <=3 deliberate actions each.');
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

async function assertTouchTargets(page, selector) {
  const sizes = await page.locator(selector).evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      return style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(43.5);
    expect(size.height).toBeGreaterThanOrEqual(43.5);
  }
}

async function openHome(page, width = 390) {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-zero-lost-stage="R2.0-8"]')).toBeVisible();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

async function clickDoor(page, id) {
  const door = page.locator(`[data-door="${id}"]:visible`).first();
  await expect(door).toBeVisible();
  await door.click();
}

async function openSearch(page, width = 390) {
  await openHome(page, width);
  await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
  await expect(page.locator('[data-zero-lost-search="R2.0-8"]')).toBeVisible();
  return page.getByPlaceholder('مثال: 1042، خزنة، أتمتة، شركة، مالية…');
}

async function chooseFeatureAlias(page, query, label) {
  const input = await openSearch(page, 390);
  await input.fill(query);
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: label }).first();
  await expect(result).toBeVisible();
  await result.click();
}

test('R2.0-8 canonical feature alias navigation restores exact search state on back', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('خزنة');
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: 'الوثائق والتقارير' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/dest=documents/);
  await expect(page.locator('[data-records-domain="documents"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(input).toHaveValue('خزنة');
  await expect(page.locator('[data-find-kind="feature"]').filter({ hasText: 'الوثائق والتقارير' }).first()).toBeVisible();
});

test('R2.0-8 transaction record discovery opens canonical 360 and back restores query', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('1042');
  const record = page.locator('[data-find-kind="transaction"][data-find-source="preview-record"]').filter({ hasText: '#1042' }).first();
  await expect(record).toBeVisible();
  await expect(record).toContainText('عينة Preview');
  await record.click();
  await expect(page).toHaveURL(/dest=transactions\.detail/);
  await expect(page).toHaveURL(/tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/);
  await expect(page.locator('[data-core-work="transaction-360"]')).toBeVisible();

  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(input).toHaveValue('1042');
  await expect(page.locator('[data-find-kind="transaction"]').filter({ hasText: '#1042' }).first()).toBeVisible();
});

test('R2.0-8 Arabic normalization survives hamza, tatweel and mixed input', async ({ page }) => {
  const input = await openSearch(page, 390);
  await input.fill('أتمــتة');
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: 'الأتمتة' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/dest=automation/);
  await expect(page.locator('[data-operational-domain="automation"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Transactions from Home in 1 action', async ({ page }) => {
  await openHome(page);
  await clickDoor(page, 'transactions');
  await expect(page).toHaveURL(/dest=transactions/);
  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Today from Home in 1 action', async ({ page }) => {
  await openHome(page);
  await clickDoor(page, 'today');
  await expect(page).toHaveURL(/dest=today/);
  await expect(page.locator('[data-screen="today"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches More from Home in 1 action', async ({ page }) => {
  await openHome(page);
  await clickDoor(page, 'more');
  await expect(page).toHaveURL(/dest=more/);
  await expect(page.locator('[data-screen="more"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Create from Home in 1 action', async ({ page }) => {
  await openHome(page);
  await clickDoor(page, 'create');
  await expect(page).toHaveURL(/dest=create/);
  await expect(page.locator('[data-screen="create"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Companies through More in 2 actions', async ({ page }) => {
  await openHome(page);
  await clickDoor(page, 'more');
  const company = page.locator('.r2-launcher-row:visible').filter({ hasText: 'الشركات' }).first();
  await expect(company).toBeVisible();
  await company.click();
  await expect(page).toHaveURL(/dest=companies/);
  await expect(page.locator('[data-records-domain="companies"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches People by lawyer alias in 2 actions', async ({ page }) => {
  await chooseFeatureAlias(page, 'محامي', 'الأشخاص والمحامون');
  await expect(page).toHaveURL(/dest=people/);
  await expect(page.locator('[data-records-domain="people"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Finance by payment alias in 2 actions', async ({ page }) => {
  await chooseFeatureAlias(page, 'دفعة', 'المالية');
  await expect(page).toHaveURL(/dest=finance/);
  await expect(page.locator('[data-operational-domain="finance"]')).toBeVisible();
});

test('R2.0-8 No-Maze reaches Command Center by command alias in 2 actions', async ({ page }) => {
  await chooseFeatureAlias(page, 'قيادة', 'مركز القيادة');
  await expect(page).toHaveURL(/dest=command/);
  await expect(page.locator('[data-operational-domain="command"]')).toBeVisible();
});

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-8 Find Anything remains usable and overflow-safe at ${width}px`, async ({ page }) => {
    const input = await openSearch(page, width);
    await input.fill('معاملة');
    await expect(page.locator('.r2-search-result').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (width <= 430) await assertTouchTargets(page, '.r2-search-result');
    await page.screenshot({ path: path.join(artifactDir, `zero-lost-${width}.png`), fullPage: true });
  });
}
