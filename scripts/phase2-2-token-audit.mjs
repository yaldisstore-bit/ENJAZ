import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';
import { loadTokenModel, TOKEN_FILE_ORDER } from './token-model.mjs';

const root = resolve(process.argv[2] ?? process.cwd());
const srcRoot = resolve(root, 'src');
const stylesRoot = resolve(srcRoot, 'styles');
const tokenIndex = resolve(stylesRoot, 'tokens.css');
const primitivePath = resolve(stylesRoot, 'tokens/primitives.css');
const tokenRoot = resolve(stylesRoot, 'tokens');
const contractPath = resolve(srcRoot, 'design-system/tokens/tokenContract.ts');
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
if (model.duplicates.length) violations.push(`duplicate token definitions: ${[...new Set(model.duplicates)].join(', ')}`);

const expectedImports = TOKEN_FILE_ORDER.map((name) => `@import './tokens/${name}';`).join('\n');
const indexText = (await readFile(tokenIndex, 'utf8')).trim();
if (indexText !== expectedImports) violations.push('tokens.css: token tier imports changed or are out of canonical order');

const rawColorPattern = /(?:#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i;
for (const { file, content } of model.files) {
  if (file !== primitivePath && rawColorPattern.test(content)) violations.push(`${relative(root, file)}: raw color literal outside primitives.css`);
}

const primitiveDefinitions = model.files.find(({ name }) => name === 'primitives.css');
for (const match of primitiveDefinitions.content.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
  if (!match[1].startsWith('--enjaz-')) violations.push(`primitives.css: reference token must use --enjaz-* prefix (${match[1]})`);
}
for (const [token, definition] of model.definitions) {
  if (token.startsWith('--enjaz-') && !definition.file.endsWith('primitives.css')) violations.push(`${definition.file}: primitive ${token} defined outside primitives.css`);
}

const allSrcFiles = await walk(srcRoot);
for (const file of allSrcFiles) {
  if (!['.css', '.ts', '.tsx'].includes(extname(file))) continue;
  if (file.startsWith(tokenRoot)) continue;
  const content = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  if (/--enjaz-[a-z0-9-]+/i.test(content)) violations.push(`${rel}: primitive token leaked outside token layers`);
  if (extname(file) === '.css' && rawColorPattern.test(content)) violations.push(`${rel}: raw color literal bypasses tokens`);
  for (const match of content.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
    if (!model.definitions.has(match[1])) violations.push(`${rel}: unknown design token reference ${match[1]}`);
  }
}

for (const { name, content } of model.files) {
  for (const match of content.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
    if (!model.definitions.has(match[1])) violations.push(`tokens/${name}: unresolved reference ${match[1]}`);
  }
}

for (const [token, definition] of model.definitions) {
  if (!definition.value.match(/^var\(/)) continue;
  if (model.resolveToken(token) === null) violations.push(`${definition.file}: alias cycle or unresolved terminal for ${token}`);
}

const componentFile = model.files.find(({ name }) => name === 'components.css');
const componentDefs = [...componentFile.content.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)];
for (const match of componentDefs) {
  if (!/^var\(--[a-z0-9-]+\)$/i.test(match[2].trim())) violations.push(`components.css: ${match[1]} must be a pure alias, not a raw value`);
}
const requiredComponentTokens = [
  '--control-height-default', '--control-height-large', '--field-background', '--field-border-focus', '--field-height',
  '--button-primary-background', '--button-primary-text', '--button-radius', '--card-background', '--card-border',
  '--card-radius', '--card-shadow', '--badge-radius', '--sheet-background', '--sheet-shadow', '--navigation-touch-target',
];
for (const token of requiredComponentTokens) if (!model.definitions.has(token)) violations.push(`components.css: missing component contract ${token}`);

const contractText = await readFile(contractPath, 'utf8');
const contractTokens = new Set([...contractText.matchAll(/'(--[a-z0-9-]+)'/gi)].map((match) => match[1]));
const publicTokens = new Set([...model.definitions.keys()].filter((token) => !token.startsWith('--enjaz-')));
for (const token of publicTokens) if (!contractTokens.has(token)) violations.push(`tokenContract.ts: missing public token ${token}`);
for (const token of contractTokens) if (!publicTokens.has(token)) violations.push(`tokenContract.ts: stale/unknown token ${token}`);
if (!contractText.includes('export type DesignTokenName')) violations.push('tokenContract.ts: missing DesignTokenName type');
if (!contractText.includes('export function cssVar')) violations.push('tokenContract.ts: missing typed cssVar helper');

const productCss = (await walk(stylesRoot)).filter((file) => extname(file) === '.css' && !file.startsWith(tokenRoot) && file !== tokenIndex);
for (const file of productCss) {
  const content = await readFile(file, 'utf8');
  const rel = relative(root, file).replaceAll('\\', '/');
  const declarations = [...content.matchAll(/([a-z-]+)\s*:\s*([^;]+);/gi)];
  for (const [, propertyRaw, valueRaw] of declarations) {
    const property = propertyRaw.toLowerCase();
    const value = valueRaw.trim();
    if (['font-size', 'border-radius', 'box-shadow'].includes(property) && !(value.startsWith('var(') || value === 'none')) {
      violations.push(`${rel}: ${property} must use a design token`);
    }
    if ((property === 'transition' || property === 'transition-duration') && /\b\d+(?:\.\d+)?ms\b/i.test(value)) {
      violations.push(`${rel}: motion duration literal must use motion tokens`);
    }
    if (['padding', 'padding-block', 'padding-inline', 'gap', 'row-gap', 'column-gap'].includes(property) && /\b\d+(?:\.\d+)?(?:rem|px)\b/i.test(value)) {
      violations.push(`${rel}: spacing literal must use spacing/component tokens`);
    }
  }
}

const tokenPage = await readFile(resolve(srcRoot, 'features/foundation/pages/TokenLabPage.tsx'), 'utf8');
for (const marker of ['الطبقات', 'سلم المسافات', 'عقود التحكم', 'الزوايا والعمق', 'الحركة', 'قواعد عدم الانحراف']) {
  if (!tokenPage.includes(marker)) violations.push(`TokenLabPage.tsx: missing token proof section ${marker}`);
}

if (violations.length) {
  console.error('ENJAZ PHASE 2.2 TOKEN AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log(`ENJAZ PHASE 2.2 TOKEN AUDIT PASS — ${model.definitions.size} total tokens, ${publicTokens.size} public typed tokens, ${componentDefs.length} component contracts, zero primitive leaks.`);
