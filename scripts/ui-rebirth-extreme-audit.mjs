import fs from 'node:fs';
import path from 'node:path';
import { validateExtremeUI } from './ui-rebirth-extreme-audit-lib.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const failures = validateExtremeUI({
  shell: read('src/ui-rebirth/runtime/RebirthAppShell.tsx'),
  shellCss: read('src/ui-rebirth/runtime/rebirth-app-shell.css'),
  hardeningCss: read('src/ui-rebirth/styles/qa-hardening.css'),
  tokensCss: read('src/ui-rebirth/styles/tokens.css'),
  foundationCss: read('src/ui-rebirth/styles/foundation.css'),
});

if (failures.length) {
  console.error(`ENJAZ extreme UI audit failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ENJAZ extreme UI audit passed: production-grade shell contracts are intact.');
