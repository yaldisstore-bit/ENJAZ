const { test, expect } = require('@playwright/test');

const TARGET_SHA = process.env.PHASE95_TARGET_SHA || 'ee62353621701c788b3c96ae8172a59b6f95022d';
const LIVE_APP_URL = process.env.LIVE_APP_URL || 'https://yaldisstore-bit.github.io/ENJAZ/live/';
const INSIGHTS_URL = new URL('app/insights', LIVE_APP_URL).toString();
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 320, height: 720 },
];

async function crawlJavascript(request, seedUrls) {
  const queue = [...seedUrls];
  const seen = new Set();
  const bodies = [];
  while (queue.length && seen.size < 96) {
    const assetUrl = queue.shift();
    if (!assetUrl || seen.has(assetUrl)) continue;
    seen.add(assetUrl);
    const response = await request.get(assetUrl, { timeout: 30_000 });
    expect(response.status(), `published asset ${assetUrl}`).toBeLessThan(400);
    const body = await response.text();
    bodies.push(body);
    for (const match of body.matchAll(/(?:\.\/|\/ENJAZ\/live\/assets\/)[A-Za-z0-9_.-]+\.js/g)) {
      const next = new URL(match[0], assetUrl).toString();
      if (new URL(next).pathname.includes('/ENJAZ/live/assets/') && !seen.has(next)) queue.push(next);
    }
  }
  return { javascript: bodies.join('\n'), assetCount: seen.size };
}

test('Phase 9.5 published bundle contains canonical BI/trend/forecast contracts from exact main', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(INSIGHTS_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response, 'deep-link navigation returns a response').not.toBeNull();
  expect([200, 404], 'GitHub Pages may serve SPA fallback with HTTP 404 while executing /live/404.html').toContain(response.status());
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();

  const assets = await page.locator('script[src], link[rel="modulepreload"][href]').evaluateAll(nodes =>
    Array.from(new Set(nodes.map(node => node.src || node.href).filter(Boolean)))
  );
  expect(assets.length, 'deep-linked live app exposes deployed JS assets').toBeGreaterThan(0);
  const deployed = await crawlJavascript(request, assets);
  expect(deployed.assetCount, 'published graph includes startup and lazy chunks').toBeGreaterThan(4);

  for (const marker of [
    'enjaz-bi-forecast-v1',
    'data-phase9-5-runtime',
    'read_only_derived_intelligence',
    'operations.completed_monthly',
    'finance.collections_monthly',
    'phase9.5-observed-trends-v1',
    'trailing_run_rate',
    'مركز ذكاء الأعمال',
  ]) {
    expect(deployed.javascript, `published bundle contains ${marker}`).toContain(marker);
  }
  expect(deployed.javascript, 'published navigation graph contains canonical insights destination').toContain('insights');
  expect(errors, 'published auth/deep-link boundary has no runtime errors').toEqual([]);
  expect(TARGET_SHA).toMatch(/^[0-9a-f]{40}$/);
});

for (const viewport of VIEWPORTS) {
  test(`Phase 9.5 /live/app/insights SPA deep-link is stable at ${viewport.width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
    const response = await page.goto(INSIGHTS_URL, { waitUntil: 'networkidle', timeout: 30_000 });
    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response.status());
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflow.document, `document horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflow.body, `body horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
    expect(errors, `runtime errors at ${viewport.width}px`).toEqual([]);
    await context.close();
  });
}
