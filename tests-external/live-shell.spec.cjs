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

async function loadCanonical(page, errors) {
  const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response, 'navigation response').not.toBeNull();
  expect(response.status(), 'page HTTP status').toBeLessThan(400);
  const shell = page.locator('[data-enjaz-ui="v2"]');
  const app = page.locator('[data-core-app="true"]');
  await expect(shell).toBeVisible();
  await expect(app).toBeVisible();
  await expect(shell).toHaveAttribute('data-stage', 'ui-10');
  await expect(shell).toHaveAttribute('dir', 'rtl');
  await expect(app).toHaveAttribute('data-stage', 'ui-10');
  await expect(app).toHaveAttribute('data-product-phase', '4.3');
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

async function closeSheet(page) {
  const dialog = page.getByRole('dialog');
  const close = dialog.locator('.ez-sheet__close');
  await expect(close).toBeVisible();
  await close.click();
  await expect(dialog).toHaveCount(0);
}

test('canonical UI V2 shell survives real Android geometry, navigation and WCAG', async ({ page }) => {
  const errors = collectErrors(page);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadCanonical(page, errors);

    const topbar = page.locator('[data-shell-part="topbar"]');
    const dock = page.locator('[data-shell-part="bottom-dock"]');
    const primary = page.getByRole('button', { name: 'إجراء جديد', exact: true });
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

    const nav = page.getByRole('navigation', { name: 'التنقل الرئيسي' });
    for (const [buttonName, screen] of [
      ['اليوم', 'today'],
      ['العمليات', 'operations'],
      ['المالية', 'finance'],
      ['الرئيسية', 'home'],
    ]) {
      await nav.getByRole('button', { name: buttonName, exact: true }).click();
      await expect(page.locator(`[data-core-screen="${screen}"]`)).toBeVisible();
      await assertNoHorizontalOverflow(page, `${viewport.name}:${screen}`);
    }

    await assertZeroAxeViolations(page, `${viewport.name}:home`);
    expect(errors.responses, `${viewport.name}: no failed network resources`).toEqual([]);
    expect(errors.console, `${viewport.name}: no console errors`).toEqual([]);
    expect(errors.page, `${viewport.name}: no page errors`).toEqual([]);
  }
});

test('global overlays and domain explorer remain usable on mobile', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadCanonical(page, errors);

  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'البحث العام', exact: true });
  await expect(search).toBeVisible();
  await page.getByLabel('عبارة البحث').fill('عبارة لا تطابق أي سجل');
  await expect(page.locator('[data-state-kind="empty"]')).toBeVisible();
  await assertNoHorizontalOverflow(page, 'search overlay');
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);

  for (const [trigger, dialogName] of [
    ['الإشعارات', 'الإشعارات'],
    ['الحساب', 'الحساب ومساحة العمل'],
    ['إجراء جديد', 'إجراء جديد'],
  ]) {
    await page.getByRole('button', { name: trigger, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
    await expect(dialog).toBeVisible();
    await assertNoHorizontalOverflow(page, `${trigger} overlay`);
    await assertMobileTargets(page, `${trigger} overlay`);
    await closeSheet(page);
  }

  await page.getByRole('button', { name: 'مجالات إنجاز', exact: true }).click();
  const explorer = page.getByRole('dialog', { name: 'مجالات إنجاز', exact: true });
  await expect(explorer).toBeVisible();
  await expect(page.locator('[data-domain-explorer-link]')).toHaveCount(12);
  await assertZeroAxeViolations(page, 'domain explorer');
  await page.locator('[data-domain-explorer-link="transactions"]').click();
  await expect(page.locator('[data-domain-runtime="transactions"]')).toBeVisible();
  await expect(page.locator('[data-domain-rail="true"]')).toBeVisible();
  await assertNoHorizontalOverflow(page, 'transactions domain');
  await page.getByRole('button', { name: 'العودة للأساسية', exact: true }).click();
  await expect(page.locator('[data-core-screen="home"]')).toBeVisible();
  await expect(page.locator('[data-domain-rail="true"]')).toHaveCount(0);

  expect(errors.responses, 'overlays/domains: no failed network resources').toEqual([]);
  expect(errors.console, 'overlays/domains: no console errors').toEqual([]);
  expect(errors.page, 'overlays/domains: no page errors').toEqual([]);
});

test('reduced motion and production resource budgets remain bounded', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await loadCanonical(page, errors);

  const motion = await page.locator('[data-enjaz-ui="v2"]').evaluate((root) => {
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
