import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';
import { loadTokenModel } from './token-model.mjs';

const root = resolve(process.argv[2] ?? process.cwd());
const srcRoot = resolve(root, 'src');
const primitivePath = resolve(srcRoot, 'styles/tokens/primitives.css');
const tokenRoot = resolve(srcRoot, 'styles/tokens');
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

const model = await loadTokenModel(root);
const cssFiles = (await walk(resolve(srcRoot, 'styles'))).filter((file) => extname(file) === '.css');
const sourceFiles = await walk(srcRoot);
const requiredTokens = [
  '--color-canvas', '--color-surface', '--color-text-primary', '--color-text-secondary', '--color-text-tertiary',
  '--color-brand-primary', '--color-brand-strong', '--color-brand-soft', '--color-accent-teal', '--color-accent-violet',
  '--color-success', '--color-warning', '--color-danger', '--color-focus', '--font-family-ui', '--font-size-body',
  '--font-size-label', '--font-size-caption', '--radius-sm', '--radius-md', '--radius-lg', '--shadow-level-1',
  '--shadow-level-2', '--shadow-level-3', '--size-touch-min', '--gradient-brand', '--gradient-canvas',
];
for (const token of requiredTokens) if (!model.definitions.has(token)) violations.push(`tokens: missing required token ${token}`);

const rawColorPattern = /(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i;
for (const file of cssFiles) {
  const content = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  if (file !== primitivePath && rawColorPattern.test(content)) violations.push(`${rel}: raw color literal outside primitives.css`);
  if (file.startsWith(tokenRoot)) continue;
  if (/\btext-shadow\s*:/i.test(content)) violations.push(`${rel}: text-shadow is forbidden in ENJAZ identity`);
  if (/\bfilter\s*:\s*(?:drop-shadow|blur)/i.test(content)) violations.push(`${rel}: glow/blur filter is forbidden in ENJAZ identity`);
  const declarations = [...content.matchAll(/([a-z-]+)\s*:\s*([^;]+);/gi)].map((match) => [match[1].toLowerCase(), match[2].trim()]);
  for (const [property, value] of declarations) {
    if (property === 'font-size' && !value.startsWith('var(')) violations.push(`${rel}: font-size must come from identity tokens`);
    if (property === 'box-shadow' && !(value.startsWith('var(') || value === 'none')) violations.push(`${rel}: box-shadow must come from identity tokens`);
    if (property === 'border-radius' && !value.startsWith('var(')) violations.push(`${rel}: border-radius must come from identity tokens`);
  }
}

for (const file of sourceFiles.filter((file) => ['.tsx', '.ts'].includes(extname(file)))) {
  const content = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  if (/style\s*=\s*\{\{/.test(content)) violations.push(`${rel}: inline style object bypasses design system`);
}

function rgb(hex) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
}
function luminance(hex) {
  const channels = rgb(hex);
  if (!channels) return null;
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(foregroundToken, backgroundToken) {
  const foreground = model.resolveToken(foregroundToken);
  const background = model.resolveToken(backgroundToken);
  const a = foreground ? luminance(foreground) : null;
  const b = background ? luminance(background) : null;
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const contrastPairs = [
  ['--color-text-primary', '--color-canvas', 7], ['--color-text-secondary', '--color-canvas', 4.5],
  ['--color-text-tertiary', '--color-canvas', 4.5], ['--color-text-primary', '--color-surface', 7],
  ['--color-text-on-brand', '--color-brand-primary', 4.5], ['--color-brand-strong', '--color-brand-soft', 4.5],
  ['--color-success-text', '--color-success-soft', 4.5], ['--color-warning-text', '--color-warning-soft', 4.5],
  ['--color-danger-text', '--color-danger-soft', 4.5], ['--color-info-text', '--color-info-soft', 4.5],
];
for (const [foreground, background, minimum] of contrastPairs) {
  const ratio = contrast(foreground, background);
  if (ratio === null) violations.push(`tokens: cannot resolve contrast pair ${foreground} / ${background}`);
  else if (ratio < minimum) violations.push(`tokens: contrast ${foreground} / ${background} is ${ratio.toFixed(2)} (< ${minimum})`);
}

if (model.resolveToken('--size-touch-min') !== '2.75rem') violations.push('tokens: touch target must remain 2.75rem (44px)');
if (model.resolveToken('--font-size-caption') !== '0.8125rem') violations.push('tokens: caption floor must remain 0.8125rem (13px)');

const identitySource = await readFile(resolve(srcRoot, 'features/foundation/pages/IdentityLabPage.tsx'), 'utf8');
for (const marker of ['لوحة الهوية', 'الكتابة العربية', 'العمق', 'الحالات الدلالية', 'دستور الهوية']) {
  if (!identitySource.includes(marker)) violations.push(`IdentityLabPage.tsx: missing identity proof section ${marker}`);
}

if (violations.length) {
  console.error('ENJAZ PHASE 2.1 VISUAL AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log(`ENJAZ PHASE 2.1 VISUAL AUDIT PASS — ${requiredTokens.length} required tokens, ${contrastPairs.length} contrast pairs, no raw visual drift.`);
