import { writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const probe = resolve(process.cwd(), 'src/features/foundation/__data_layer_break_probe__.ts');
function runAudit() {
  return spawnSync(process.execPath, ['scripts/data-layer-audit.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
}

const cases = [
  ["import { createClient } from '@supabase/supabase-js';\nexport const bad = createClient;\n", 'direct @supabase/supabase-js import'],
  ["export const bad = (client: { from(name: string): unknown }) => client.from('companies');\n", 'direct Data API .from() call'],
  ["export const bad = 'supabase';\n", 'feature layer contains Supabase coupling'],
];

for (const [payload, expected] of cases) {
  try {
    await writeFile(probe, payload, { flag: 'wx' });
    const result = runAudit();
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status === 0) throw new Error(`data audit accepted deliberate violation: ${expected}`);
    if (!output.includes(expected)) throw new Error(`data audit rejected probe for unexpected reason; expected ${expected}`);
  } finally {
    await rm(probe, { force: true });
  }
}

const final = runAudit();
if (final.status !== 0) throw new Error(`data audit did not recover:\n${final.stdout}\n${final.stderr}`);
console.log(`ENJAZ DATA LAYER SELFTEST PASS — ${cases.length}/${cases.length} deliberate architecture breaches rejected.`);
