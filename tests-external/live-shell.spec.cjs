const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const viewports = [
  { name: 'compact-android', width: 360, height: 800 },
  { name: 'standard-android', width: 390, height: 844 },
  { name: 'large-android', width: 412, height: 915 },
];

function collectErrors(page) {
  const errors = { console: [], page: [], responses: [] };
  page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', (error) => errors.page.push(String(error)));
  page.on('response', (response) => { if (response.status() >= 400) errors.responses.push(`${response.status()} ${response.url()}`); });
  return errors;
}

async function loadPublishedR2(page, errors, query = '') {
  const target = query ? new URL(query, BASE_URL).toString() : BASE_URL;
  const response = await page.goto(target, { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response, 'navigation response').not.toBeNull();
  expect(response.status(), 'page HTTP status').toBeLessThan(400);

  const shell = page.locator('[data-r2-shell="R2.0-3"]');
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-golden-stage', 'R2.0-4');
  await expect(shell).toHaveAttribute('data-core-work-stage', 'R2.0-5');
  await expect(shell).toHaveAttribute('data-records-stage', 'R2.0-6');
  await expect(shell).toHaveAttribute('data-operational-stage', 'R2.0-7');
  await expect(shell).toHaveAttribute('data-zero-lost-stage', 'R2.0-8');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-enjaz-ui="v2"]')).toHaveCount(0);
  await expect(page.locator('[data-r2-runtime-error="true"]')).toHaveCount(0);
  expect(errors.console, 'browser console errors').toEqual([]);
  expect(errors.page, 'uncaught page errors').toEqual([]);
}

async function assertZeroAxeViolations(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations, `${label}: zero WCAG A/AA violations`).toEqual([]);
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(geometry.html, `${label}: html has no horizontal overflow`).toBeLessThanOrEqual(1);
  expect(geometry.body, `${label}: body has no horizontal overflow`).toBeLessThanOrEqual(1);
}

async function assertMobileTargets(page, label) {
  const undersized = await page.locator('button:visible, a:visible, [role="button"]:visible').evaluateAll((nodes) => nodes
    .map((node) => ({
      label: node.getAttribute('aria-label') || node.textContent?.replace(/\s+/g, ' ').trim() || node.tagName,
      rect: node.getBoundingClientRect().toJSON(),
    }))
    .filter(({ rect }) => rect.width < 44 || rect.height < 44));
  expect(undersized, `${label}: all visible interactive targets meet 44px`).toEqual([]);
}

async function rect(locator, label) {
  const box = await locator.boundingBox();
  expect(box, `${label}: geometry exists`).not.toBeNull();
  return box;
}

test('published R2 Legacy-Zero shell survives real Android geometry, navigation and WCAG', async ({ page }) => {
  const errors = collectErrors(page);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadPublishedR2(page, errors);

    const topbar = page.locator('.r2-topbar');
    const dock = page.locator('.r2-shell__mobile-nav');
    const primary = dock.locator('[data-door="create"]');
    await expect(dock).toBeVisible();
    await expect(page.locator('.r2-shell__rail')).toBeHidden();
    await expect(dock.locator('[data-door]')).toHaveCount(5);

    const topBox = await rect(topbar, `${viewport.name}: topbar`);
    const dockBox = await rect(dock, `${viewport.name}: dock`);
    const primaryBox = await rect(primary, `${viewport.name}: primary action`);

    for (const [name, box] of [['topbar', topBox], ['dock', dockBox], ['primary', primaryBox]]) {
      expect(box.x, `${viewport.name}: ${name} left bound`).toBeGreaterThanOrEqual(-2);
      expect(box.x + box.width, `${viewport.name}: ${name} right bound`).toBeLessThanOrEqual(viewport.width + 2);
      expect(box.y + box.height, `${viewport.name}: ${name} bottom bound`).toBeLessThanOrEqual(viewport.height + 2);
    }

    const primaryCenter = primaryBox.x + primaryBox.width / 2;
    const dockCenter = dockBox.x + dockBox.width / 2;
    expect(Math.abs(primaryCenter - dockCenter), `${viewport.name}: primary action stays centered`).toBeLessThanOrEqual(2.5);
    await assertNoHorizontalOverflow(page, viewport.name);
    await assertMobileTargets(page, viewport.name);

    for (const [door, screen] of [
      ['transactions', 'transactions'],
      ['today', 'today'],
      ['more', 'more'],
      ['home', 'home'],
    ]) {
      await dock.locator(`[data-door="${door}"]`).click();
      await expect(page.locator(`[data-screen="${screen}"]`)).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name}:${screen}`);
    }

    await assertZeroAxeViolations(page, `${viewport.name}:home`);
    expect(errors.responses, `${viewport.name}: no failed network resources`).toEqual([]);
    expect(errors.console, `${viewport.name}: no console errors`).toEqual([]);
    expect(errors.page, `${viewport.name}: no page errors`).toEqual([]);
  }
});

test('published R2 global overlays and operational destinations remain usable on mobile', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadPublishedR2(page, errors);

  await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
  const search = page.locator('[data-overlay="search"]');
  await expect(search).toBeVisible();
  const input = search.locator('input').first();
  await input.fill('عبارة لا تطابق أي سجل');
  await expect(search.locator('.r2-search-empty')).toBeVisible();
  await assertNoHorizontalOverflow(page, 'search overlay');
  await assertMobileTargets(page, 'search overlay');
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);

  await page.getByRole('button', { name: 'الحساب ومساحة العمل' }).click();
  const account = page.locator('[data-overlay="account"]');
  await expect(account).toBeVisible();
  await assertNoHorizontalOverflow(page, 'account overlay');
  await assertMobileTargets(page, 'account overlay');
  await page.keyboard.press('Escape');
  await expect(account).toHaveCount(0);

  const dock = page.locator('.r2-shell__mobile-nav');
  await dock.locator('[data-door="more"]').click();
  await expect(page.locator('[data-screen="more"]')).toBeVisible();
  await page.getByRole('button', { name: /مركز العمليات/ }).click();
  await expect(page.locator('[data-operational-domain="operations"]')).toBeVisible();
  await assertNoHorizontalOverflow(page, 'operations destination');
  await assertZeroAxeViolations(page, 'operations destination');

  expect(errors.responses, 'overlays/destinations: no failed network resources').toEqual([]);
  expect(errors.console, 'overlays/destinations: no console errors').toEqual([]);
  expect(errors.page, 'overlays/destinations: no page errors').toEqual([]);
});

test('published Phase 9.1 Smart Risk route is real and read-only', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadPublishedR2(page, errors, '?dest=risk');

  const risk = page.locator('[data-operational-domain="risk"][data-risk-stage="9.1"]');
  await expect(risk).toBeVisible();
  await expect(risk).toHaveAttribute('data-risk-authority', 'read_only_derived_intelligence');
  await expect(risk).toHaveAttribute('data-risk-write-authority', 'none');
  await expect(page.locator('[data-live-deferred="true"]')).toHaveCount(0);
  await expect(risk).toContainText('المخاطر والرؤى');
  await expect(risk).toContainText('لا توجد write authority داخل Smart Risk');
  await assertNoHorizontalOverflow(page, 'published Smart Risk');
  expect(errors.console, 'Smart Risk: no console errors').toEqual([]);
  expect(errors.page, 'Smart Risk: no page errors').toEqual([]);
});

test('published R2 reduced motion and resource budgets remain bounded', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await loadPublishedR2(page, errors);

  const motion = await page.locator('[data-r2-shell="R2.0-3"]').evaluate((root) => {
    const nodes = [root, ...root.querySelectorAll('*')];
    return nodes.reduce((max, node) => {
      const style = getComputedStyle(node);
      const parse = (value) => value.split(',').map((part) => part.trim()).map((part) => part.endsWith('ms') ? Number.parseFloat(part) : Number.parseFloat(part) * 1000).filter(Number.isFinite);
      return Math.max(max, ...parse(style.animationDuration), ...parse(style.transitionDuration), 0);
    }, 0);
  });
  expect(motion, 'reduced motion keeps animation effectively disabled').toBeLessThanOrEqual(20);

  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    size: entry.transferSize || entry.encodedBodySize || 0,
  })));
  const oversized = resources.filter((resource) => resource.size > 500 * 1024);
  const total = resources.reduce((sum, resource) => sum + resource.size, 0);
  expect(oversized, 'no resource over 500KB').toEqual([]);
  expect(total, 'network transfer budget').toBeLessThanOrEqual(3 * 1024 * 1024);
  expect(errors.responses, 'resource run: no failed network resources').toEqual([]);
  expect(errors.console, 'resource run: no console errors').toEqual([]);
  expect(errors.page, 'resource run: no page errors').toEqual([]);
});
