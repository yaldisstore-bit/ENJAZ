import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(process.cwd());
const audit = resolve(root, 'scripts/phase1-5-audit.mjs');
const probes = [
  {
    name: 'remove_write_ambiguity',
    file: 'src/data/contracts/DataAccessError.ts',
    mutate: (text) => text.replaceAll('DATA_OUTCOME_UNKNOWN', 'DATA_UNAVAILABLE'),
  },
  {
    name: 'remove_transport_normalization',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (text) => text.replaceAll('normalizeThrownDataFailure', 'unsafeRawFailure'),
  },
  {
    name: 'remove_bootstrap_lock',
    file: 'database/migrations/phase_1_3_auth_workspace_bootstrap.sql',
    mutate: (text) => text.replace('perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));', '-- removed by destructive probe'),
  },
  {
    name: 'make_recursion_helper_invoker',
    file: 'database/migrations/phase_1_5_break_membership_rls_recursion.sql',
    mutate: (text) => text.replace('security definer', 'security invoker'),
  },
  {
    name: 'allow_anon_helper',
    file: 'database/migrations/phase_1_5_break_membership_rls_recursion.sql',
    mutate: (text) => text.replace('revoke all on function private.is_workspace_owner(uuid) from anon;', 'grant execute on function private.is_workspace_owner(uuid) to anon;'),
  },
  {
    name: 'remove_prevalidation',
    file: 'src/data/supabase/SupabaseDataGateway.ts',
    mutate: (text) => text.replace('for (const filter of request.filters ?? []) validateFilter(filter);', '// removed by destructive probe'),
  },
];

let passed = 0;
for (const probe of probes) {
  const base = await mkdtemp(join(tmpdir(), 'enjaz-phase15-'));
  const copy = join(base, 'project');
  try {
    await cp(root, copy, { recursive: true, filter: (source) => !source.includes('/node_modules') && !source.endsWith('.zip') });
    const target = join(copy, probe.file);
    const before = await readFile(target, 'utf8');
    const after = probe.mutate(before);
    if (after === before) throw new Error(`probe ${probe.name} made no mutation`);
    await writeFile(target, after);
    const result = spawnSync(process.execPath, [audit, copy], { encoding: 'utf8' });
    if (result.status === 0) throw new Error(`probe ${probe.name} was not rejected`);
    console.log(`PASS destructive probe ${probe.name}: corruption rejected`);
    passed += 1;
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}
console.log(`ENJAZ PHASE 1.5 SELFTEST PASS — ${passed}/${probes.length} deliberate resilience/security corruptions rejected.`);
