import { mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function runAudit() {
  return spawnSync(process.execPath, ['scripts/foundation-audit.mjs'], {
    cwd: process.cwd(), encoding: 'utf8',
  });
}

async function expectRejected(path, payload, expectedText) {
  await mkdir(resolve(path, '..'), { recursive: true });
  try {
    await writeFile(path, payload, { flag: 'wx' });
    const result = runAudit();
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status === 0) throw new Error(`audit accepted deliberate violation: ${expectedText}`);
    if (!output.includes(expectedText)) throw new Error(`audit failed for an unexpected reason; expected ${expectedText}`);
  } finally {
    await rm(path, { force: true });
  }
}

await expectRejected(
  resolve(process.cwd(), 'src', '__foundation_break_probe__.css'),
  '.probe { color: red !important; z-index: 999999; }\n',
  '!important',
);

await expectRejected(
  resolve(process.cwd(), 'src', 'core', '__architecture_break_probe__.ts'),
  "import '../features/foundation/pages/HomePlaceholder';\nexport const probe = true;\n",
  'core cannot import features',
);

await expectRejected(
  resolve(process.cwd(), 'src', '__persistence_break_probe__.ts'),
  "export const probe = () => localStorage.getItem('x');\n",
  'direct persistence/network primitive',
);

const finalAudit = runAudit();
if (finalAudit.status !== 0) {
  console.error(finalAudit.stdout, finalAudit.stderr);
  throw new Error('foundation audit did not recover after self-test cleanup');
}

console.log('ENJAZ AUDIT SELFTEST PASS — CSS override, architecture breach, and direct persistence probes were all rejected.');
