import fs from 'node:fs';
import path from 'node:path';
import { validateRebirthShell } from './ui-rebirth-shell-audit-lib.mjs';

const root = process.cwd();
const sourceTsx = fs.readFileSync(path.join(root, 'src/ui-rebirth/runtime/RebirthAppShell.tsx'), 'utf8');
const sourceCss = fs.readFileSync(path.join(root, 'src/ui-rebirth/runtime/rebirth-app-shell.css'), 'utf8');

const baseline = validateRebirthShell(sourceTsx, sourceCss);
if (baseline.length) {
  console.error('Shell selftest cannot start because the baseline shell is invalid.');
  for (const failure of baseline) console.error(`- ${failure}`);
  process.exit(1);
}

const regressions = [
  ['remove header', sourceTsx.replace('className="rebirth-shell__header"', 'className="broken-header"'), sourceCss, 'new shell header'],
  ['remove dock', sourceTsx.replace('className="rebirth-shell__dock"', 'className="broken-dock"'), sourceCss, 'engineered bottom dock'],
  ['detach CTA slot', sourceTsx.replace('className="rebirth-shell__cta-slot"', 'className="broken-slot"'), sourceCss, 'center action dock slot'],
  ['remove RTL', sourceTsx.replace('dir="rtl"', 'dir="ltr"'), sourceCss, 'RTL direction'],
  ['remove bottom safe area', sourceTsx, sourceCss.replaceAll('env(safe-area-inset-bottom)', '0px'), 'bottom safe area'],
  ['remove reduced motion', sourceTsx, sourceCss.replace('@media (prefers-reduced-motion: reduce)', '@media (min-width: 9999px)'), 'reduced motion contract'],
  ['break dock geometry', sourceTsx, sourceCss.replace('grid-template-columns: 1fr 1fr 76px 1fr 1fr', 'grid-template-columns: repeat(5, 1fr)'), 'dock geometry'],
  ['inject legacy marker', `${sourceTsx}\n// productivity-polish`, sourceCss, 'legacy visual dependency'],
] as const;

let passed = 0;
for (const [name, tsx, css, expected] of regressions) {
  const failures = validateRebirthShell(tsx, css);
  if (!failures.some((failure) => failure.includes(expected))) {
    console.error(`Destructive shell selftest failed to reject: ${name}`);
    console.error(failures);
    process.exit(1);
  }
  passed += 1;
}

console.log(`UI Rebirth Stage 1 destructive shell selftest passed: ${passed}/${regressions.length} deliberate regressions rejected.`);
