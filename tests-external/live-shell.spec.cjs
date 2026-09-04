const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const viewports = [
  { name: 'compact-android', width: 360, height: 800 },
  { name: 'standard-android', width: 390, height: 844 },
  { name: 'large-android', width: 412, height: 915 },
];

async function loadClean(page, errors) {
  const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response, 'navigation response').not.toBeNull();
  expect(response.status(), 'page HTTP status').toBeLessThan(400);
  await expect(page.locator('[data-enjaz-ui="rebirth"]')).toBeVisible();
  expect(await page.locator('[data-enjaz-ui="rebirth"]').getAttribute('dir')).toBe('rtl');
  expect(errors.console, 'browser console errors').toEqual([]);
  expect(errors.page, 'uncaught page errors').toEqual([]);
}

function collectErrors(page) {
  const errors = { console: [], page: [], responses: [] };
  page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', (error) => errors.page.push(String(error)));
  page.on('response', (response) => { if (response.status() >= 400) errors.responses.push(`${response.status()} ${response.url()}`); });
  return errors;
}

async function assertZeroAxeViolations(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations, `${label}: zero WCAG A/AA violations`).toEqual([]);
}

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

test('ENJAZ shell survives real mobile-browser geometry and navigation', async ({ page }) => {
  const errors = collectErrors(page);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadClean(page, errors);

    const geometry = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      header: document.querySelector('.rebirth-shell__header')?.getBoundingClientRect().toJSON(),
      dock: document.querySelector('.rebirth-shell__dock')?.getBoundingClientRect().toJSON(),
      dockSurface: document.querySelector('.rebirth-shell__dock-surface')?.getBoundingClientRect().toJSON(),
      cta: document.querySelector('.rebirth-shell__primary-action')?.getBoundingClientRect().toJSON(),
      navItems: [...document.querySelectorAll('.rebirth-shell__nav-item')].map((node) => ({
        label: node.textContent?.trim() || '',
        rect: node.getBoundingClientRect().toJSON(),
      })),
    }));

    expect(geometry.scrollWidth, `${viewport.name}: no horizontal overflow`).toBeLessThanOrEqual(geometry.innerWidth + 1);
    for (const [name, rect] of Object.entries({ header: geometry.header, dock: geometry.dock, dockSurface: geometry.dockSurface, cta: geometry.cta })) {
      expect(rect, `${viewport.name}: ${name} exists`).toBeTruthy();
      expect(rect.left, `${viewport.name}: ${name} left bound`).toBeGreaterThanOrEqual(-1);
      expect(rect.right, `${viewport.name}: ${name} right bound`).toBeLessThanOrEqual(geometry.innerWidth + 1);
      expect(rect.bottom, `${viewport.name}: ${name} bottom bound`).toBeLessThanOrEqual(geometry.innerHeight + 1);
    }

    const ctaCenter = geometry.cta.left + geometry.cta.width / 2;
    const dockCenter = geometry.dockSurface.left + geometry.dockSurface.width / 2;
    expect(Math.abs(ctaCenter - dockCenter), `${viewport.name}: CTA is mathematically centered in dock`).toBeLessThanOrEqual(1.5);
    const overlaps = geometry.navItems
      .map(({ label, rect }) => ({ label, area: overlapArea(geometry.cta, rect) }))
      .filter(({ area }) => area > 0.5);
    expect(overlaps, `${viewport.name}: CTA does not intercept any navigation target`).toEqual([]);

    const undersized = await page.locator('button:visible').evaluateAll((buttons) => buttons
      .map((button) => ({ label: button.getAttribute('aria-label') || button.textContent?.trim(), rect: button.getBoundingClientRect().toJSON() }))
      .filter(({ rect }) => rect.width < 44 || rect.height < 44));
    expect(undersized, `${viewport.name}: all visible buttons meet 44px target`).toEqual([]);

    await expect(page.locator('.rebirth-home[data-home-ready="true"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'اعرف ما يحتاج قرارك، قبل أن يبدأ الزحام.' })).toBeVisible();

    const navCases = [
      ['اليوم', 'اليوم'],
      ['المعاملات', 'المعاملات'],
      ['المزيد', 'المزيد'],
    ];
    for (const [buttonName, heading] of navCases) {
      await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: buttonName }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' }).locator('[aria-current="page"]')).toHaveCount(1);
    }

    await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'الرئيسية' }).click();
    await expect(page.locator('.rebirth-home[data-home-ready="true"]')).toBeVisible();
    await assertZeroAxeViolations(page, viewport.name);
    expect(errors.responses, `${viewport.name}: no failed network resources`).toEqual([]);
    expect(errors.console, `${viewport.name}: no console errors`).toEqual([]);
    expect(errors.page, `${viewport.name}: no page errors`).toEqual([]);
  }
});

test('Home keeps the approved asymmetric hierarchy and remains usable above the dock', async ({ page }) => {
  const errors = collectErrors(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadClean(page, errors);

    const hero = page.locator('.rebirth-home__hero');
    const score = page.locator('.rebirth-home__hero-score');
    const stats = page.locator('.rebirth-home__hero-stats');
    const priorities = page.locator('.rebirth-home__priority-card');
    const finance = page.locator('.rebirth-home__finance');

    await expect(hero).toBeVisible();
    await expect(score).toBeVisible();
    await expect(stats).toBeVisible();
    await expect(priorities).toHaveCount(4);
    await expect(finance).toBeVisible();

    const visual = await page.evaluate(() => {
      const heroNode = document.querySelector('.rebirth-home__hero');
      const first = document.querySelector('.rebirth-home__priority-card[data-rank="1"]');
      const second = document.querySelector('.rebirth-home__priority-card[data-rank="2"]');
      const financeNode = document.querySelector('.rebirth-home__finance');
      const color = (node) => node ? getComputedStyle(node).backgroundColor : '';
      return {
        hero: heroNode?.getBoundingClientRect().toJSON(),
        first: first?.getBoundingClientRect().toJSON(),
        second: second?.getBoundingClientRect().toJSON(),
        heroBackground: heroNode ? getComputedStyle(heroNode).backgroundImage : '',
        financeBackground: color(financeNode),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    expect(visual.scrollWidth, `${viewport.name}: Home has no horizontal overflow`).toBeLessThanOrEqual(visual.innerWidth + 1);
    expect(visual.heroBackground, `${viewport.name}: Home hero is visibly composed, not flat`).toContain('gradient');
    expect(visual.first.width, `${viewport.name}: rank 1 priority dominates rank 2 width`).toBeGreaterThan(visual.second.width * 1.55);
    expect(visual.financeBackground, `${viewport.name}: finance block is not transparent`).not.toBe('rgba(0, 0, 0, 0)');

    const dominantCard = page.locator('.rebirth-home__priority-card[data-rank="1"]');
    await dominantCard.click();
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'المعاملات' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('المعاملات');

    await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'الرئيسية' }).click();
    await page.getByRole('button', { name: /افتح عمل اليوم/ }).click();
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'اليوم' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name: 'الرئيسية' }).click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(50);
    const bottomGeometry = await page.evaluate(() => ({
      closing: document.querySelector('.rebirth-home__closing')?.getBoundingClientRect().toJSON(),
      dock: document.querySelector('.rebirth-shell__dock')?.getBoundingClientRect().toJSON(),
    }));
    expect(bottomGeometry.closing.bottom, `${viewport.name}: final Home action clears fixed dock`).toBeLessThanOrEqual(bottomGeometry.dock.top + 1);

    await assertZeroAxeViolations(page, `${viewport.name}-home`);
    expect(errors.responses, `${viewport.name}: no failed network resources`).toEqual([]);
    expect(errors.console, `${viewport.name}: no console errors`).toEqual([]);
    expect(errors.page, `${viewport.name}: no page errors`).toEqual([]);
  }
});

test('quick actions behaves as a real modal with trapped and restored focus', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadClean(page, errors);

  const trigger = page.locator('.rebirth-shell__primary-action');
  await expect(trigger).toHaveCount(1);
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'ماذا تريد أن تنجز؟' });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'إغلاق' })).toBeFocused();
  await expect(page.locator('.rebirth-shell__header')).toHaveAttribute('inert', '');
  await expect(page.locator('.rebirth-shell__viewport')).toHaveAttribute('inert', '');
  await expect(page.locator('.rebirth-shell__dock')).toHaveAttribute('inert', '');
  await assertZeroAxeViolations(page, 'quick-actions-open');

  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press(i % 4 === 0 ? 'Shift+Tab' : 'Tab');
    const insideDialog = await page.evaluate(() => {
      const dialogNode = document.querySelector('[role="dialog"]');
      return Boolean(dialogNode && document.activeElement && dialogNode.contains(document.activeElement));
    });
    expect(insideDialog, `focus iteration ${i} remains trapped`).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[inert]')).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'ماذا تريد أن تنجز؟' })).toBeVisible();
  const animationMs = await page.locator('.rebirth-shell__quick-sheet').evaluate((node) => {
    const value = getComputedStyle(node).animationDuration.trim();
    if (value.endsWith('ms')) return Number.parseFloat(value);
    if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
    return 0;
  });
  expect(animationMs, 'reduced motion keeps animation effectively disabled').toBeLessThanOrEqual(20);

  expect(errors.console).toEqual([]);
  expect(errors.page).toEqual([]);
  expect(errors.responses).toEqual([]);
});

test('live runtime stays lightweight and semantically coherent', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadClean(page, errors);

  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="التنقل الرئيسي"]')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.rebirth-home__hero')).toHaveCount(1);
  await expect(page.locator('.rebirth-home__finance')).toHaveCount(1);

  const resourceStats = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return {
      count: entries.length,
      transferred: entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      giant: entries.filter((entry) => (entry.encodedBodySize || 0) > 500_000).map((entry) => ({ name: entry.name, size: entry.encodedBodySize })),
    };
  });
  expect(resourceStats.count, 'resource count budget').toBeLessThanOrEqual(30);
  expect(resourceStats.giant, 'no resource over 500KB').toEqual([]);
  if (resourceStats.transferred > 0) expect(resourceStats.transferred, 'network transfer budget').toBeLessThanOrEqual(1_200_000);

  expect(errors.console, 'no console errors').toEqual([]);
  expect(errors.page, 'no page errors').toEqual([]);
  expect(errors.responses, 'no failed network resources').toEqual([]);
});
