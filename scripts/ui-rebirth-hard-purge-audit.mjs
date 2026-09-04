import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const forbiddenRoots = [
  'src/styles',
  'src/design-system',
  'src/app',
  'src/features/foundation',
  'src/features/navigation',
  'src/shared/interactions',
  'src/shared/shell',
  'src/shared/ui',
  'src/features/home/pages',
  'src/features/auth/ui',
];
const forbiddenFiles = [
  'src/features/auth/pages/LoginPage.tsx',
  'src/features/auth/pages/SignUpPage.tsx',
  'src/features/auth/pages/ForgotPasswordPage.tsx',
  'src/features/auth/pages/UpdatePasswordPage.tsx',
];

for (const relative of [...forbiddenRoots, ...forbiddenFiles]) {
  if (fs.existsSync(path.join(root, relative))) failures.push(`legacy visual path still exists: ${relative}`);
}

const srcRoot = path.join(root, 'src');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(srcRoot)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative.startsWith('src/ui-rebirth/')) continue;
  if (file.endsWith('.css')) failures.push(`CSS exists outside ui-rebirth: ${relative}`);
  if (!/\.(tsx|ts)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (/className\s*=|<\s*(button|section|header|footer|nav|main|article|aside)\b/.test(source)) {
    failures.push(`visual DOM remains outside ui-rebirth: ${relative}`);
  }
  for (const marker of ['app-shell__', 'home-dashboard', 'productivity-depth', 'productivity-polish', 'navigation-boundary', 'global-command-card', 'global-interaction']) {
    if (source.includes(marker)) failures.push(`legacy visual marker ${marker} remains in ${relative}`);
  }
}

const mainSource = fs.readFileSync(path.join(root, 'src/main.tsx'), 'utf8');
if (!mainSource.includes("./ui-rebirth/styles/foundation.css")) failures.push('main.tsx does not load the rebirth foundation');
if (mainSource.includes("./styles/foundation.css")) failures.push('main.tsx still loads the previous foundation');

const required = [
  'src/ui-rebirth/DNA_CONTRACT.md',
  'src/ui-rebirth/styles/tokens.css',
  'src/ui-rebirth/styles/typography.css',
  'src/ui-rebirth/styles/surfaces.css',
  'src/ui-rebirth/styles/motion.css',
  'docs/UI_REBIRTH_REFERENCE_MAP.md',
];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`required rebirth foundation missing: ${relative}`);
}

if (failures.length) {
  console.error(`UI Rebirth hard-purge audit failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI Rebirth hard-purge audit passed: no previous visual runtime remains under src/.');
