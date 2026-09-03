import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import process from 'node:process';

const root = resolve(process.cwd());
const srcRoot = resolve(root, 'src');
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const files = await walk(srcRoot);
const normalize = (path) => path.split(sep).join('/');
const allowedSupabaseImports = new Set([
  'core/supabase/client.ts',
  'core/auth/SupabaseAuthGateway.ts',
]);
const allowedClientImports = new Set([
  'app/bootstrap.tsx',
  'core/auth/SupabaseAuthGateway.ts',
  'data/createDataLayer.ts',
  'data/supabase/SupabaseDataGateway.ts',
]);
const allowedFromCalls = new Set(['data/supabase/SupabaseDataGateway.ts']);
const allowedRpcCalls = new Set(['core/auth/SupabaseAuthGateway.ts']);

for (const file of files) {
  const rel = normalize(relative(srcRoot, file));
  const text = await readFile(file, 'utf8');
  if (text.includes("from '@supabase/supabase-js'") && !allowedSupabaseImports.has(rel)) {
    violations.push(`${rel}: direct @supabase/supabase-js import outside infrastructure adapter`);
  }
  if (/core\/supabase\/client/.test(text) && !allowedClientImports.has(rel) && rel !== 'core/supabase/client.ts') {
    violations.push(`${rel}: direct Supabase client dependency outside approved composition/adapters`);
  }
  if (/\.from\s*\(/.test(text) && !allowedFromCalls.has(rel)) {
    violations.push(`${rel}: direct Data API .from() call outside centralized data adapter`);
  }
  if (/\.rpc\s*\(/.test(text) && !allowedRpcCalls.has(rel)) {
    violations.push(`${rel}: direct RPC call outside approved auth infrastructure`);
  }
  if (rel.startsWith('features/') && /supabase/i.test(text)) {
    violations.push(`${rel}: feature layer contains Supabase coupling`);
  }
  if (rel.startsWith('data/') && /\.delete\s*\(/.test(text)) {
    violations.push(`${rel}: hard-delete primitive present in Phase 1.4 data layer`);
  }
}

const contracts = await readFile(resolve(srcRoot, 'data/contracts/dataTypes.ts'), 'utf8');
const adapter = await readFile(resolve(srcRoot, 'data/supabase/SupabaseDataGateway.ts'), 'utf8');
const generated = await readFile(resolve(srcRoot, 'core/supabase/database.types.ts'), 'utf8');
const baseline = await readFile(resolve(root, 'database/baseline/phase1_2_schema.sql'), 'utf8');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));


function parseConstArray(source, name) {
  const match = source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`));
  if (!match) return [];
  return [...match[1].matchAll(/'([a-z0-9_]+)'/g)].map((item) => item[1]);
}

function grantTables(sql, privilege) {
  const tables = [];
  const regex = /grant\s+([^;]+?)\s+on\s+public\.([a-z0-9_]+)\s+to\s+authenticated;/gi;
  for (const match of sql.matchAll(regex)) {
    const privileges = match[1].split(',').map((value) => value.trim().toLowerCase());
    if (privileges.includes(privilege)) tables.push(match[2]);
  }
  return tables.sort();
}

const baselineTables = [...baseline.matchAll(/create\s+table\s+public\.([a-z0-9_]+)\s*\(/gi)].map((match) => match[1]);
const missingGeneratedTables = baselineTables.filter((table) => !new RegExp(`^\\s{6}${table}: \\{$`, 'm').test(generated));
if (baselineTables.length !== 45) violations.push(`baseline: expected 45 tables, found ${baselineTables.length}`);
if (missingGeneratedTables.length) violations.push(`database.types.ts: missing generated tables ${missingGeneratedTables.join(', ')}`);
if (!adapter.includes("eq('workspace_id', scope.workspaceId)")) violations.push('data adapter: mandatory workspace scope predicate missing');
if (!adapter.includes("workspace_id cannot be supplied by callers")) violations.push('data adapter: workspace injection guard missing');
if (!adapter.includes('Immutable identity fields cannot be patched')) violations.push('data adapter: immutable identity patch guard missing');
if (!contracts.includes('MAX_PAGE_SIZE = 100')) violations.push('data contracts: page-size hard cap missing');
if (!contracts.includes("column === 'workspace_id'")) violations.push('data contracts: caller workspace filter override guard missing');
if (!baseline.includes('grant select, insert on public.payments to authenticated;')) violations.push('baseline: expected immutable payment grant contract missing');
if (!baseline.includes('grant select on public.audit_events to authenticated;')) violations.push('baseline: expected audit read-only grant contract missing');

const insertContract = parseConstArray(contracts, 'INSERTABLE_WORKSPACE_TABLES').sort();
const updateContract = parseConstArray(contracts, 'UPDATABLE_WORKSPACE_TABLES').sort();
const expectedInsert = grantTables(baseline, 'insert').filter((table) => !['profiles', 'workspaces'].includes(table));
const expectedUpdate = grantTables(baseline, 'update').filter((table) => !['profiles', 'workspaces'].includes(table));
if (JSON.stringify(insertContract) !== JSON.stringify(expectedInsert)) violations.push('data contracts: insert capability set diverges from baseline grants');
if (JSON.stringify(updateContract) !== JSON.stringify(expectedUpdate)) violations.push('data contracts: update capability set diverges from baseline grants');

if (!packageJson.scripts?.['audit:data']) violations.push('package.json: audit:data script missing');

if (violations.length) {
  console.error('ENJAZ DATA LAYER AUDIT FAIL');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log(`ENJAZ DATA LAYER AUDIT PASS — 45-table snapshot, centralized Supabase access, workspace scoping, capability boundaries and no hard-delete primitive verified.`);
