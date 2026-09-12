const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://yaldisstore-bit.github.io/ENJAZ/';
const LIVE_APP_URL = process.env.LIVE_APP_URL || new URL('live/', BASE_URL).toString();
const PHASE95_VIEWPORTS = [
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
  while (queue.length && seen.size < 32) {
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

test('published /live app keeps Smart Risk 9.1 and Corporate Governance 9.3 deployed behind the auth boundary', async ({ page, request }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.setViewportSize({ width: 390, height: 844 });
  const riskUrl = new URL(LIVE_APP_URL);
  riskUrl.searchParams.set('dest', 'risk');
  const response = await page.goto(riskUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });

  expect(response, 'live app navigation response').not.toBeNull();
  expect(response.status(), 'live app HTTP status').toBeLessThan(400);
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
  await expect(page.locator('[data-operational-domain="risk"]')).toHaveCount(0);
  await expect(page.locator('[data-phase9-3="governance"]')).toHaveCount(0);

  const riskTemplate = page.locator('template#enjaz-risk-template');
  await expect(riskTemplate, 'live app exposes the static Smart Risk contract').toHaveCount(1);
  const staticRiskContract = await riskTemplate.evaluate((template) => {
    const risk = template.content.querySelector('[data-operational-domain="risk"]');
    return {
      domain: risk?.getAttribute('data-operational-domain') || null,
      stage: risk?.getAttribute('data-risk-stage') || null,
      authority: risk?.getAttribute('data-risk-authority') || null,
      writeAuthority: risk?.getAttribute('data-risk-write-authority') || null,
      heading: risk?.querySelector('h1')?.textContent?.trim() || null,
      copy: risk?.textContent?.replace(/\s+/g, ' ').trim() || null,
    };
  });
  expect(staticRiskContract.domain, 'static risk contract domain').toBe('risk');
  expect(staticRiskContract.stage, 'static risk contract stage').toBe('9.1');
  expect(staticRiskContract.authority, 'static risk contract authority').toBe('read_only_derived_intelligence');
  expect(staticRiskContract.writeAuthority, 'static risk contract has no write authority').toBe('none');
  expect(staticRiskContract.heading, 'static risk contract title').toBe('المخاطر والرؤى');
  expect(staticRiskContract.copy, 'static risk contract explains no-write authority').toContain('لا توجد write authority داخل Smart Risk');

  const deployedAssets = await page.locator('script[src], link[rel="modulepreload"][href]').evaluateAll((nodes) => Array.from(new Set(nodes.map((node) => node.src || node.href).filter(Boolean))));
  expect(deployedAssets.length, 'live app exposes deployed JavaScript assets').toBeGreaterThan(0);

  const deployed = await crawlDeployedJavascript(request, deployedAssets);
  expect(deployed.assetCount, 'live asset graph includes startup and lazy chunks').toBeGreaterThan(3);
  expect(deployed.javascript, 'deployed /live bundle binds the static Smart Risk template').toContain('enjaz-risk-template');
  expect(deployed.javascript, 'deployed /live bundle contains Smart Risk engine identity').toContain('smart-risk-v1');
  expect(deployed.javascript, 'deployed lazy graph contains Phase 9.3 governance surface').toContain('data-phase9-3');
  expect(deployed.javascript, 'deployed lazy graph contains the Phase 9.3 governance context contract').toContain('enjaz.governance-context.v1');
  expect(deployed.javascript, 'deployed lazy graph contains the Arabic governance cockpit').toContain('مركز حوكمة الشركة');

  expect(consoleErrors, 'live auth boundary has no console errors').toEqual([]);
  expect(pageErrors, 'live auth boundary has no uncaught page errors').toEqual([]);
});

test('published canonical /live/app/insights deep-link resolves to the Phase 9.5 bundle behind auth', async ({ page, request }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.setViewportSize({ width: 390, height: 844 });
  const insightsUrl = new URL('app/insights', LIVE_APP_URL);
  const response = await page.goto(insightsUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });

  expect(response, 'canonical insights deep-link response').not.toBeNull();
  expect([200, 404], 'GitHub Pages may execute the root 404 fallback for SPA deep-links').toContain(response.status());
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname, 'canonical insights pathname remains intact').toBe(insightsUrl.pathname);
  expect(currentUrl.searchParams.get('dest'), 'runtime bootstrap resolves canonical path to insights destination').toBe('insights');

  const deployedAssets = await page.locator('script[src], link[rel="modulepreload"][href]').evaluateAll((nodes) => Array.from(new Set(nodes.map((node) => node.src || node.href).filter(Boolean))));
  const deployed = await crawlDeployedJavascript(request, deployedAssets);
  expect(deployed.assetCount, 'published Phase 9.5 graph includes startup and lazy chunks').toBeGreaterThan(3);
  expect(deployed.javascript, 'published graph contains the Phase 9.5 runtime target').toContain('data-business-intelligence-runtime-target');
  expect(deployed.javascript, 'published graph contains canonical BI schema').toContain('enjaz-bi-forecast-v1');
  expect(deployed.javascript, 'published graph contains the Arabic BI center').toContain('مركز ذكاء الأعمال');
  expect(deployed.javascript, 'published graph preserves non-authoritative forecast language').toContain('اتجاهي');

  expect(consoleErrors, 'canonical insights deep-link has no console errors').toEqual([]);
  expect(pageErrors, 'canonical insights deep-link has no uncaught page errors').toEqual([]);
});

for (const viewport of PHASE95_VIEWPORTS) {
  test(`published /live/app/insights survives direct load and reload at ${viewport.width}px`, async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.setViewportSize(viewport);
    const insightsUrl = new URL('app/insights', LIVE_APP_URL);
    const response = await page.goto(insightsUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response.status());
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();

    const current = new URL(page.url());
    expect(current.pathname).toBe(insightsUrl.pathname);
    expect(current.searchParams.get('dest')).toBe('insights');
    const overflowBefore = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflowBefore.document, `document overflow before reload at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflowBefore.body, `body overflow before reload at ${viewport.width}px`).toBeLessThanOrEqual(1);

    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
    await expect(page.locator('[data-r2-auth="true"]')).toBeVisible();
    const afterReload = new URL(page.url());
    expect(afterReload.pathname).toBe(insightsUrl.pathname);
    expect(afterReload.searchParams.get('dest')).toBe('insights');
    const overflowAfter = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    expect(overflowAfter.document, `document overflow after reload at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(overflowAfter.body, `body overflow after reload at ${viewport.width}px`).toBeLessThanOrEqual(1);

    expect(consoleErrors, `console errors at ${viewport.width}px`).toEqual([]);
    expect(pageErrors, `page errors at ${viewport.width}px`).toEqual([]);
  });
}
