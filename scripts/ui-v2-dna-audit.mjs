import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { throw new Error(`[UI-2 DNA] ${message}`); };

const requiredFiles = [
  'src/ui-v2/styles/tokens.css',
  'src/ui-v2/styles/dna.css',
  'src/ui-v2/theme/dna.ts',
  'src/ui-v2/runtime/VisualDnaProof.tsx',
  'docs/UI2_ENJAZ_VISUAL_DNA_2.md',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing ${file}`);
}

const tokens = read('src/ui-v2/styles/tokens.css');
const dnaCss = read('src/ui-v2/styles/dna.css');
const dnaTs = read('src/ui-v2/theme/dna.ts');
const proof = read('src/ui-v2/runtime/VisualDnaProof.tsx');
const main = read('src/main.tsx');

const requiredTokens = [
  '--ez-canvas', '--ez-surface', '--ez-ink', '--ez-muted',
  '--ez-gold-500', '--ez-gold-ink', '--ez-charcoal-900', '--ez-on-dark',
  '--ez-success', '--ez-warning', '--ez-danger', '--ez-info',
  '--ez-domain-finance', '--ez-domain-analytics', '--ez-domain-operations',
  '--ez-radius-md', '--ez-radius-xl', '--ez-shadow-2', '--ez-touch-min',
  '--ez-ease-spring', '--ez-dur-base',
];

for (const token of requiredTokens) {
  if (!tokens.includes(token)) fail(`Missing semantic token ${token}`);
}

if (!tokens.includes('@media (prefers-reduced-motion: reduce)')) {
  fail('Reduced-motion token override is missing');
}

if (!dnaTs.includes("anchors: ['gold', 'charcoal']")) fail('Typed identity anchors are not frozen');
if (!dnaTs.includes('defaultCardGrid: false')) fail('Equal-card-grid rejection is not encoded');
if (!dnaTs.includes("style: 'rounded-linear'")) fail('Iconography rule is not encoded');
if (!proof.includes('data-dna="gold-charcoal"')) fail('Live proof is not bound to the approved DNA');
if (!dnaCss.includes('var(--ez-gradient-gold)') || !dnaCss.includes('var(--ez-gradient-ink)')) {
  fail('Live proof does not exercise both gold and charcoal focal surfaces');
}
if (!main.includes("./ui-v2/")) fail('Runtime entry is not UI V2');
if (main.includes('ui-rebirth')) fail('Runtime entry leaked back to quarantined UI');

for (const source of [dnaCss, dnaTs, proof]) {
  if (source.includes('ui-rebirth') || source.includes('src/styles')) {
    fail('UI-2 contains a quarantined visual dependency');
  }
}

function tokenHex(name) {
  const match = tokens.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) fail(`Cannot resolve hex token ${name}`);
  return match[1];
}

function channel(value) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.slice(1);
  const r = channel(parseInt(value.slice(0, 2), 16));
  const g = channel(parseInt(value.slice(2, 4), 16));
  const b = channel(parseInt(value.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const high = Math.max(l1, l2);
  const low = Math.min(l1, l2);
  return (high + 0.05) / (low + 0.05);
}

const contrastPairs = [
  ['--ez-ink', '--ez-canvas'],
  ['--ez-gold-ink', '--ez-gold-500'],
  ['--ez-on-dark', '--ez-charcoal-900'],
  ['--ez-muted', '--ez-surface'],
];

for (const [foreground, background] of contrastPairs) {
  const ratio = contrast(tokenHex(foreground), tokenHex(background));
  if (ratio < 4.5) fail(`${foreground} on ${background} contrast ${ratio.toFixed(2)} is below 4.5:1`);
}

console.log('UI-2 Visual DNA audit passed.');
