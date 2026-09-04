import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.UI5_BASE_URL || 'http://127.0.0.1:4175';
const outDir = process.env.UI5_ARTIFACT_DIR || 'artifacts/ui5-reality';
await fs.mkdir(outDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function noHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  assert(overflow.html <= 1 && overflow.body <= 1, `${label}: horizontal overflow ${JSON.stringify(overflow)}`);
}

async function box(locator) {
  const result = await locator.boundingBox();
  assert(result, 'geometry unavailable');
  return result;
}

async function assertTouchTargets(page, label) {
  const undersized = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((button) => {
    const r = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      name: button.getAttribute('aria-label') || button.textContent?.replace(/\s+/g, ' ').trim() || 'button',
      width: r.width,
      height: r.height,
      visible: r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
    };
  }).filter((item) => item.visible && (item.width < 44 || item.height < 44)));
  assert(undersized.length === 0, `${label}: undersized touch targets ${JSON.stringify(undersized)}`);
}

const modes = [
  { id: 'home', label: 'الرئيسية', heading: 'الرئيسية', shot: true },
  { id: 'daily-work', label: 'اليوم', heading: 'اليوم', shot: true },
  { id: 'transaction-list', label: 'المعاملات', heading: 'المعاملات', shot: true },
  { id: 'transaction-360', label: 'تفاصيل', heading: 'تفاصيل المعاملة', shot: false },
  { id: 'finance', label: 'المالية', heading: 'المالية', shot: true },
  { id: 'analytics', label: 'التحليلات', heading: 'التحليلات', shot: false },
  { id: 'workflow', label: 'سير العمل', heading: 'سير العمل', shot: false },
  { id: 'operations', label: 'العمليات', heading: 'العمليات', shot: true },
  { id: 'command', label: 'القيادة', heading: 'القيادة', shot: true },
  { id: 'documents', label: 'الوثائق', heading: 'الوثائق', shot: true },
];

async function switchMode(page, mode, profile) {
  const switcher = page.locator('.ez-ia-switcher');
  const button = switcher.getByRole('button', { name: mode.label, exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.locator(`[data-composition-family="${mode.id}"]`).waitFor();
  await page.getByRole('heading', { name: mode.heading, level: 1, exact: true }).waitFor();
  await page.waitForTimeout(120);
  assert(await page.locator('[data-shell-part="bottom-dock"]').isVisible(), `${profile.name}:${mode.id}: shell dock disappeared`);
  assert(await page.locator(`[data-active-composition="${mode.id}"]`).count() === 1, `${profile.name}:${mode.id}: active composition marker missing`);
  await noHorizontalOverflow(page, `${profile.name}:${mode.id}`);
}

async function checkCompositionSpecifics(page, profile) {
  if (!profile.mobile) {
    await switchMode(page, modes[0], profile);
    const decision = await box(page.locator('.ez-ia-decision-zone'));
    const signal = await box(page.locator('.ez-ia-dark-signal'));
    assert(decision.width > signal.width * 1.35, `${profile.name}: Home lead is not deliberately asymmetric ${JSON.stringify({ decision: decision.width, signal: signal.width })}`);

    await switchMode(page, modes[1], profile);
    const nextTask = await box(page.locator('.ez-ia-next-task'));
    const timeline = await box(page.locator('.ez-ia-timeline'));
    assert(Math.abs(nextTask.width - timeline.width) > 120, `${profile.name}: Daily Work collapsed into equal panels`);

    await switchMode(page, modes[9], profile);
    const aside = await box(page.locator('.ez-ia-documents aside'));
    const list = await box(page.locator('.ez-ia-doc-list'));
    const detail = await box(page.locator('.ez-ia-doc-detail'));
    assert(aside.width < list.width && detail.width > aside.width, `${profile.name}: document browser lost category/list/detail hierarchy`);
    assert(aside.x !== list.x && list.x !== detail.x, `${profile.name}: document panes overlap`);
  }

  await switchMode(page, modes[2], profile);
  const recordHeights = await page.locator('.ez-ia-record').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  assert(recordHeights.length === 4, `${profile.name}: transaction scan rows missing`);
  assert(Math.max(...recordHeights) <= 96, `${profile.name}: transaction list regressed into oversized cards ${JSON.stringify(recordHeights)}`);

  await switchMode(page, modes[4], profile);
  assert(await page.locator('.ez-ia-ledger__row').count() >= 4, `${profile.name}: finance ledger movements missing`);
  assert(await page.locator('.ez-ia-mini-trend--finance').count() === 1, `${profile.name}: finance trend panel missing`);

  await switchMode(page, modes[8], profile);
  const commandHero = await page.locator('.ez-ia-command__hero').evaluate((element) => ({
    backgroundImage: getComputedStyle(element).backgroundImage,
    color: getComputedStyle(element).color,
  }));
  assert(commandHero.backgroundImage.includes('gradient'), `${profile.name}: Command Center lost high-contrast focal composition`);
  assert(await page.locator('.ez-ia-command__score').count() === 1, `${profile.name}: executive score focus missing`);

  await switchMode(page, modes[6], profile);
  assert(await page.locator('.ez-ia-workflow__steps > div.is-current').count() === 1, `${profile.name}: workflow current step is not singular`);
}

async function verifyProfile(browser, profile) {
  const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.locator('[data-stage="ui-5"]').waitFor();
  await page.waitForTimeout(220);
  assert(await page.locator('.vite-error-overlay').count() === 0, `${profile.name}: Vite error overlay visible`);
  await noHorizontalOverflow(page, `${profile.name}:initial`);

  const visibleText = await page.locator('body').innerText();
  for (const forbidden of ['UI-5', 'AUDIT', 'PROOF', 'Reality Gate']) {
    assert(!visibleText.includes(forbidden), `${profile.name}: developer terminology leaked to user surface: ${forbidden}`);
  }

  const patternSignatures = new Set();
  for (const mode of modes) {
    await switchMode(page, mode, profile);
    const patterns = await page.locator(`[data-composition-family="${mode.id}"] [data-pattern]`).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-pattern')).filter(Boolean));
    assert(patterns.length >= 1, `${profile.name}:${mode.id}: no intentional data-pattern present`);
    patternSignatures.add(patterns.join('|'));
    if (mode.shot) await page.screenshot({ path: path.join(outDir, `${profile.name}-${mode.id}.png`), fullPage: true });
  }
  assert(patternSignatures.size >= 7, `${profile.name}: compositions are insufficiently distinct (${patternSignatures.size} signatures)`);

  await checkCompositionSpecifics(page, profile);
  if (profile.mobile) await assertTouchTargets(page, profile.name);
  await noHorizontalOverflow(page, `${profile.name}:final`);
  assert(consoleErrors.length === 0, `${profile.name}: console errors ${consoleErrors.join(' | ')}`);
  assert(pageErrors.length === 0, `${profile.name}: page errors ${pageErrors.join(' | ')}`);

  const result = { profile: profile.name, patternSignatures: patternSignatures.size };
  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  const profiles = [
    { name: 'desktop-1280', viewport: { width: 1280, height: 900 }, mobile: false },
    { name: 'phone-430', viewport: { width: 430, height: 932 }, mobile: true },
    { name: 'phone-390', viewport: { width: 390, height: 844 }, mobile: true },
    { name: 'phone-360', viewport: { width: 360, height: 740 }, mobile: true },
    { name: 'phone-320', viewport: { width: 320, height: 700 }, mobile: true },
  ];
  const results = [];
  for (const profile of profiles) results.push(await verifyProfile(browser, profile));
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(`UI-5 Reality Gate PASS: ${JSON.stringify(results)}`);
} finally {
  await browser.close();
}
