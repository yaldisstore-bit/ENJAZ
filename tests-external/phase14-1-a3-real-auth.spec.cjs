const { test, expect } = require('@playwright/test');

const baseUrl = process.env.ENJAZ_A3_BASE_URL || 'http://127.0.0.1:4193/';
const ownerEmail = process.env.ENJAZ_A3_OWNER_EMAIL;
const ownerPassword = process.env.ENJAZ_A3_OWNER_PASSWORD;
const clientEmail = process.env.ENJAZ_A3_CLIENT_EMAIL;
const clientPassword = process.env.ENJAZ_A3_CLIENT_PASSWORD;

if (!ownerEmail || !ownerPassword || !clientEmail || !clientPassword) {
  throw new Error('A3_REAL_AUTH_CREDENTIALS_MISSING');
}

async function noHorizontalOverflow(page) {
  const g = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(g.doc).toBeLessThanOrEqual(g.client + 1);
  expect(g.body).toBeLessThanOrEqual(g.client + 1);
}

async function loginStaff(page) {
  await page.goto(new URL('/', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-r2-auth="true"]')).toBeVisible({ timeout: 20000 });
  await page.getByLabel('البريد الإلكتروني').fill(ownerEmail);
  await page.getByLabel('كلمة المرور').fill(ownerPassword);
  await page.getByRole('button', { name: 'دخول إلى إنجاز' }).click();
  await expect(page.locator('[data-r2-runtime-mode="live"]')).toBeVisible({ timeout: 30000 });
}

async function loginClient(page, fatal = []) {
  await page.goto(new URL('/portal', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-client-portal-auth="true"]')).toBeVisible({ timeout: 20000 });
  await page.getByLabel('البريد الإلكتروني').fill(clientEmail);
  await page.getByLabel('كلمة المرور').fill(clientPassword);

  // Register live-read observers before submit so a fast localhost render cannot
  // race past the RPCs and make shell/skeleton timing look like data readiness.
  const successfulRpc = name => page.waitForResponse(response =>
    response.url().endsWith('/rest/v1/rpc/' + name) &&
    response.request().method() === 'POST' && response.ok(),
  { timeout: 30000 });
  const workspacesReady = successfulRpc('list_client_portal_workspaces_v1');
  const modelReady = successfulRpc('get_client_portal_read_model_v1');
  const authorityReady = successfulRpc('get_client_portal_authority_v1');

  await page.getByRole('button', { name: 'دخول آمن' }).click();
  await workspacesReady;
  await expect(page.locator('[data-client-portal-shell="isolated"]')).toBeVisible({ timeout: 30000 });
  await Promise.all([modelReady, authorityReady]);
  const shell = page.locator('[data-client-portal-shell="isolated"]');
  await expect(shell).toHaveAttribute('data-client-portal-load-state', 'ready', { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'كل شيء تحت السيطرة' })).toBeVisible({ timeout: 20000 });
  const portalState = await page.evaluate(() => {
    const shell = document.querySelector('[data-client-portal-shell="isolated"]');
    return {
      path: window.location.pathname,
      shell: shell ? 1 : 0,
      auth: document.querySelectorAll('[data-client-portal-auth="true"]').length,
      loadState: shell?.getAttribute('data-client-portal-load-state') ?? null,
      mainChildCount: shell?.querySelector('main')?.children.length ?? -1,
      navigationCount: shell?.querySelectorAll('nav').length ?? 0,
    };
  });
  const safeFatal = fatal.slice(0, 6).map(value => String(value)
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .slice(0, 220));
  console.log('A3_PORTAL_POST_RPC_STATE ' + JSON.stringify({...portalState,
    fatalCount: fatal.length, safeFatal}));
  expect(portalState.shell).toBe(1);
  expect(portalState.loadState).toBe('ready');
  expect(portalState.mainChildCount).toBeGreaterThan(0);
  expect(portalState.navigationCount).toBeGreaterThan(0);
}

for (const width of [1280, 430, 390, 360, 320]) {
  test(`Phase 14.1 A3 real staff Auth is RTL/overflow-safe at ${width}px`, async ({ page }) => {
    const fatal = [];
    page.on('pageerror', e => fatal.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fatal.push(m.text()); });
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await loginStaff(page);
    await expect(page.locator('[data-r2-live="home"]')).toBeVisible({ timeout: 20000 });
    await noHorizontalOverflow(page);
    expect(fatal).toEqual([]);
  });

  test(`Phase 14.1 A3 real client Auth is isolated RTL/overflow-safe at ${width}px`, async ({ page }) => {
    const fatal = [];
    page.on('pageerror', e => fatal.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fatal.push(m.text()); });
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await loginClient(page, fatal);
    const shell = page.locator('[data-client-portal-shell="isolated"]');
    await expect(shell).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('navigation', { name: 'تنقل بوابة العميل' })).toBeVisible();
    await expect(shell).not.toContainText('storage_path');
    await noHorizontalOverflow(page);
    expect(fatal).toEqual([]);
  });
}

test('Phase 14.1 A3 client portal survives offline refresh and recovers online', async ({ page, context }) => {
  test.setTimeout(75000);
  const fatal = [];
  page.on('pageerror', e => fatal.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fatal.push(m.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await loginClient(page, fatal);
  try {
    await context.setOffline(true);
    await page.getByRole('button', { name: 'تحديث' }).click();
    // Production class names are compacted at build time; the stable load-state
    // contract verifies fail-closed offline behavior without coupling to CSS tokens.
    const offlineShell = page.locator('[data-client-portal-shell="isolated"]');
    await expect(offlineShell).toHaveAttribute('data-client-portal-load-state', 'error', { timeout: 25000 });
    await expect(page.getByRole('heading', { name: 'كل شيء تحت السيطرة' })).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
  const recoveredRead = page.waitForResponse(response =>
    response.url().endsWith('/rest/v1/rpc/get_client_portal_read_model_v1') &&
    response.request().method() === 'POST' && response.ok());
  await page.getByRole('button', { name: 'تحديث' }).click();
  await recoveredRead;
  const recoveredShell = page.locator('[data-client-portal-shell="isolated"]');
  await expect(recoveredShell).toBeVisible({ timeout: 20000 });
  await expect(recoveredShell).toHaveAttribute('data-client-portal-load-state', 'ready', { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'كل شيء تحت السيطرة' })).toBeVisible({ timeout: 20000 });
  await noHorizontalOverflow(page);
});
