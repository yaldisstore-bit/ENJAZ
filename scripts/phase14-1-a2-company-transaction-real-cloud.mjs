import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const LAB = 'nqhgaukutkyvfumbtbtg';
const PRODUCTION = 'juzxriirhkuzviwnhkbd';
const MARKER = 'phase14_1_a2_company_transaction_real_cloud';
const OUT = 'artifacts/phase14-1-a2-company-transaction-real-cloud/evidence.json';
const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('MISSING_' + name);
  return value;
};
const ref = required('ENJAZ_A2_BRANCH_REF');
const origin = required('SUPABASE_URL');
const publishable = required('SUPABASE_PUBLISHABLE_KEY');
const secret = required('SUPABASE_SECRET_KEY');
if (ref !== LAB || ref === PRODUCTION ||
    process.env.PRODUCTION_PROJECT_REF !== PRODUCTION ||
    origin !== `https://${LAB}.supabase.co` ||
    secret === publishable || secret.startsWith('sb_publishable_') ||
    process.env.ENJAZ_REAL_CLOUD_CONFIRM !== 'YES' ||
    process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM !== 'YES') {
  throw new Error('ISOLATED_J01_J02_TARGET_DENIED');
}

const config = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(origin, secret, config);
const makeClient = () => createClient(origin, publishable, config);
const users = [];
const evidence = {
  schema: 'enjaz.phase14-1.a2.hosted-j01-j02.v1',
  projectRef: LAB, productionProjectRef: PRODUCTION,
  startedAt: new Date().toISOString(), completedAt: null,
  passed: false, cleanupPassed: false, checks: [], cleanup: [],
  scope: ['J01_COMPANY', 'J02_TRANSACTION'],
  completeElevenDomainA2: false, phase14_1Closed: false,
};
const ensure = (condition, code) => {
  if (!condition) throw new Error('FAILED_' + code);
  evidence.checks.push({ name: code, passed: true });
  console.log('PASS 14.1 A2 J01/J02 ' + code);
};
const count = async (table, workspace = null) => {
  let query = admin.from(table).select('id', { head: true, count: 'exact' });
  if (workspace) query = query.eq('workspace_id', workspace);
  const { count: n, error } = await query;
  if (error || !Number.isInteger(n)) throw new Error('COUNT_DENIED_' + table);
  return n;
};
const ownerWorkspaces = async id => {
  const { data, error } = await admin.from('workspaces').select('id').eq('owner_user_id', id).limit(2);
  if (error) throw new Error('OWNER_WORKSPACE_READ_DENIED');
  return data ?? [];
};
async function bootstrap(label) {
  const email = `enjaz-14-1-a2-${label}-${randomUUID()}@example.com`;
  const password = 'Enjaz!14.1-' + randomUUID() + 'Aa9';
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { enjaz_test_marker: MARKER, label },
  });
  if (error || !data?.user) throw new Error('AUTH_USER_CREATION_FAILED');
  const user = { id: data.user.id, email, password, label, client: makeClient() };
  users.push(user);
  const signIn = await user.client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session?.access_token) throw new Error('REAL_AUTH_LOGIN_FAILED');
  let workspaces = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    workspaces = await ownerWorkspaces(user.id);
    if (workspaces.length === 1) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  ensure(workspaces.length === 1, label + '_WORKSPACE_BOOTSTRAP');
  user.workspaceId = workspaces[0].id;
  return user;
}
async function test() {
  const baselineUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (baselineUsers.error || !baselineUsers.data?.users) throw new Error('BASELINE_AUTH_READ_DENIED');
  ensure(baselineUsers.data.users.length === 0 &&
    (await Promise.all(['workspaces', 'companies', 'transactions'].map(t => count(t)))).every(n => n === 0),
  'EXCLUSIVE_EMPTY_ISOLATED_LAB_PREREQUISITE');

  const owner = await bootstrap('owner');
  const outsider = await bootstrap('outsider');
  const ws = owner.workspaceId;
  const otherWs = outsider.workspaceId;
  ensure(ws !== otherWs, 'INDEPENDENT_WORKSPACES');

  const ownerCompanyResult = await owner.client.from('companies')
    .insert({ workspace_id: ws, legal_name: 'شركة تكامل تجريبية J01', display_name: 'J01 real cloud', capital: 120.50 })
    .select('id,workspace_id,legal_name,capital').single();
  if (ownerCompanyResult.error || !ownerCompanyResult.data) throw new Error('J01_OWNER_CREATE_FAILED');
  const company = ownerCompanyResult.data;
  ensure(company.workspace_id === ws && company.legal_name === 'شركة تكامل تجريبية J01',
    'J01_OWNER_AUTHENTICATED_COMPANY_CREATE');

  const outsiderCompanyResult = await outsider.client.from('companies')
    .insert({ workspace_id: otherWs, legal_name: 'شركة خارج مساحة العمل J01', capital: 240.50 })
    .select('id,workspace_id').single();
  if (outsiderCompanyResult.error || !outsiderCompanyResult.data) throw new Error('J01_OUTSIDER_OWN_COMPANY_CREATE_FAILED');
  const foreignCompany = outsiderCompanyResult.data;

  const transactionResult = await owner.client.from('transactions')
    .insert({ workspace_id: ws, company_id: company.id, type: 'phase14_1_j01_j02_qa', current_fee: 135.25 })
    .select('id,workspace_id,company_id,type,current_fee,status').single();
  if (transactionResult.error || !transactionResult.data) throw new Error('J02_OWNER_CREATE_FAILED');
  const transaction = transactionResult.data;
  ensure(transaction.workspace_id === ws && transaction.company_id === company.id &&
    Number(transaction.current_fee) === 135.25 && transaction.status === 'active',
  'J02_AUTHENTICATED_TRANSACTION_COMPANY_LINK');

  const freshOwnerClient = makeClient();
  const relogin = await freshOwnerClient.auth.signInWithPassword({ email: owner.email, password: owner.password });
  if (relogin.error || !relogin.data.session?.access_token) throw new Error('J01_J02_FRESH_LOGIN_FAILED');
  const [reloadedCompany, reloadedTransaction] = await Promise.all([
    freshOwnerClient.from('companies').select('id,workspace_id,legal_name').eq('id', company.id).single(),
    freshOwnerClient.from('transactions').select('id,workspace_id,company_id,current_fee').eq('id', transaction.id).single(),
  ]);
  ensure(!reloadedCompany.error && !reloadedTransaction.error &&
    reloadedCompany.data?.id === company.id && reloadedTransaction.data?.id === transaction.id &&
    reloadedTransaction.data?.company_id === reloadedCompany.data?.id &&
    reloadedTransaction.data?.workspace_id === ws && Number(reloadedTransaction.data?.current_fee) === 135.25,
  'J01_J02_DURABLE_FRESH_SESSION_RELOAD');

  const [outsiderCompanyRead, outsiderTransactionRead] = await Promise.all([
    outsider.client.from('companies').select('id').eq('id', company.id),
    outsider.client.from('transactions').select('id').eq('id', transaction.id),
  ]);
  ensure(!outsiderCompanyRead.error && !outsiderTransactionRead.error &&
    outsiderCompanyRead.data?.length === 0 && outsiderTransactionRead.data?.length === 0,
  'J01_J02_OUTSIDER_CANNOT_READ_OWNER_RECORDS');

  const deniedCompany = await outsider.client.from('companies')
    .insert({ workspace_id: ws, legal_name: 'DENIED foreign workspace company' }).select('id');
  ensure(Boolean(deniedCompany.error) && (await count('companies', ws)) === 1,
    'J01_OUTSIDER_CANNOT_CREATE_IN_OWNER_WORKSPACE');

  const deniedTransaction = await outsider.client.from('transactions')
    .insert({ workspace_id: ws, company_id: company.id, type: 'DENIED foreign transaction', current_fee: 10 })
    .select('id');
  ensure(Boolean(deniedTransaction.error) && (await count('transactions', ws)) === 1,
    'J02_OUTSIDER_CANNOT_CREATE_IN_OWNER_WORKSPACE');

  const invalidLink = await owner.client.from('transactions')
    .insert({ workspace_id: ws, company_id: foreignCompany.id, type: 'DENIED mismatched company', current_fee: 10 })
    .select('id');
  ensure(Boolean(invalidLink.error) && (await count('transactions', ws)) === 1,
    'J02_CROSS_WORKSPACE_COMPANY_FK_REJECTED');

  const anonymous = makeClient();
  const [anonCompany, anonTransaction] = await Promise.all([
    anonymous.from('companies').select('id').eq('id', company.id),
    anonymous.from('transactions').select('id').eq('id', transaction.id),
  ]);
  ensure((Boolean(anonCompany.error) || anonCompany.data?.length === 0) &&
    (Boolean(anonTransaction.error) || anonTransaction.data?.length === 0),
  'J01_J02_ANONYMOUS_CANNOT_READ_OWNER_RECORDS');

  const ownerUpdate = await owner.client.from('companies').update({ display_name: 'J01 refreshed' })
    .eq('id', company.id).eq('workspace_id', ws).select('id,display_name').single();
  ensure(!ownerUpdate.error && ownerUpdate.data?.display_name === 'J01 refreshed',
    'J01_OWNER_SCOPED_COMPANY_EDIT');
  const refreshedTransaction = await freshOwnerClient.from('transactions')
    .select('id,company_id').eq('id', transaction.id).single();
  ensure(!refreshedTransaction.error && refreshedTransaction.data?.company_id === company.id,
    'J02_RELATION_SURVIVES_COMPANY_EDIT');
}

async function cleanup() {
  let clean = true;
  // Only the UUIDs belonging to freshly created, marked test Auth users can be removed.
  for (const user of users) {
    try {
      const workspaces = await ownerWorkspaces(user.id);
      if (workspaces.length > 1) throw new Error('AMBIGUOUS_TEST_WORKSPACE');
      for (const ws of workspaces) {
        const { data, error } = await admin.from('workspaces').delete()
          .eq('id', ws.id).eq('owner_user_id', user.id).select('id');
        if (error || data?.length !== 1) throw new Error('MARKED_WORKSPACE_DELETE_FAILED');
      }
      evidence.cleanup.push({ kind: 'marked_test_workspace', passed: true });
    } catch {
      clean = false;
      evidence.cleanup.push({ kind: 'marked_test_workspace', passed: false });
    }
  }
  for (const user of users) {
    try {
      const { error } = await admin.auth.admin.deleteUser(user.id, false);
      if (error) throw new Error('MARKED_AUTH_DELETE_FAILED');
      evidence.cleanup.push({ kind: 'marked_test_auth_user', passed: true });
    } catch {
      clean = false;
      evidence.cleanup.push({ kind: 'marked_test_auth_user', passed: false });
    }
  }
  try {
    const remainingUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (remainingUsers.error || remainingUsers.data?.users?.some(u => u.user_metadata?.enjaz_test_marker === MARKER) ||
        (await Promise.all(['workspaces', 'companies', 'transactions'].map(t => count(t)))).some(n => n !== 0)) {
      throw new Error('ISOLATED_J01_J02_RESIDUE_FOUND');
    }
    evidence.cleanup.push({ kind: 'independent_auth_business_residue_sweep', passed: true });
  } catch {
    clean = false;
    evidence.cleanup.push({ kind: 'independent_auth_business_residue_sweep', passed: false });
  }
  evidence.cleanupPassed = clean;
}
let fatal = null;
try { await test(); } catch (error) {
  fatal = error;
  // Never print tokens, SQL row contents, URLs or user identifiers.
  console.error('ISOLATED_J01_J02_TEST_FAILED', String(error?.message ?? 'UNKNOWN').slice(0, 120));
} finally {
  await cleanup();
  evidence.completedAt = new Date().toISOString();
  evidence.passed = fatal === null && evidence.cleanupPassed;
  if (fatal) evidence.failureCode = String(fatal?.message ?? 'UNKNOWN').slice(0, 120);
  await mkdir('artifacts/phase14-1-a2-company-transaction-real-cloud', { recursive: true });
  await writeFile(OUT, JSON.stringify(evidence, null, 2) + '\n');
}
if (fatal || !evidence.cleanupPassed) process.exitCode = 1;
