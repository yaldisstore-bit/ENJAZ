import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiRoot = path.join(root, 'src', 'ui-r2');
const contractPath = path.join(root, 'docs', 'UI_UX_REBIRTH_2_0_PALETTE_CONTRACT.md');
const tokenPath = path.join(uiRoot, 'tokens', 'palette.css');

const allowed = new Set(['#F2F3F4', '#DED1C6', '#A77693', '#174871', '#0F2D4D']);
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(contractPath)) errors.push('missing locked palette contract');
if (!fs.existsSync(tokenPath)) errors.push('missing Rebirth 2.0 palette token source');

const contract = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, 'utf8') : '';
for (const color of allowed) {
  if (!contract.includes(color)) errors.push(`palette contract missing ${color}`);
}
if (!contract.includes('LOCKED / USER-APPROVED')) errors.push('palette contract must remain user-approved and locked');

for (const file of walk(uiRoot)) {
  if (!/\.(?:css|ts|tsx|js|jsx|mjs)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  const hexes = text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  for (const literal of hexes) {
    const normalized = literal.toUpperCase();
    if (!allowed.has(normalized)) errors.push(`${rel}: forbidden color literal ${literal}`);
  }

  if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(text)) {
    errors.push(`${rel}: functional color syntax is forbidden; use locked palette tokens only`);
  }

  if (/['"](?:black|white|red|green|blue|yellow|orange|purple|pink|gray|grey|cyan|magenta|teal|navy|brown|gold|silver)['"]/i.test(text)) {
    errors.push(`${rel}: named color literal is forbidden`);
  }
}

const tokenText = fs.existsSync(tokenPath) ? fs.readFileSync(tokenPath, 'utf8') : '';
for (const color of allowed) {
  if (!tokenText.includes(color)) errors.push(`palette tokens missing ${color}`);
}

if (errors.length) {
  console.error('ENJAZ REBIRTH 2.0 PALETTE AUDIT FAIL');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`ENJAZ REBIRTH 2.0 PALETTE AUDIT PASS — exactly ${allowed.size} approved colors; no foreign literals in src/ui-r2.`);
}
