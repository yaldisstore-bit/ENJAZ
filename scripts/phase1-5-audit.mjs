import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(process.argv[2] ?? process.cwd());
const read = (path) => readFile(resolve(root, path), 'utf8');

const stripSqlLineComments = (sql) => sql.replace(/--.*$/gm, '');

const files = {
  gateway: await read('src/data/supabase/SupabaseDataGateway.ts'),
  dataErrors: await read('src/data/contracts/DataAccessError.ts'),
  auth: await read('src/features/auth/services/authService.ts'),
  bootstrap: await read('database/migrations/phase_1_3_auth_workspace_bootstrap.sql'),
  recursionFix: await read('database/migrations/phase_1_5_break_membership_rls_recursion.sql'),
};

const recursionSql = stripSqlLineComments(files.recursionFix);
const occursBefore = (text, first, second) => {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  return firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex;
};

const checks = [
  ['read/write deadlines exist', /DEFAULT_DATA_TIMEOUT_MS\s*=\s*15_000/.test(files.gateway) && /settleDataOperation/.test(files.gateway)],
  ['write ambiguity has distinct error', files.dataErrors.includes("'DATA_OUTCOME_UNKNOWN'") && files.gateway.includes("kind === 'write' ? 'DATA_OUTCOME_UNKNOWN'")],
  ['thrown transport failures normalized', /normalizeThrownDataFailure/.test(files.gateway) && /failed to fetch\|network\|timeout\|connection\|abort/i.test(files.dataErrors)],
  ['no automatic retry primitive in data gateway', !/\bretry\b|retryCount|backoff|setInterval/i.test(files.gateway)],
  ['filter validation happens before query construction', occursBefore(files.gateway, 'for (const filter of request.filters ?? []) validateFilter(filter)', 'let query = dataClient.from(table)')],
  ['insert payload validated before from()', occursBefore(files.gateway, 'const payload = createPayload(scope, values)', 'dataClient.from(table).insert(payload)')],
  ['update patch validated before from()', occursBefore(files.gateway, 'const safePatch = createPatch(patch)', 'dataClient.from(table).update(safePatch)')],
  ['expired session classification exists', files.auth.includes("code: 'AUTH_SESSION_EXPIRED'") && files.auth.includes("'refresh_token_not_found'")],
  ['auth network classification exists', files.auth.includes("code: 'NETWORK_UNAVAILABLE'") && /failed to fetch\|network\|timeout/.test(files.auth)],
  ['bootstrap has transaction advisory lock', /pg_advisory_xact_lock/.test(files.bootstrap)],
  ['RLS recursion helper lives in private schema', /create\s+or\s+replace\s+function\s+private\.is_workspace_owner\s*\(p_workspace_id\s+uuid\)/i.test(recursionSql)],
  ['RLS recursion helper is security definer', /create\s+or\s+replace\s+function\s+private\.is_workspace_owner[\s\S]*?security\s+definer[\s\S]*?as\s+\$\$/i.test(recursionSql)],
  ['RLS recursion helper fixes search_path', /set\s+search_path\s*=\s*''/i.test(recursionSql)],
  ['RLS recursion helper denied to anon/public', /revoke\s+all\s+on\s+function\s+private\.is_workspace_owner\(uuid\)\s+from\s+public/i.test(recursionSql) && /revoke\s+all\s+on\s+function\s+private\.is_workspace_owner\(uuid\)\s+from\s+anon/i.test(recursionSql)],
  ['membership insert policy uses private helper', /create\s+policy\s+workspace_memberships_insert_owner_self[\s\S]*private\.is_workspace_owner\(workspace_id\)/i.test(recursionSql)],
  ['no public security-definer introduced', !/create\s+(?:or\s+replace\s+)?function\s+public\.[\s\S]{0,320}?security\s+definer/i.test(recursionSql)],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error('ENJAZ PHASE 1.5 DESTRUCTION AUDIT FAIL');
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log(`ENJAZ PHASE 1.5 DESTRUCTION AUDIT PASS — ${checks.length}/${checks.length} resilience and RLS-recursion guards satisfied.`);
