const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://yaldisstore-bit.github.io/ENJAZ/';
const LIVE_APP_URL = process.env.LIVE_APP_URL || new URL('live/', BASE_URL).toString();

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
