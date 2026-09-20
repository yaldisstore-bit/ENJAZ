import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

// An independently authenticated J03 slice, NOT eleven-domain acceptance.
// The test refuses production/unknown targets and requires an entirely empty disposable lab.
const LAB = 'nqhgaukutkyvfumbtbtg';
const PROD = 'juzxriirhkuzviwnhkbd';
const MARKER = 'phase14_1_a2_j03_procedure_real_cloud';
const OUT = 'artifacts/phase14-1-a2-j03-procedure/evidence.json';
const env = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('MISSING_' + name);
  return value;
};
const ref = env('ENJAZ_A2_BRANCH_REF');
const url = env('SUPABASE_URL');
const key = env('SUPABASE_PUBLISHABLE_KEY');
const secret = env('SUPABASE_SECRET_KEY');
if (ref !== LAB || ref === PROD || url !== `https://${LAB}.supabase.co` ||
    process.env.PRODUCTION_PROJECT_REF !== PROD ||
    process.env.ENJAZ_REAL_CLOUD_CONFIRM !== 'YES' ||
    process.env.ENJAZ_A2_ISOLATED_BRANCH_CONFIRM !== 'YES' ||
    key === secret || secret.startsWith('sb_publishable_')) {
  throw new Error('ISOLATED_J03_TARGET_DENIED');
}
const clientConfig = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secret, clientConfig);
const client = () => createClient(url, key, clientConfig);
const users = [];
const report = { schema: 'enjaz.phase14-1.a2.j03-real-cloud.v1', projectRef: LAB,
  productionProjectRef: PROD, scope: ['J01_COMPANY','J02_TRANSACTION','J03_PROCEDURE'],
  completeElevenDomainA2: false, phase14_1Closed: false, passed: false,
  cleanupPassed: false, checks: [], cleanup: [], startedAt: new Date().toISOString() };
const verify = (ok, code) => {
  if (!ok) throw new Error('FAILED_' + code);
  report.checks.push(code);
  console.log('PASS A2 J03 ' + code);
};
const readCount = async (table, workspaceId = null) => {
  let q = admin.from(table).select('*', { head: true, count: 'exact' });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const r = await q;
  if (r.error || !Number.isInteger(r.count)) throw new Error('COUNT_DENIED_' + table);
  return r.count;
};
async function makeUser(label) {
  const email = `enjaz-a2-j03-${label}-${randomUUID()}@example.com`;
  const password = 'Enjaz!14.1-' + randomUUID() + 'Aa9';
  const result = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { enjaz_test_marker: MARKER, label },
  });
  if (result.error || !result.data?.user?.id) throw new Error('TEST_USER_CREATE_FAILED');
  const user = { id: result.data.user.id, email, password, client: client() };
  users.push(user);
  const login = await user.client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data?.session?.access_token) throw new Error('REAL_USER_SIGN_IN_FAILED');
  let workspaces;
  for (let k = 0; k < 40; k++) {
    const r = await admin.from('workspaces').select('id').eq('owner_user_id', user.id).limit(2);
    if (r.error) throw new Error('BOOTSTRAP_READ_DENIED');
    workspaces = r.data;
    if (workspaces?.length === 1) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  verify(workspaces?.length === 1, label + '_REAL_AUTH_WORKSPACE_BOOTSTRAP');
  user.workspaceId = workspaces[0].id;
  return user;
}
async function insert(table, row, label) {
  const { data, error } = await admin.from(table).insert(row).select('id').single();
  if (error || !data?.id) throw new Error('CATALOG_FIXTURE_' + label);
  return data.id;
}
const params = (workspace, transaction, procedure, operationKey) => ({
  p_workspace_id: workspace, p_transaction_id: transaction,
  p_procedure_id: procedure, p_branch_id: null, p_idempotency_key: operationKey,
});
async function run() {
  const usersBefore = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersBefore.error || !usersBefore.data?.users) throw new Error('AUTH_BASELINE_DENIED');
  verify(usersBefore.data.users.length === 0 &&
    (await Promise.all(['workspaces','companies','transactions','workflow_instances'].map(x => readCount(x)))).every(x => x === 0),
    'EXCLUSIVE_EMPTY_LAB_BEFORE_J03');

  const owner = await makeUser('owner');
  const outsider = await makeUser('outsider');
  const ws = owner.workspaceId;
  verify(ws !== outsider.workspaceId, 'INDEPENDENT_AUTH_WORKSPACES');
  // Catalog scaffolding is explicitly inserted by test admin, while all J03
  // business commands below are executed with a real independent user JWT.
  const entityId = await insert('government_entities',
    { workspace_id: ws, name: 'J03 isolated test entity', entity_type: 'other' }, 'ENTITY');
  const templateId = await insert('workflow_templates',
    { workspace_id: ws, name: 'J03 isolated template' }, 'TEMPLATE');
  await insert('workflow_template_stages',
    { workspace_id: ws, workflow_template_id: templateId, position: 1,
      name: 'J03 isolated stage' }, 'STAGE');
  const procedureId = await insert('government_procedures',
    { workspace_id: ws, government_entity_id: entityId, workflow_template_id: templateId,
      code: 'J03-' + randomUUID().slice(0,8), name: 'J03 isolated procedure' }, 'PROCEDURE');
  const ownerCompany = await owner.client.from('companies').insert({
    workspace_id: ws, legal_name: 'شركة اختبار إجراء J03', capital: 120.50,
  }).select('id').single();
  if (ownerCompany.error || !ownerCompany.data?.id) throw new Error('J01_AUTHENTICATED_COMPANY_CREATE_FAILED');
  const ownerTransaction = await owner.client.from('transactions').insert({
    workspace_id: ws, company_id: ownerCompany.data.id,
    type: 'phase14_1_real_j03', current_fee: 135.25,
  }).select('id,company_id,workspace_id').single();
  if (ownerTransaction.error || !ownerTransaction.data?.id) throw new Error('J02_AUTHENTICATED_TRANSACTION_CREATE_FAILED');
  const tx = ownerTransaction.data;
  verify(tx.workspace_id === ws && tx.company_id === ownerCompany.data.id,
    'J01_J02_AUTHENTICATED_LINEAGE');

  const key1 = randomUUID();
  const rpcArgs = params(ws,tx.id,procedureId,key1);
  const start = await owner.client.rpc('start_government_procedure_v1',rpcArgs);
  if (start.error || !start.data?.instanceId || start.data?.wasDuplicate !== false)
    throw new Error('J03_AUTHENTICATED_START_FAILED');
  const instanceId = start.data.instanceId;
  verify(start.data?.transactionId === tx.id && start.data?.procedureId === procedureId &&
    start.data?.currentStagePosition === 1 && start.data?.status === 'active',
    'J03_AUTHENTICATED_PROCEDURE_STARTED_FROM_SOURCE_TRANSACTION');

  const fresh = client();
  const newSession = await fresh.auth.signInWithPassword({ email: owner.email, password: owner.password });
  if (newSession.error || !newSession.data?.session?.access_token) throw new Error('FRESH_AUTH_LOGIN_FAILED');
  const instance = await fresh.from('workflow_instances').select(
    'id,workspace_id,transaction_id,government_procedure_id,workflow_template_id,current_stage_position,status')
    .eq('id',instanceId).single();
  verify(!instance.error && instance.data?.workspace_id === ws &&
    instance.data?.transaction_id === tx.id &&
    instance.data?.government_procedure_id === procedureId &&
    instance.data?.workflow_template_id === templateId &&
    instance.data?.current_stage_position === 1 && instance.data?.status === 'active',
    'J03_DURABLE_FRESH_JWT_RELOAD');

  const replay = await owner.client.rpc('start_government_procedure_v1',rpcArgs);
  verify(!replay.error && replay.data?.wasDuplicate === true &&
    replay.data?.instanceId === instanceId && await readCount('workflow_instances',ws) === 1,
    'J03_IDEMPOTENT_REPLAY_ONE_INSTANCE');

  const [outsiderRead, outsiderStart] = await Promise.all([
    outsider.client.from('workflow_instances').select('id').eq('id',instanceId),
    outsider.client.rpc('start_government_procedure_v1',
      params(ws,tx.id,procedureId,randomUUID())),
  ]);
  verify((outsiderRead.error || outsiderRead.data?.length === 0) &&
    Boolean(outsiderStart.error) &&
    await readCount('workflow_instances',ws) === 1,
    'J03_OUTSIDER_READ_AND_START_DENIED');

  const foreignTx = await outsider.client.from('companies')
    .insert({workspace_id: outsider.workspaceId,legal_name:'J03 outsider company'})
    .select('id').single();
  if (foreignTx.error || !foreignTx.data?.id) throw new Error('OUTSIDER_FIXTURE_FAILED');
  const mismatch = await outsider.client.rpc('start_government_procedure_v1',
    params(outsider.workspaceId,tx.id,procedureId,randomUUID()));
  verify(Boolean(mismatch.error) && await readCount('workflow_instances',ws) === 1,
    'J03_DIFFERENT_WORKSPACE_PROCEDURE_AND_TRANSACTION_DENIED');
}
async function cleanup() {
  let clean = true;
  for (const user of users) {
    try {
      const { data, error } = await admin.from('workspaces').select('id')
        .eq('owner_user_id',user.id).limit(2);
      if (error || (data?.length ?? 0) > 1) throw new Error('AMBIGUOUS_OWNER_WORKSPACE');
      if (data?.length === 1) {
        const ws = data[0].id;
        // Removal is scoped to marked users' new disposable workspaces only.
        const { error: deleteError } = await admin.from('workspaces').delete()
          .eq('id',ws).eq('owner_user_id',user.id);
        if (deleteError) throw new Error('SCOPED_WORKSPACE_DELETE_DENIED');
      }
      report.cleanup.push({kind:'marked_workspace',passed:true});
    } catch {
      clean=false;
      report.cleanup.push({kind:'marked_workspace',passed:false});
    }
  }
  for (const user of users) {
    try {
      const { error } = await admin.auth.admin.deleteUser(user.id,false);
      if (error) throw new Error('MARKED_USER_DELETE_DENIED');
      report.cleanup.push({kind:'marked_auth_user',passed:true});
    } catch {
      clean=false;
      report.cleanup.push({kind:'marked_auth_user',passed:false});
    }
  }
  try {
    const after = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (after.error || after.data?.users?.some(u=>u.user_metadata?.enjaz_test_marker===MARKER) ||
        (await Promise.all(['workspaces','companies','transactions','government_entities',
          'government_procedures','workflow_templates','workflow_instances','workflow_transition_events']
          .map(t=>readCount(t)))).some(n=>n!==0)) throw new Error('J03_RESIDUE_DETECTED');
    report.cleanup.push({kind:'independent_auth_and_business_zero_residue',passed:true});
  } catch {
    clean=false;
    report.cleanup.push({kind:'independent_auth_and_business_zero_residue',passed:false});
  }
  report.cleanupPassed=clean;
}
let failure=null;
try { await run(); } catch (error) {
  failure=String(error?.message??'UNKNOWN').slice(0,110);
  console.error('J03_TEST_FAILED',failure);
} finally {
  await cleanup();
  report.completedAt=new Date().toISOString();
  report.passed=failure===null && report.cleanupPassed;
  if (failure) report.failureCode=failure;
  await mkdir('artifacts/phase14-1-a2-j03-procedure',{recursive:true});
  await writeFile(OUT,JSON.stringify(report,null,2)+'\n');
}
if (failure || !report.cleanupPassed) process.exitCode=1;
