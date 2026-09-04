import fs from 'node:fs';
import { auditHomeSources } from './ui-rebirth-home-audit-lib.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const sources = {
  component: read('src/ui-rebirth/runtime/RebirthHomeDashboard.tsx'),
  css: read('src/ui-rebirth/runtime/rebirth-home.css'),
  interaction: read('src/ui-rebirth/runtime/rebirth-home-interaction.css'),
  shell: read('src/ui-rebirth/runtime/RebirthAppShell.tsx'),
  connected: read('src/ui-rebirth/runtime/RebirthConnectedHomeDashboard.tsx'),
  preview: read('src/ui-rebirth/preview/homePreviewState.ts'),
};

const failures = auditHomeSources(sources);
if (failures.length) {
  console.error(`ENJAZ Stage 2 Home audit FAILED (${failures.length} issue(s))`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ENJAZ Stage 2 Home audit passed: reference composition, real-data adapter, states, RTL-ready semantics, safe hero geometry and responsive DNA are intact.');