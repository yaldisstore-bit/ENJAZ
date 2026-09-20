import { createClient } from '@supabase/supabase-js';

const LAB_REF = 'nqhgaukutkyvfumbtbtg';
const PRODUCTION_REF = 'juzxriirhkuzviwnhkbd';
const MARKER = 'phase13_4_a2_readback_real_cloud';
const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('MISSING_' + name);
  return value;
};

const ref = required('ENJAZ_A2_BRANCH_REF');
const url = required('SUPABASE_URL');
const publishable = required('SUPABASE_PUBLISHABLE_KEY');
const secret = required('SUPABASE_SECRET_KEY');
if (ref !== LAB_REF || ref === PRODUCTION_REF ||
    url !== `https://${LAB_REF}.supabase.co` ||
    process.env.PRODUCTION_PROJECT_REF !== PRODUCTION_REF ||
    process.env.ENJAZ_REAL_CLOUD_CONFIRM !== 'YES' ||
    process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM !== 'YES' ||
    secret === publishable || secret.startsWith('sb_publishable_')) {
  throw new Error('ISOLATED_RESIDUE_CLEANUP_TARGET_DENIED');
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const ensure = (condition, code) => { if (!condition) throw new Error(code); };
const check = async (table, filter = null) => {
  let query = admin.from(table).select('id', { count: 'exact', head: true });
  if (filter) query = query.eq('workspace_id', filter);
  const { count, error } = await query;
  if (error) throw new Error('ISOLATED_CLEANUP_READ_DENIED_' + table);
  return count;
};

// The prior interrupted Auth smoke created exactly two users and their empty
// workspaces. Never sweep unrelated accounts or businesses. This recovery is
// deliberately separate from the full A2 multi-domain destructive acceptance.
const { data: initial, error: initialError } =
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (initialError || !initial?.users) throw new Error('ISOLATED_CLEANUP_AUTH_LIST_DENIED');
const users = initial.users;
if (users.length === 0) {
  ensure(await check('workspaces') === 0, 'ISOLATED_CLEANUP_UNKNOWN_WORKSPACE_RESIDUE');
  console.log('PASS isolated Auth residue already empty; no deletion performed');
  process.exit(0);
}
ensure(users.length === 2, 'ISOLATED_CLEANUP_UNEXPECTED_AUTH_POPULATION');
const labels = users.map(user => user.user_metadata?.label).sort();
ensure(JSON.stringify(labels) === JSON.stringify(['outsider', 'owner']), 'ISOLATED_CLEANUP_UNEXPECTED_TEST_LABELS');
for (const user of users) {
  ensure(user.user_metadata?.enjaz_test_marker === MARKER &&
    user.email?.startsWith('enjaz-a2-') &&
    user.email.endsWith('@example.com'),
  'ISOLATED_CLEANUP_UNMARKED_AUTH_DENIED');
}
ensure(await check('workspaces') === 2, 'ISOLATED_CLEANUP_UNEXPECTED_WORKSPACE_COUNT');
for (const table of ['contacts', 'companies', 'transactions', 'import_jobs']) {
  ensure(await check(table) === 0, 'ISOLATED_CLEANUP_NONEMPTY_BUSINESS_' + table);
}
const workspaces = [];
for (const user of users) {
  const { data, error } = await admin.from('workspaces').select('id')
    .eq('owner_user_id', user.id).limit(2);
  if (error || data?.length !== 1) throw new Error('ISOLATED_CLEANUP_WORKSPACE_OWNER_MISMATCH');
  workspaces.push(data[0].id);
}
ensure(new Set(workspaces).size === 2, 'ISOLATED_CLEANUP_DUPLICATE_WORKSPACE');

for (const workspaceId of workspaces) {
  const { error } = await admin.from('workspaces').delete().eq('id', workspaceId);
  if (error) throw new Error('ISOLATED_CLEANUP_WORKSPACE_DELETE_FAILED_' + (error.code || 'UNKNOWN'));
}
for (const user of users) {
  const { error } = await admin.auth.admin.deleteUser(user.id, false);
  if (error) throw new Error('ISOLATED_CLEANUP_AUTH_DELETE_FAILED_' + (error.code || 'UNKNOWN'));
}
const { data: after, error: finalError } =
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (finalError || after?.users?.length !== 0 || await check('workspaces') !== 0) {
  throw new Error('ISOLATED_CLEANUP_ZERO_RESIDUE_NOT_VERIFIED');
}
console.log('PASS isolated marked Auth and workspace residue removed and verified (2 users, 2 workspaces)');
