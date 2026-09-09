const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://yaldisstore-bit.github.io/ENJAZ/';
const LIVE_APP_URL = process.env.LIVE_APP_URL || new URL('live/', BASE_URL).toString();

test('published /live app keeps Smart Risk 9.1 deployed behind the auth boundary', async ({ page, request }) => {
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

  const deployedAssets = await page.locator('script[src], link[rel="modulepreload"][href]').evaluateAll((nodes) => Array.from(new Set(nodes.map((node) => node.src || node.href).filter(Boolean))));
  expect(deployedAssets.length, 'live app exposes deployed JavaScript assets').toBeGreaterThan(0);

  const javascript = [];
  for (const assetUrl of deployedAssets) {
    const asset = await request.get(assetUrl);
    expect(asset.status(), `deployed asset ${assetUrl}`).toBeLessThan(400);
    javascript.push(await asset.text());
  }
  const deployedJs = javascript.join('\n');
  expect(deployedJs, 'deployed /live bundle contains Phase 9.1 stage contract').toContain('data-risk-stage');
  expect(deployedJs, 'deployed /live bundle contains read-only risk authority').toContain('read_only_derived_intelligence');
  expect(deployedJs, 'deployed /live bundle contains no-write authority marker').toContain('data-risk-write-authority');
  expect(deployedJs, 'deployed /live bundle contains Smart Risk engine identity').toContain('smart-risk-v1');

  expect(consoleErrors, 'live auth boundary has no console errors').toEqual([]);
  expect(pageErrors, 'live auth boundary has no uncaught page errors').toEqual([]);
});
