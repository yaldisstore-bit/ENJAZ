import fs from 'node:fs';
import path from 'node:path';
import { validateRebirthShell } from './ui-rebirth-shell-audit-lib.mjs';

const root = process.cwd();
const tsxPath = path.join(root, 'src/ui-rebirth/runtime/RebirthAppShell.tsx');
const cssPath = path.join(root, 'src/ui-rebirth/runtime/rebirth-app-shell.css');

const failures = [];
if (!fs.existsSync(tsxPath)) failures.push('missing RebirthAppShell.tsx');
if (!fs.existsSync(cssPath)) failures.push('missing rebirth-app-shell.css');

if (!failures.length) {
  const tsx = fs.readFileSync(tsxPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  failures.push(...validateRebirthShell(tsx, css));
}

if (failures.length) {
  console.error(`UI Rebirth Stage 1 shell audit failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI Rebirth Stage 1 shell audit passed.');
