const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.R2_DESTRUCTION_BASE_URL || 'http://127.0.0.1:4176/';
const previewUrl = new URL('r2-preview.html', baseUrl).toString();
const artifactDir = path.resolve(process.env.R2_DESTRUCTION_ARTIFACT_DIR || 'artifacts/r2-destruction-reality');
fs.mkdirSync(artifactDir, { recursive: true });

const DESTRUCTION_SCENARIOS = Object.freeze([
  'hard width 1280',
  'hard width 430',
  'hard width 390',
  'hard width 360',
  'hard width 320',
  'keyboard focus',
  'rtl',
  'mixed Arabic Latin numeric',
  'extreme long content',
  'dense launcher dataset',
  'empty transaction search',
  'invalid destination failure',
  'permission mutation truthfulness',
  'browser back stack',
  'direct deep links',
  'overlay layering',
  'landscape orientation',
  'reduced motion',
  '44px touch geometry',
  'horizontal overflow attack',
  'transaction 360 narrow reality',
  'rapid navigation history stability',
]);

if (DESTRUCTION_SCENARIOS.length < 15) throw new Error('minimum 15 destructive scenarios are required');
if (DESTRUCTION_SCENARIOS.length !== 22) throw new Error(`R2.0-9 first wave is pinned to 22 scenarios, found ${DESTRUCTION_SCENARIOS.length}`);

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(geometry.doc).toBeLessThanOrEqual(geometry.client + 1);
  expect(geometry.body).toBeLessThanOrEqual(geometry.client + 1);
}

async function assertTouchTargets(locator) {
  const sizes = await locator.evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    })
    .map((node) => ({
      text: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 60) || node.tagName,
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    })));
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) {
    expect(size.width, `${size.text} width`).toBeGreaterThanOrEqual(43.5);
    expect(size.height, `${size.text} height`).toBeGreaterThanOrEqual(43.5);
  }
}

function installMutationTrap(page) {
  const mutationRequests = [];
  page.on('request', (request) => {
    const method = request.method().toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) mutationRequests.push(`${method} ${request.url()}`);
  });
  return mutationRequests;
}

async function assertNoMutationRequests(mutationRequests) {
  expect(mutationRequests, `preview emitted forbidden mutation requests:\n${mutationRequests.join('\n')}`).toEqual([]);
}

async function gotoPreview(page, width = 390, search = '') {
  await page.setViewportSize({ width, height: width >= 800 ? 900 : 844 });
  await page.goto(`${previewUrl}${search}`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
  return page;
}

async function openSearch(page) {
  await page.getByRole('button', { name: 'ابحث عن أي شيء' }).first().click();
  const overlay = page.locator('[data-overlay="search"]');
  await expect(overlay).toBeVisible();
  return overlay.locator('input').first();
}

for (const width of [1280, 430, 390, 360, 320]) {
  test(`R2.0-9 hard-width destruction reality ${width}px`, async ({ page }) => {
    await gotoPreview(page, width);
    await assertNoHorizontalOverflow(page);

    if (width <= 430) {
      await expect(page.locator('.r2-shell__mobile-nav')).toBeVisible();
      await assertTouchTargets(page.locator('.r2-shell__mobile-nav [data-door]'));
    } else {
      await expect(page.locator('.r2-shell__rail')).toBeVisible();
    }

    await page.screenshot({ path: path.join(artifactDir, `hard-width-${width}.png`), fullPage: true });
  });
}

test('R2.0-9 keyboard and focus survive overlay ownership', async ({ page }) => {
  await gotoPreview(page, 390);
  const searchButton = page.getByRole('button', { name: 'ابحث عن أي شيء' }).first();
  await searchButton.focus();
  await expect(searchButton).toBeFocused();
  await page.keyboard.press('Enter');
  const overlay = page.locator('[data-overlay="search"]');
  await expect(overlay).toBeVisible();
  const input = overlay.locator('input').first();
  await expect(input).toBeFocused();
  await input.fill('خزنة');
  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
});

test('R2.0-9 RTL root remains first-class', async ({ page }) => {
  await gotoPreview(page, 390);
  const direction = await page.evaluate(() => ({
    documentDir: document.documentElement.getAttribute('dir'),
    shellDirection: getComputedStyle(document.querySelector('[data-r2-shell="R2.0-3"]')).direction,
  }));
  expect(direction.documentDir).toBe('rtl');
  expect(direction.shellDirection).toBe('rtl');
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 mixed Arabic Latin numeric search remains usable', async ({ page }) => {
  await gotoPreview(page, 320);
  const input = await openSearch(page);
  const query = 'شركة ABC-1042 معاملة 2026 / Baghdad';
  await input.fill(query);
  await expect(input).toHaveValue(query);
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 extreme long content does not create horizontal overflow', async ({ page }) => {
  await gotoPreview(page, 320, '?dest=transactions');
  const row = page.locator('.r2-core-record-row').first();
  await expect(row).toBeVisible();
  await row.locator('.r2-record-row__identity strong').evaluate((node) => {
    node.textContent = `شركة_${'اسم_طويل_جداً_'.repeat(28)}ABCDEF0123456789WITHOUTBREAKS`;
  });
  await row.locator('.r2-record-row__identity small').evaluate((node) => {
    node.textContent = `Baghdad-${'LONGUNBROKEN'.repeat(35)}-بغداد`;
  });
  await assertNoHorizontalOverflow(page);
  const box = await row.boundingBox();
  expect(box.width).toBeLessThanOrEqual(320 + 1);
});

test('R2.0-9 dense launcher stress remains bounded', async ({ page }) => {
  await gotoPreview(page, 320, '?dest=more');
  await expect(page.locator('.r2-launcher-row').first()).toBeVisible();
  await page.evaluate(() => {
    document.querySelectorAll('.r2-launcher-list').forEach((list) => {
      const originals = [...list.querySelectorAll('.r2-launcher-row')];
      for (let round = 0; round < 12; round += 1) {
        for (const original of originals) {
          const clone = original.cloneNode(true);
          clone.setAttribute('data-r2-density-clone', String(round));
          list.appendChild(clone);
        }
      }
    });
  });
  expect(await page.locator('[data-r2-density-clone]').count()).toBeGreaterThan(40);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(artifactDir, 'dense-launchers-320.png'), fullPage: true });
});

test('R2.0-9 empty transaction search is truthful', async ({ page }) => {
  await gotoPreview(page, 390, '?dest=transactions');
  const input = page.getByRole('textbox', { name: 'بحث المعاملات' });
  await input.fill('لا_توجد_معاملة_بهذا_الاسم_999999999');
  await expect(page.locator('.r2-core-empty')).toBeVisible();
  await expect(page.locator('.r2-core-empty')).toContainText('لا توجد معاملات مطابقة');
  await expect(page.locator('.r2-core-record-row')).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 invalid destination fails safely to Home', async ({ page }) => {
  await gotoPreview(page, 390, '?dest=definitely-invalid-destination&tx=%00broken');
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await expect(page.locator('.r2-location')).toContainText('الرئيسية');
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 preview emits no mutation network requests', async ({ page }) => {
  const mutations = installMutationTrap(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${previewUrl}?dest=today`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-core-work="today"]')).toBeVisible();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

  const complete = page.getByRole('button', { name: 'إكمال' }).first();
  if (await complete.count()) await complete.click();
  const snooze = page.getByRole('button', { name: 'تأجيل' }).first();
  if (await snooze.count()) await snooze.click();
  await page.waitForTimeout(120);

  await assertNoMutationRequests(mutations);
  const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  expect(storage).toEqual({ local: 0, session: 0 });
});

test('R2.0-9 browser Back restores the logical prior level', async ({ page }) => {
  await gotoPreview(page, 390);
  await page.locator('.r2-shell__mobile-nav [data-door="transactions"]').click();
  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
  const input = await openSearch(page);
  await input.fill('خزنة');
  const result = page.locator('[data-find-kind="feature"]').filter({ hasText: 'الوثائق والتقارير' }).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/dest=documents/);
  await page.goBack();
  await expect(page.locator('[data-overlay="search"]')).toBeVisible();
  await expect(page.locator('[data-overlay="search"] input').first()).toHaveValue('خزنة');
  await page.goBack();
  await expect(page.locator('[data-screen="transactions"]')).toBeVisible();
});

test('R2.0-9 direct deep links resolve without hidden navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [
    ['?dest=companies', '[data-records-domain="companies"]'],
    ['?dest=finance', '[data-operational-domain="finance"]'],
    ['?dest=automation', '[data-operational-domain="automation"]'],
    ['?dest=transactions.detail&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '[data-core-work="transaction-360"]'],
  ];
  for (const [search, selector] of cases) {
    await page.goto(`${previewUrl}${search}`, { waitUntil: 'networkidle' });
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator('.r2-location')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  }
});

test('R2.0-9 overlay layering remains inside viewport', async ({ page }) => {
  await gotoPreview(page, 320);
  await openSearch(page);
  const overlay = page.locator('[data-overlay="search"]');
  const panel = overlay.locator('section').first();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(321);
  expect(box.y).toBeLessThan(844);
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 landscape orientation remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(`${previewUrl}?dest=more`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
  const navigationVisible = await page.evaluate(() => [...document.querySelectorAll('.r2-shell__rail, .r2-shell__mobile-nav')]
    .some((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }));
  expect(navigationVisible).toBe(true);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(artifactDir, 'landscape-844x390.png'), fullPage: true });
});

test('R2.0-9 reduced motion settles without active animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoPreview(page, 390, '?dest=more');
  await page.waitForTimeout(120);
  const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
  expect(running).toBe(0);
  await page.locator('.r2-shell__mobile-nav [data-door="home"]').click();
  await page.waitForTimeout(120);
  const runningAfterNavigation = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
  expect(runningAfterNavigation).toBe(0);
  await assertNoHorizontalOverflow(page);
});

test('R2.0-9 all visible primary controls preserve 44px touch geometry', async ({ page }) => {
  await gotoPreview(page, 320);
  await assertTouchTargets(page.locator('.r2-shell__mobile-nav [data-door]'));
  await assertTouchTargets(page.getByRole('button', { name: 'ابحث عن أي شيء' }).first());
  await assertTouchTargets(page.getByRole('button', { name: 'الحساب ومساحة العمل' }).first());
  await page.locator('.r2-shell__mobile-nav [data-door="more"]').click();
  await assertTouchTargets(page.locator('.r2-launcher-row'));
});

test('R2.0-9 horizontal overflow attack remains contained', async ({ page }) => {
  await gotoPreview(page, 320, '?dest=more');
  const target = page.locator('.r2-section-heading .r2-supporting').first();
  await expect(target).toBeVisible();
  await target.evaluate((node) => {
    node.setAttribute('data-r2-overflow-attack', 'true');
    node.textContent = `عربي_${'X'.repeat(480)}_نهاية`;
  });
  await assertNoHorizontalOverflow(page);
  const containment = await target.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    parentWidth: node.parentElement?.clientWidth ?? 0,
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth + 1);
  expect(containment.clientWidth).toBeLessThanOrEqual(containment.parentWidth + 1);
});

test('R2.0-9 transaction 360 narrow reality survives every context tab', async ({ page }) => {
  await gotoPreview(page, 320, '?dest=transactions.detail&tx=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
  await expect(page.locator('[data-core-work="transaction-360"]')).toBeVisible();
  for (const label of ['نظرة عامة', 'النشاط', 'المتابعات', 'الوثائق', 'المالية']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await assertNoHorizontalOverflow(page);
  }
  await page.screenshot({ path: path.join(artifactDir, 'transaction-360-320.png'), fullPage: true });
});

test('R2.0-9 rapid navigation history stability does not corrupt shell state', async ({ page }) => {
  await gotoPreview(page, 390);
  const doors = ['transactions', 'today', 'more', 'home'];
  for (let round = 0; round < 8; round += 1) {
    for (const door of doors) {
      await page.locator(`.r2-shell__mobile-nav [data-door="${door}"]`).click();
      await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
    }
  }
  for (let i = 0; i < 8; i += 1) await page.goBack();
  await expect(page.locator('[data-r2-shell="R2.0-3"]')).toBeVisible();
  await expect(page.locator('.r2-location')).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
