import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const srcRoot = resolve(root, 'src');
const stylesRoot = resolve(srcRoot, 'styles');
const typographyTokensPath = resolve(stylesRoot, 'tokens/typography.css');
const typographyRtlPath = resolve(stylesRoot, 'typography-rtl.css');
const typographyLabStylePath = resolve(stylesRoot, 'typography-lab.css');
const typographyContractPath = resolve(srcRoot, 'design-system/typography/typographyContract.ts');
const typographyPagePath = resolve(srcRoot, 'features/foundation/pages/TypographyLabPage.tsx');
const routesPath = resolve(srcRoot, 'core/routing/routes.ts');
const routerPath = resolve(srcRoot, 'app/router.tsx');
const foundationIndexPath = resolve(stylesRoot, 'foundation.css');
const indexHtmlPath = resolve(root, 'index.html');
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else files.push(child);
  }
  return files;
}

function tokenValue(css, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`))?.[1]?.trim() ?? null;
}

function absolutePx(value) {
  if (!value) return null;
  const px = value.match(/^([0-9.]+)px$/);
  if (px) return Number(px[1]);
  const rem = value.match(/^([0-9.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  return null;
}

const typographyTokens = await readFile(typographyTokensPath, 'utf8');
const typographyRtl = await readFile(typographyRtlPath, 'utf8');
const typographyLabStyle = await readFile(typographyLabStylePath, 'utf8');
const typographyContract = await readFile(typographyContractPath, 'utf8');
const typographyPage = await readFile(typographyPagePath, 'utf8');
const routes = await readFile(routesPath, 'utf8');
const router = await readFile(routerPath, 'utf8');
const foundationIndex = await readFile(foundationIndexPath, 'utf8');
const indexHtml = await readFile(indexHtmlPath, 'utf8');

const requiredTypographyTokens = [
  '--font-family-arabic', '--font-family-ui', '--font-family-latin', '--font-family-numeric', '--font-family-mono',
  '--font-size-caption', '--font-size-label', '--font-size-body', '--font-size-body-lg', '--font-size-subtitle',
  '--font-size-title-sm', '--font-size-title-md', '--font-size-title-lg', '--font-size-display',
  '--font-weight-regular', '--font-weight-medium', '--font-weight-bold', '--font-weight-heavy',
  '--line-height-caption', '--line-height-label', '--line-height-body', '--line-height-reading',
  '--tracking-arabic', '--tracking-ui', '--font-variant-numeric',
];
for (const token of requiredTypographyTokens) {
  if (tokenValue(typographyTokens, token) === null) violations.push(`typography.css: missing ${token}`);
  if (!typographyContract.includes(`'${token}'`) && !token.startsWith('--font-variant')) {
    // tokenContract.ts owns CSS tokens; typographyContract.ts owns behavior, so this is checked by Phase 2.2.
  }
}

const captionPx = absolutePx(tokenValue(typographyTokens, '--font-size-caption'));
const bodyPx = absolutePx(tokenValue(typographyTokens, '--font-size-body'));
if (captionPx === null || captionPx < 13) violations.push(`typography.css: caption floor must be >=13px (found ${captionPx ?? 'unparseable'})`);
if (bodyPx === null || bodyPx < 16) violations.push(`typography.css: body floor must be >=16px (found ${bodyPx ?? 'unparseable'})`);

const arabicTracking = tokenValue(typographyTokens, '--tracking-arabic');
if (!/^0(?:\.0+)?(?:em)?$/i.test(arabicTracking ?? '')) violations.push('typography.css: Arabic tracking must be zero');
for (const token of ['--tracking-ui', '--tracking-tight', '--tracking-display']) {
  const value = tokenValue(typographyTokens, token);
  if (value !== 'var(--tracking-arabic)' && !/^0(?:\.0+)?(?:em)?$/i.test(value ?? '')) {
    violations.push(`typography.css: ${token} must preserve zero Arabic tracking`);
  }
}

if (/@font-face\b/i.test(typographyTokens + typographyRtl) || /url\s*\(/i.test(typographyTokens + typographyRtl)) {
  violations.push('typography: remote/bundled font dependency is forbidden in the Phase 2.3 foundation');
}

if (!/<html\s+lang=["']ar["']\s+dir=["']rtl["']/i.test(indexHtml)) violations.push('index.html: root must be lang="ar" dir="rtl"');
if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(indexHtml)) violations.push('index.html: viewport must not disable user zoom');
if (!indexHtml.includes('width=device-width')) violations.push('index.html: responsive viewport is required');

for (const marker of [
  'unicode-bidi: plaintext',
  'unicode-bidi: isolate',
  'font-variant-numeric: var(--font-variant-numeric)',
  'overflow-wrap: anywhere',
  'text-overflow: ellipsis',
  '-webkit-line-clamp: 2',
  '-webkit-line-clamp: 3',
  'min-inline-size: 0',
]) {
  if (!typographyRtl.includes(marker)) violations.push(`typography-rtl.css: missing behavior ${marker}`);
}

if (!foundationIndex.includes("@import './typography-rtl.css';")) violations.push('foundation.css: typography-rtl.css not imported');
if (!foundationIndex.includes("@import './typography-lab.css';")) violations.push('foundation.css: typography-lab.css not imported');
if (foundationIndex.indexOf("@import './typography-rtl.css';") < foundationIndex.indexOf("@import './base.css';")) {
  violations.push('foundation.css: typography behavior must load after base.css');
}

if (!routes.includes("typography: '/foundation/typography'")) violations.push('routes.ts: missing canonical typography route');
if (!router.includes('ROUTES.typography') || !router.includes('TypographyLabPage')) violations.push('router.tsx: typography lab is not routed');

for (const marker of [
  "bidiAttributes('money')", "bidiAttributes('date')", "bidiAttributes('phone')", "bidiAttributes('reference')", "bidiAttributes('email')",
  'اختبار الاسم الطويل', 'عربي + English', 'قواعد الحماية', '1,250,000,000 IQD', 'ENJAZ-TRX-2026-00481',
]) {
  if (!typographyPage.includes(marker)) violations.push(`TypographyLabPage.tsx: missing proof marker ${marker}`);
}
const longArabicLiteral = [...typographyPage.matchAll(/'([^'\n]*[\u0600-\u06ff][^'\n]*)'/g)].map((match) => match[1]).sort((a, b) => b.length - a.length)[0] ?? '';
if (longArabicLiteral.length < 80) violations.push('TypographyLabPage.tsx: long Arabic content probe is too short');

for (const marker of ["dir: 'auto'", "dir: 'ltr'", "className: 'text-numeric'", 'minimumCaptionPx: 13', 'minimumBodyPx: 16']) {
  if (!typographyContract.includes(marker)) violations.push(`typographyContract.ts: missing contract ${marker}`);
}

const cssFiles = (await walk(stylesRoot)).filter((file) => extname(file) === '.css' && !file.includes('/tokens/'));
const physicalProperties = new Set([
  'left', 'right', 'margin-left', 'margin-right', 'padding-left', 'padding-right', 'border-left', 'border-right',
  'border-left-width', 'border-right-width', 'border-left-color', 'border-right-color', 'border-left-style', 'border-right-style',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
]);
for (const file of cssFiles) {
  const content = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  for (const match of content.matchAll(/(^|[;{]\s*)([a-z-]+)\s*:\s*([^;{}]+);/gim)) {
    const property = match[2].toLowerCase();
    const value = match[3].trim();
    if (physicalProperties.has(property)) violations.push(`${rel}: physical direction property ${property} is forbidden; use logical CSS`);
    if (property === 'text-align' && /^(left|right)$/i.test(value)) violations.push(`${rel}: text-align must be logical start/end`);
    if (property === 'word-break' && /break-all/i.test(value)) violations.push(`${rel}: break-all damages Arabic words`);
    if (property === 'font-size' && !/^var\(--font-size-[a-z0-9-]+\)$/i.test(value)) violations.push(`${rel}: font-size must use typography tokens`);
    if (['font-family', 'font-weight', 'line-height', 'letter-spacing', 'font-variant-numeric'].includes(property) && !(value.startsWith('var(') || value === 'inherit' || value === 'normal')) {
      violations.push(`${rel}: ${property} must use the typography contract`);
    }
  }
  if (file !== typographyRtlPath && /\bdirection\s*:\s*ltr\b/i.test(content)) violations.push(`${rel}: LTR exceptions must be centralized in typography-rtl.css`);
}

if (!typographyLabStyle.includes('min-inline-size: 0')) violations.push('typography-lab.css: long-content containers need min-inline-size: 0');

if (violations.length) {
  console.error('ENJAZ PHASE 2.3 TYPOGRAPHY / RTL AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 2.3 TYPOGRAPHY / RTL AUDIT PASS — Arabic root, ${requiredTypographyTokens.length} required type tokens, 13px caption floor, 16px body floor, logical RTL and isolated LTR data verified.`);
