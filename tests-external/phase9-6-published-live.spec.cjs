const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://yaldisstore-bit.github.io/ENJAZ/';
const LIVE_APP_URL = process.env.LIVE_APP_URL || new URL('live/', BASE_URL).toString();
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 320, height: 720 },
];

async function crawlDeployedJavascript(request, seedUrls) {
  const queue = [...seedUrls];
  const seen = new Set();
  const bodies = [];
  while (queue.length && seen.size < 40) {
    const assetUrl = queue.shift();
    if (!assetUrl || seen.has(assetUrl)) continue;
    seen.add(assetUrl);
    const asset = await request.get(assetUrl);
    expect(asset.status(), `deployed asset ${assetUrl}`).toBeLessThan(400);
    const body = await asset.text();
    bodies.push(body);
    for (const match of body.matchAll(/(?:\.\/|\/ENJAZ\/live\/assets\/)[A-Za-z0-9_.-]+\.js/g)) {
      const next = new URL(match[0], assetUrl).toString();
      if (new URL(next).pathname.includes('/ENJAZ/live/assets/') && !seen.has(next)) queue.push(next);
    }
  }
  return { javascript: bodies.join('\n'), assetCount: seen.size };
}

function observeRuntime(page) {
  const diagnostics = { consoleErrors: [], pageErrors: [], failedResponses: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    diagnostics.consoleErrors.push({ text: message.text(), url: message.location()?.url || '' });
  });
  page.on('pageerror', (error) => diagnostics.pageErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    diagnostics.failedResponses.push({
      status: response.status(),
      url: response.url(),
      resourceType: response.request().resourceType(),
    });
  });
  return diagnostics;
}

function assertOnlyExpectedPagesDocument404(diagnostics, expectedPathname, label) {
  const expectedFallbackResponses = diagnostics.failedResponses.filter((item) => {
    let pathname = '';
    try { pathname = new URL(item.url).pathname; } catch {}
    return item.status === 404 && item.resourceType === 'document' && pathname === expectedPathname;
  });
  const unexpectedResponses = diagnostics.failedResponses.filter((item) => !expectedFallbackResponses.includes(item));
  expect(unexpectedResponses, `${label}: no asset/API/resource failures are allowed`).toEqual([]);

  const unexpectedConsoleErrors = diagnostics.consoleErrors.filter((item) => {
    const isTransport404 = item.text.includes('Failed to load resource') && item.text.includes('404');
    if (!isTransport404) return true;
    if (!item.url) return false;
    try { return new URL(item.url).pathname !== expectedPathname; } catch { return true; }
  });
  expect(unexpectedConsoleErrors, `${label}: no console errors beyond the expected GitHub Pages document 404`).toEqual([]);
  expect(diagnostics.consoleErrors.length, `${label}: allowed console 404s must map to the document fallback`).toBeLessThanOrEqual(expectedFallbackResponses.length);
  expect(diagnostics.pageErrors, `${label}: no uncaught page errors`).toEqual([]);
}

function processUrl() {
  const url = new URL('app/insights', LIVE_APP_URL);
  url.searchParams.set('view', 'process');
  return url;
}

test('published /live/app/insights?view=process keeps the Phase 9.6 runtime graph behind auth', async ({ page, request }) => {
  const diagnostics = observeRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const target = processUrl();
  const response = await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 30_000 });

  expect(response, 'Phase 9.6 published deep-link response').not.toBeNull();
  expect([200, 404], 'GitHub Pages may execute the SPA 404 fallback for the deep-link').toContain(response.status());
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
  await expect(page.locator('[data-phase9-6-runtime="process-intelligence"]')).toHaveCount(0);

  const current = new URL(page.url());
  expect(current.pathname, 'process pathname remains canonical').toBe(target.pathname);
  expect(current.searchParams.get('view'), 'process view survives bootstrap').toBe('process');
  expect(current.searchParams.get('dest'), 'canonical path resolves to insights destination').toBe('insights');

  const deployedAssets = await page.locator('script[src], link[rel="modulepreload"][href]').evaluateAll((nodes) => Array.from(new Set(nodes.map((node) => node.src || node.href).filter(Boolean))));
  expect(deployedAssets.length, 'published app exposes deployed JavaScript assets').toBeGreaterThan(0);
  const deployed = await crawlDeployedJavascript(request, deployedAssets);
  expect(deployed.assetCount, 'published Phase 9.6 graph includes startup and lazy chunks').toBeGreaterThan(4);
  expect(deployed.javascript, 'published graph contains the Phase 9.6 process center contract').toContain('data-phase9-6-runtime');
  expect(deployed.javascript, 'published graph contains process runtime identity').toContain('process-intelligence');
  expect(deployed.javascript, 'published graph contains empirical next-activity method').toContain('empirical_next_activity_frequency');
  expect(deployed.javascript, 'published graph contains empirical delay method').toContain('empirical_wait_threshold_frequency');
  expect(deployed.javascript, 'published graph preserves actor-scoped sync-receipt integrity policy').toContain('actor_scoped_integrity_evidence_not_path_input');
  expect(deployed.javascript, 'published graph contains the Arabic process center').toContain('ذكاء العمليات');

  assertOnlyExpectedPagesDocument404(diagnostics, target.pathname, 'Phase 9.6 published process contract');
});

for (const viewport of VIEWPORTS) {
  test(`published /live/app/insights?view=process survives direct load and reload at ${viewport.width}px`, async ({ page }) => {
    const diagnostics = observeRuntime(page);
    await page.setViewportSize(viewport);
    const target = processUrl();

    const response = await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response.status());
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();

    const before = new URL(page.url());
    expect(before.pathname).toBe(target.pathname);
    expect(before.searchParams.get('view')).toBe('process');
    expect(before.searchParams.get('dest')).toBe('insights');
    const overflowBefore = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflowBefore.document, `document overflow before reload at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflowBefore.body, `body overflow before reload at ${viewport.width}px`).toBeLessThanOrEqual(1);

    const reloadResponse = await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    expect(reloadResponse).not.toBeNull();
    expect([200, 404]).toContain(reloadResponse.status());
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();

    const after = new URL(page.url());
    expect(after.pathname).toBe(target.pathname);
    expect(after.searchParams.get('view')).toBe('process');
    expect(after.searchParams.get('dest')).toBe('insights');
    const overflowAfter = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflowAfter.document, `document overflow after reload at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflowAfter.body, `body overflow after reload at ${viewport.width}px`).toBeLessThanOrEqual(1);

    assertOnlyExpectedPagesDocument404(diagnostics, target.pathname, `Phase 9.6 published process ${viewport.width}px load/reload`);
  });
}
