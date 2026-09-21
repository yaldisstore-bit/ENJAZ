import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { checkLinkedFollowup } from './phase14-1-a2-j05-linked-followup-extension.mjs';
import { checkLinkedFinance } from './phase14-1-a2-j06-linked-finance-extension.mjs';
import { checkLinkedDocument } from './phase14-1-a2-j07-linked-document-extension.mjs';
import { checkLinkedClientPortal } from './phase14-1-a2-j08-client-auth-gateway-extension.mjs';
import { checkLinkedArchive } from './phase14-1-a2-j09-linked-archive-extension.mjs';
import { cleanupDiagnostic, removeLinkedFixtureWorkspace } from './phase14-1-a2-linked-cleanup.mjs';
import { checkLinkedGovernance } from './phase14-1-a2-j10-linked-governance-extension.mjs';
import { checkLinkedContract } from './phase14-1-a2-j11-linked-contract-extension.mjs';

// J01-J11 linked happy path and selected negatives; NOT the complete A2 role,
// expiry, source-gateway, client-approval or browser acceptance matrix.
// The test refuses production/unknown targets and requires an entirely empty disposable lab.
// Guarded recovery run 35566685297 re-established zero Auth/business residue before this rerun.
const LAB = 'nqhgaukutkyvfumbtbtg';
const PROD = 'juzxriirhkuzviwnhkbd';
const MARKER = 'phase14_1_a2_j04_field_real_cloud';
const OUT = 'artifacts/phase14-1-a2-j04-field/evidence.json';
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
const storagePaths = new Set();
const report = { schema: 'enjaz.phase14-1.a2.j11-linked-real-cloud.v1', projectRef: LAB,
  productionProjectRef: PROD, scope: ['J01_COMPANY','J02_TRANSACTION','J03_PROCEDURE','J04_FIELD','J05_FOLLOWUP','J06_PAYMENT','J07_DOCUMENT','J08_CLIENT_PORTAL','J09_ARCHIVE','J10_GOVERNANCE','J11_ENGAGEMENT'],
  completeElevenDomainA2: false, phase14_1Closed: false, passed: false,
  cleanupPassed: false, checks: [], cleanup: [], startedAt: new Date().toISOString() };
const verify = (ok, code) => {
  if (!ok) throw new Error('FAILED_' + code);
  report.checks.push(code);
  console.log('PASS A2 J04 ' + code);
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
    (await Promise.all(['workspaces','companies','transactions','workflow_instances','field_assignments','field_visits','field_sync_receipts','transaction_followups','payments','payment_reversals',
      'document_templates','document_template_versions','document_drafts',
      'pdf_jobs','documents','document_versions','document_upload_sessions',
      'client_portal_principals','client_portal_grants','client_portal_resource_shares',
      'corporate_ownership_stakes','corporate_governance_events','corporate_registry_states',
      'corporate_beneficial_owners','corporate_authority_grants','corporate_capital_events',
      'corporate_resolutions','corporate_ownership_states','commercial_engagements',
      'engagement_contract_revisions'].map(x => readCount(x)))).every(x => x === 0),
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

  // J04: the same authenticated transaction and active procedure must feed
  // the real field assignment/visit RPCs. No direct test-admin field writes.
  const assignmentArgs = {
    p_workspace_id: ws, p_assignment_id: null, p_expected_version: null,
    p_transaction_id: tx.id, p_assigned_user_id: owner.id,
    p_scheduled_for: '2026-09-21', p_destination_label: 'J04 isolated office',
    p_department: 'QA', p_priority: 'normal',
  };
  const outsiderCreate = await outsider.client.rpc('upsert_field_assignment_v1', assignmentArgs);
  verify(Boolean(outsiderCreate.error) && await readCount('field_assignments', ws) === 0,
    'J04_OUTSIDER_CANNOT_ASSIGN_OWNER_TRANSACTION');

  const wrongAssignee = await owner.client.rpc('upsert_field_assignment_v1',
    { ...assignmentArgs, p_assigned_user_id: outsider.id });
  verify(Boolean(wrongAssignee.error) && await readCount('field_assignments', ws) === 0,
    'J04_FOREIGN_WORKSPACE_ASSIGNEE_DENIED');

  const result = await owner.client.rpc('upsert_field_assignment_v1', assignmentArgs);
  if (result.error || !result.data?.id || result.data?.version !== 1)
    throw new Error('J04_AUTHENTICATED_ASSIGNMENT_FAILED');
  const assignmentId = result.data.id;
  verify(result.data.transactionId === tx.id && result.data.assignedUserId === owner.id &&
    result.data.status === 'queued', 'J04_OWNER_ASSIGNMENT_BOUND_TO_J03_TRANSACTION');

  const freshAssignment = await fresh.from('field_assignments')
    .select('id,workspace_id,transaction_id,assigned_user_id,status,version')
    .eq('id',assignmentId).single();
  verify(!freshAssignment.error && freshAssignment.data?.workspace_id === ws &&
    freshAssignment.data?.transaction_id === tx.id &&
    freshAssignment.data?.assigned_user_id === owner.id,
    'J04_FRESH_JWT_ASSIGNMENT_RELOAD');
  const outsiderAssignmentRead = await outsider.client.from('field_assignments')
    .select('id').eq('id',assignmentId);
  verify((outsiderAssignmentRead.error || outsiderAssignmentRead.data?.length === 0),
    'J04_OUTSIDER_ASSIGNMENT_READ_DENIED');

  const checkInKey = randomUUID();
  const checkInArgs = {
    p_workspace_id: ws, p_assignment_id: assignmentId,
    p_expected_assignment_version: 1, p_location: null, p_client_operation_id: checkInKey,
  };
  const checkIn = await owner.client.rpc('start_field_visit_v1', checkInArgs);
  if (checkIn.error || !checkIn.data?.visitId) throw new Error('J04_AUTHENTICATED_CHECK_IN_FAILED');
  const visitId = checkIn.data.visitId;
  verify(checkIn.data?.wasDuplicate === false && checkIn.data?.visitVersion === 1 &&
    checkIn.data?.assignmentVersion === 2 && checkIn.data?.assignmentStatus === 'in_progress',
    'J04_OWNER_CHECK_IN_FROM_BOUND_ASSIGNMENT');
  const replayCheckIn = await fresh.rpc('start_field_visit_v1', checkInArgs);
  verify(!replayCheckIn.error && replayCheckIn.data?.wasDuplicate === true &&
    replayCheckIn.data?.visitId === visitId &&
    await readCount('field_visits',ws) === 1,
    'J04_OFFLINE_SAME_KEY_CHECK_IN_REPLAY_NO_DUPLICATE');

  const badReplay = await owner.client.rpc('start_field_visit_v1',
    { ...checkInArgs, p_location: { source: 'conflicting-payload' } });
  verify(Boolean(badReplay.error) && await readCount('field_visits',ws) === 1,
    'J04_SAME_KEY_DIFFERENT_PAYLOAD_DENIED');
  const outsiderVisit = await outsider.client.rpc('start_field_visit_v1',
    { ...checkInArgs, p_client_operation_id: randomUUID(), p_expected_assignment_version: 2 });
  verify(Boolean(outsiderVisit.error) && await readCount('field_visits',ws) === 1,
    'J04_OUTSIDER_CHECK_IN_DENIED');

  const checkOutKey = randomUUID();
  const checkoutArgs = {
    p_workspace_id: ws, p_visit_id: visitId, p_expected_visit_version: 1,
    p_outcome: 'completed', p_failure_reason: null,
    p_outcome_note: 'J04 isolated visit completed', p_counter_department: 'QA',
    p_official_reference: 'J04_TEST', p_official_fee_paid: null,
    p_location: null, p_client_operation_id: checkOutKey,
  };
  const checkout = await owner.client.rpc('finish_field_visit_v1',checkoutArgs);
  if (checkout.error || !checkout.data?.visitId) throw new Error('J04_AUTHENTICATED_CHECK_OUT_FAILED');
  verify(checkout.data.visitId === visitId && checkout.data.visitStatus === 'completed' &&
    checkout.data.assignmentVersion === 3 && checkout.data.assignmentStatus === 'visit_complete' &&
    checkout.data.wasDuplicate === false, 'J04_AUTHENTICATED_VISIT_COMPLETION');
  const replayCheckout = await fresh.rpc('finish_field_visit_v1',checkoutArgs);
  verify(!replayCheckout.error && replayCheckout.data?.wasDuplicate === true &&
    replayCheckout.data?.visitId === visitId, 'J04_REPLAY_CHECK_OUT_NO_DOUBLE_WRITE');

  const handoffKey = randomUUID();
  const handoffArgs = {p_workspace_id:ws,p_assignment_id:assignmentId,
    p_expected_version:3,p_note:'J04 isolated office handoff',p_client_operation_id:handoffKey};
  const handoff = await owner.client.rpc('handoff_field_assignment_v1',handoffArgs);
  if (handoff.error) throw new Error('J04_AUTHENTICATED_HANDOFF_FAILED');
  verify(handoff.data?.status === 'handoff_complete' && handoff.data?.version === 4 &&
    handoff.data?.assignmentId === assignmentId,
    'J04_AUTHENTICATED_HANDOFF_BACK_TO_OFFICE');
  const handoffReplay = await fresh.rpc('handoff_field_assignment_v1',handoffArgs);
  verify(!handoffReplay.error && handoffReplay.data?.wasDuplicate === true &&
    handoffReplay.data?.assignmentId === assignmentId,
    'J04_OFFLINE_HANDOFF_REPLAY_NO_DOUBLE_WRITE');
  const staleHandoff = await owner.client.rpc('handoff_field_assignment_v1',
    {...handoffArgs,p_client_operation_id:randomUUID()});
  verify(Boolean(staleHandoff.error) && await readCount('field_assignments',ws) === 1 &&
    await readCount('field_visits',ws) === 1,
    'J04_STALE_SECOND_HANDOFF_DENIED');

  const [durableAssignment,durableVisit] = await Promise.all([
    fresh.from('field_assignments')
      .select('id,workspace_id,transaction_id,status,version')
      .eq('id',assignmentId).single(),
    fresh.from('field_visits')
      .select('id,workspace_id,assignment_id,transaction_id,status,version')
      .eq('id',visitId).single(),
  ]);
  verify(!durableAssignment.error && !durableVisit.error &&
    durableAssignment.data?.transaction_id === tx.id &&
    durableAssignment.data?.workspace_id === ws &&
    durableAssignment.data?.status === 'handoff_complete' &&
    durableAssignment.data?.version === 4 &&
    durableVisit.data?.assignment_id === assignmentId &&
    durableVisit.data?.transaction_id === tx.id &&
    durableVisit.data?.workspace_id === ws &&
    durableVisit.data?.status === 'completed' && durableVisit.data?.version === 2,
    'J04_DURABLE_J01_J02_J03_LINKED_VISIT_AND_HANDOFF');

  await checkLinkedFollowup({owner,outsider,fresh,workspaceId:ws,
    transactionId:tx.id,readCount,verify});
  await checkLinkedFinance({owner,outsider,fresh,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,readCount,verify});
  const j07=await checkLinkedDocument({owner,outsider,fresh,admin,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,
    publishableKey:key,storagePaths,readCount,verify});
  await checkLinkedClientPortal({owner,outsider,admin,makeUser,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,
    documentId:j07.documentId,readCount,verify});
  await checkLinkedArchive({owner,outsider,fresh,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,
    documentId:j07.documentId,readCount,verify});
  const j10=await checkLinkedGovernance({owner,outsider,fresh,admin,makeUser,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,readCount,verify});
  await checkLinkedContract({owner,outsider,member:j10.member,fresh,workspaceId:ws,
    transactionId:tx.id,companyId:ownerCompany.data.id,...j07,readCount,verify});
}
async function cleanup() {
  let clean = true;
  const cleanedUsers = new Set();
  const cleanupFailure = (kind,error) => {
    clean=false;
    const diagnostic=error?.diagnostic ?? cleanupDiagnostic(error);
    report.cleanup.push({kind,passed:false,...diagnostic});
    console.error('LINKED_CLEANUP_FAILED',kind,JSON.stringify(diagnostic));
  };
  for (const user of users) {
    try {
      const { data, error } = await admin.from('workspaces').select('id')
        .eq('owner_user_id',user.id).limit(2);
      if (error || (data?.length ?? 0) > 1) throw new Error('AMBIGUOUS_OWNER_WORKSPACE');
      if (data?.length === 1) {
        const ws = data[0].id;
        // Delete only this marked disposable workspace's generated PDF objects
        // before its metadata is cascade-deleted. Collect sessions even if
        // rendering failed before returning the document version to the runner.
        const sessions = await admin.from('document_upload_sessions')
          .select('storage_path').eq('workspace_id',ws).limit(201);
        if(sessions.error||(sessions.data?.length??0)>200)throw Error('J07_STORAGE_SESSION_CLEANUP_UNSAFE');
        const paths=[...new Set([...storagePaths,...(sessions.data??[]).map(x=>x.storage_path)])]
          .filter(p=>typeof p==='string'&&p.startsWith(ws+'/'));
        if(paths.length){
          const removed=await admin.storage.from('enjaz-documents-private').remove(paths);
          if(removed.error)throw Object.assign(Error('J07_SCOPED_STORAGE_DELETE_DENIED'),
            {code:'J07_SCOPED_STORAGE_DELETE_DENIED',diagnostic:cleanupDiagnostic(removed.error)});
        }
        await removeLinkedFixtureWorkspace({admin,url,userId:user.id,workspaceId:ws});
      }
      cleanedUsers.add(user.id);
      report.cleanup.push({kind:'marked_workspace',passed:true});
    } catch (error) {
      cleanupFailure('marked_workspace',error);
    }
  }
  for (const user of users) {
    try {
      // Preserve marked identities for diagnostic recovery if their data failed
      // to clean up. A partial failure can never be certified as zero residue.
      if(!cleanedUsers.has(user.id))throw Object.assign(Error('WORKSPACE_REMAINS'),{code:'WORKSPACE_REMAINS'});
      const signedOut=await user.client.auth.signOut({scope:'global'});
      if(signedOut.error)throw Object.assign(Error('SIGNOUT_FAILED'),{diagnostic:cleanupDiagnostic(signedOut.error)});
      const { error } = await admin.auth.admin.deleteUser(user.id,false);
      if (error) throw Object.assign(Error('MARKED_USER_DELETE_DENIED'),{diagnostic:cleanupDiagnostic(error)});
      report.cleanup.push({kind:'marked_auth_user',passed:true});
    } catch (error) {
      cleanupFailure('marked_auth_user',error);
    }
  }
  try {
    const after = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (after.error || after.data?.users?.some(u=>u.user_metadata?.enjaz_test_marker===MARKER) ||
        (await Promise.all(['workspaces','companies','transactions','government_entities',
          'government_procedures','workflow_templates','workflow_instances','workflow_transition_events',
          'field_assignments','field_visits','field_sync_receipts','transaction_followups',
          'payments','payment_reversals','financial_ledger_entries',
          'document_templates','document_template_versions','document_drafts',
          'pdf_jobs','documents','document_versions','document_upload_sessions',
          'client_portal_principals','client_portal_grants','client_portal_resource_shares','client_portal_authority_events',
          'corporate_ownership_stakes','corporate_governance_events','corporate_registry_states',
          'corporate_beneficial_owners','corporate_authority_grants','corporate_capital_events',
          'corporate_resolutions','corporate_ownership_states','commercial_engagements',
          'commercial_engagement_transactions','engagement_contract_revisions','contacts','organization_members']
          .map(t=>readCount(t)))).some(n=>n!==0)) throw new Error('J03_RESIDUE_DETECTED');
    report.cleanup.push({kind:'independent_auth_and_business_zero_residue',passed:true});
  } catch (error) {
    cleanupFailure('independent_auth_and_business_zero_residue',error);
  }
  report.cleanupPassed=clean;
}
let failure=null;
try { await run(); } catch (error) {
  failure=String(error?.message??'UNKNOWN').slice(0,110);
  console.error('J04_TEST_FAILED',failure);
} finally {
  await cleanup();
  report.completedAt=new Date().toISOString();
  report.passed=failure===null && report.cleanupPassed;
  if (failure) report.failureCode=failure;
  await mkdir('artifacts/phase14-1-a2-j04-field',{recursive:true});
  await writeFile(OUT,JSON.stringify(report,null,2)+'\n');
}
if (failure || !report.cleanupPassed) process.exitCode=1;
