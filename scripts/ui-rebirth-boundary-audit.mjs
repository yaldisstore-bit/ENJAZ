import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

const root = resolve('src/ui-rebirth');
const required = [
  'DNA_CONTRACT.md',
  'styles/foundation.css',
  'styles/tokens.css',
  'styles/base.css',
  'styles/typography.css',
  'styles/motion.css',
  'styles/surfaces.css',
];

const codeExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.css']);
const forbidden = [
  { label: 'legacy styles import', pattern: /(?:from\s+['"][^'"]*\/styles\/|@import\s+['"][^'"]*\.\.\/\.\.\/styles\/)/ },
  { label: 'legacy AppShell visual dependency', pattern: /AppShellFrame|app-shell__/ },
  { label: 'legacy Home visual dependency', pattern: /HomeDashboardPreviewPage|home-dashboard/ },
  { label: 'legacy productivity patch dependency', pattern: /productivity-(?:polish|depth)/ },
  { label: 'legacy identity dependency', pattern: /identity3|identity-3|visual-identity-3/i },
  { label: 'reserved boundary visual dependency', pattern: /reserved-boundary|NavigationBoundaryPage/ },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const failures = [];
let checks = 0;

for (const path of required) {
  checks += 1;
  try {
    const info = await stat(resolve(root, path));
    if (!info.isFile()) failures.push(`Required rebirth artifact is not a file: ${path}`);
  } catch {
    failures.push(`Missing required rebirth artifact: ${path}`);
  }
}

const files = await walk(root);
for (const file of files) {
  if (!codeExtensions.has(extname(file))) continue;
  const source = await readFile(file, 'utf8');
  const display = relative(process.cwd(), file);
  for (const rule of forbidden) {
    checks += 1;
    if (rule.pattern.test(source)) failures.push(`${display}: forbidden ${rule.label}`);
  }
}

const tokenSource = await readFile(resolve(root, 'styles/tokens.css'), 'utf8');
const requiredTokens = [
  '--ui-gold:',
  '--ui-charcoal:',
  '--ui-finance-blue:',
  '--ui-finance-blue-deep:',
  '--ui-analytics-violet:',
  '--ui-analytics-navy:',
  '--ui-touch-min:',
  '--ui-dock-height:',
];
for (const token of requiredTokens) {
  checks += 1;
  if (!tokenSource.includes(token)) failures.push(`Missing required new-DNA token: ${token}`);
}

const foundationSource = await readFile(resolve(root, 'styles/foundation.css'), 'utf8');
checks += 1;
if (/\.\.\//.test(foundationSource)) failures.push('Rebirth foundation may import only files inside its own styles directory.');

if (failures.length) {
  console.error(`UI Rebirth boundary audit FAILED (${failures.length} issue(s))`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`UI Rebirth boundary audit passed: ${checks}/${checks} checks.`);
