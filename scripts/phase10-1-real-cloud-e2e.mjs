import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const PROJECT_REF = 'juzxriirhkuzviwnhkbd';
const BUCKET = 'enjaz-documents-private';
const MAX_BYTES = 52_428_800;
const ARTIFACT_DIR = 'artifacts/phase10-1-real-cloud';
const EVIDENCE_PATH = `${ARTIFACT_DIR}/evidence.json`;
const requiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const url = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
if (process.env.ENJAZ_REAL_CLOUD_CONFIRM !== 'YES') throw new Error('ENJAZ_REAL_CLOUD_CONFIRM must equal YES');
if (!url.includes(PROJECT_REF)) throw new Error('Refusing to run against an unexpected Supabase project');
if (secretKey.startsWith('sb_publishable_') || secretKey === publishableKey) throw new Error('SUPABASE_SECRET_KEY is not privileged');

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const makeUserClient = () => createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const evidence = {
  schema: 'enjaz.phase10-1-real-cloud-e2e.v1',
  projectRef: PROJECT_REF,
  startedAt: new Date().toISOString(),
  completedAt: null,
  passed: false,
  checks: [],
  cleanup: [],
};
const checks = evidence.checks;
const cleanup = evidence.cleanup;
const objectPaths = new Set();
const workspaces = new Set();
const users = [];
let fatalError = null;

const record = (name, detail = null) => {
  checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
};
const assert = (condition, name, detail = null) => {
  if (!condition) throw new Error(`ASSERTION_FAILED:${name}${detail ? `:${detail}` : ''}`);
  record(name, detail);
};
const uuid = () => crypto.randomUUID();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const countRows = (data) => Array.isArray(data) ? data.length : 0;

async function writeEvidence() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  evidence.completedAt = new Date().toISOString();
  evidence.passed = !fatalError;
  if (fatalError) evidence.failure = fatalError instanceof Error ? fatalError.message : String(fatalError);
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

async function adminCreateTestUser(label) {
  const entropy = `${Date.now()}-${uuid().slice(0, 8)}`;
  const email = `enjaz-phase10-1-${label}-${entropy}@example.com`;
  const password = `EnjAZ!${uuid()}Aa9`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { enjaz_test_marker: 'phase10_1_real_cloud_e2e' },
  });
  if (error || !data.user) throw error ?? new Error(`Unable to create ${label} user`);
  const entry = { id: data.user.id, email, password, client: makeUserClient(), accessToken: null };
  users.push(entry);
  return entry;
}

async function signInTestUser(entry) {
  const { data, error } = await entry.client.auth.signInWithPassword({ email: entry.email, password: entry.password });
  if (error || !data.session?.access_token) throw error ?? new Error('Test user sign-in returned no access token');
  entry.accessToken = data.session.access_token;
  return entry;
}

async function waitForWorkspace(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin.from('workspaces').select('id').eq('owner_user_id', userId).limit(2);
    if (error) throw error;
    if (data?.length === 1) {
      workspaces.add(data[0].id);
      return data[0].id;
    }
    await sleep(250);
  }
  throw new Error(`Workspace bootstrap did not materialize for ${userId}`);
}

async function edge(entry, body) {
  if (!entry.accessToken) throw new Error('Missing authenticated test JWT');
  const response = await fetch(`${url}/functions/v1/enjaz-document-vault`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${entry.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

async function uploadSignedUrl(signedUrl, bytes, mimeType, fileName) {
  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', new Blob([bytes], { type: mimeType }), fileName);
  const response = await fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
  const text = await response.text().catch(() => '');
  if (!response.ok) throw new Error(`Signed upload failed (${response.status}) ${text.slice(0, 160)}`);
}

async function getSession(operationId) {
  const { data, error } = await admin.from('document_upload_sessions')
    .select('id,workspace_id,document_id,version_number,storage_path,state,failure_code')
    .eq('id', operationId)
    .maybeSingle();
  if (error) throw error;
  if (data?.storage_path) objectPaths.add(data.storage_path);
  return data;
}

async function assertPrepareRejected(entry, workspaceId, override, name) {
  const operationId = uuid();
  const base = {
    action: 'prepare',
    workspaceId,
    operationId,
    title: `رفض ${name}`,
    fileName: `${name}.pdf`,
    mimeType: 'application/pdf',
    byteSize: 4,
  };
  const response = await edge(entry, { ...base, ...override, operationId });
  assert(!response.ok, name, `HTTP ${response.status}`);
  const residue = await getSession(operationId);
  assert(residue === null, `${name}_no_authority_residue`);
}

async function assertDirectMutationDenied(client, workspaceId) {
  const probeId = uuid();
  const { error: insertError } = await client.from('documents').insert({
    id: probeId,
    workspace_id: workspaceId,
    title: 'forbidden-direct-insert',
    mime_type: 'application/pdf',
    storage_path: `${workspaceId}/${probeId}/forbidden`,
    size_bytes: 1,
    original_size_bytes: 1,
    status: 'processing',
  });
  assert(Boolean(insertError), 'direct_document_insert_denied', insertError?.code ?? 'denied');
}

async function cleanupAll() {
  for (const objectPath of [...objectPaths]) {
    try {
      const { error } = await admin.storage.from(BUCKET).remove([objectPath]);
      if (error && !/not found/i.test(error.message)) throw error;
      cleanup.push({ kind: 'storage_object', id: objectPath, passed: true });
    } catch (error) {
      cleanup.push({ kind: 'storage_object', id: objectPath, passed: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const workspaceId of [...workspaces]) {
    try {
      const { error } = await admin.from('workspaces').delete().eq('id', workspaceId);
      if (error) throw error;
      cleanup.push({ kind: 'workspace', id: workspaceId, passed: true });
    } catch (error) {
      cleanup.push({ kind: 'workspace', id: workspaceId, passed: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const entry of users) {
    try {
      if (entry.accessToken) {
        const { error: signOutError } = await admin.auth.admin.signOut(entry.accessToken, 'global');
        if (signOutError) throw signOutError;
      }
      const { error } = await admin.auth.admin.deleteUser(entry.id, false);
      if (error) throw error;
      cleanup.push({ kind: 'auth_user', id: entry.id, passed: true });
    } catch (error) {
      cleanup.push({ kind: 'auth_user', id: entry.id, passed: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

try {
  const bucketBefore = await admin.storage.getBucket(BUCKET);
  if (!bucketBefore.error && bucketBefore.data) {
    assert(bucketBefore.data.public === false, 'existing_bucket_private');
  }

  const primary = await signInTestUser(await adminCreateTestUser('primary'));
  const outsider = await signInTestUser(await adminCreateTestUser('outsider'));
  const primaryWorkspace = await waitForWorkspace(primary.id);
  const outsiderWorkspace = await waitForWorkspace(outsider.id);
  record('disposable_confirmed_auth_users_created');
  assert(primaryWorkspace !== outsiderWorkspace, 'isolated_test_workspaces');

  await assertDirectMutationDenied(primary.client, primaryWorkspace);

  await assertPrepareRejected(primary, primaryWorkspace, { mimeType: 'application/x-msdownload' }, 'invalid_mime_rejected');
  await assertPrepareRejected(primary, primaryWorkspace, { byteSize: MAX_BYTES + 1 }, 'oversize_rejected');
  await assertPrepareRejected(primary, primaryWorkspace, { fileName: '../escape.pdf' }, 'path_injection_rejected');
  await assertPrepareRejected(outsider, primaryWorkspace, {}, 'cross_workspace_user_rejected');

  const v1Bytes = new TextEncoder().encode('%PDF-1.4\nENJAZ Phase 10.1 v1\n%%EOF\n');
  const v1OperationId = uuid();
  const v1Payload = {
    action: 'prepare', workspaceId: primaryWorkspace, operationId: v1OperationId,
    title: 'Phase 10.1 Real Cloud', fileName: 'phase10-1-v1.pdf', mimeType: 'application/pdf', byteSize: v1Bytes.byteLength,
  };
  const firstPrepare = await edge(primary, v1Payload);
  assert(firstPrepare.ok && typeof firstPrepare.data?.signedUrl === 'string', 'v1_prepare_signed_capability', `HTTP ${firstPrepare.status}`);
  const replayPrepare = await edge(primary, v1Payload);
  assert(replayPrepare.ok && typeof replayPrepare.data?.signedUrl === 'string', 'prepare_idempotent_replay', `HTTP ${replayPrepare.status}`);

  const preparedV1 = await getSession(v1OperationId);
  assert(preparedV1?.state === 'prepared' && preparedV1.version_number === 1, 'v1_prepared_once');
  const documentId = preparedV1.document_id;
  const { data: sameDocumentRows, error: sameDocumentError } = await admin.from('documents').select('id').eq('id', documentId);
  if (sameDocumentError) throw sameDocumentError;
  assert(countRows(sameDocumentRows) === 1, 'idempotent_prepare_single_document');

  const earlyAck = await edge(primary, { action: 'acknowledge', operationId: v1OperationId });
  assert(earlyAck.status === 409 && earlyAck.data?.error === 'STORAGE_OBJECT_NOT_FOUND', 'pre_object_ack_rejected');
  const afterEarlyAck = await getSession(v1OperationId);
  assert(afterEarlyAck?.state === 'prepared', 'pre_object_ack_preserves_prepared_state');

  await uploadSignedUrl(firstPrepare.data.signedUrl, v1Bytes, 'application/pdf', 'phase10-1-v1.pdf');
  record('v1_signed_upload_succeeded');
  const v1Ack = await edge(primary, { action: 'acknowledge', operationId: v1OperationId });
  assert(v1Ack.ok && v1Ack.data?.ack?.versionNumber === 1 && v1Ack.data?.ack?.documentId === documentId, 'v1_acknowledged');
  const v1AckReplay = await edge(primary, { action: 'acknowledge', operationId: v1OperationId });
  assert(v1AckReplay.ok && v1AckReplay.data?.ack?.wasDuplicate === true, 'ack_replay_duplicate_safe');

  const { data: v1Versions, error: v1VersionsError } = await admin.from('document_versions')
    .select('version_number,storage_path,size_bytes,mime_type').eq('document_id', documentId).order('version_number');
  if (v1VersionsError) throw v1VersionsError;
  for (const row of v1Versions ?? []) if (row.storage_path) objectPaths.add(row.storage_path);
  assert(v1Versions?.length === 1 && v1Versions[0].version_number === 1, 'exactly_one_v1_version');

  const { error: updateError } = await primary.client.from('documents').update({ title: 'forbidden-update' }).eq('id', documentId);
  assert(Boolean(updateError), 'direct_document_update_denied', updateError?.code ?? 'denied');
  const { error: deleteError } = await primary.client.from('documents').delete().eq('id', documentId);
  assert(Boolean(deleteError), 'direct_document_delete_denied', deleteError?.code ?? 'denied');

  const v1Download = await edge(primary, { action: 'download', workspaceId: primaryWorkspace, documentId, versionNumber: 1 });
  assert(v1Download.ok && typeof v1Download.data?.signedUrl === 'string', 'v1_signed_download_issued');
  const v1DownloadResponse = await fetch(v1Download.data.signedUrl);
  const v1Downloaded = new Uint8Array(await v1DownloadResponse.arrayBuffer());
  assert(v1DownloadResponse.ok && Buffer.compare(Buffer.from(v1Downloaded), Buffer.from(v1Bytes)) === 0, 'v1_download_bytes_exact');

  const v2Bytes = new TextEncoder().encode('%PDF-1.4\nENJAZ Phase 10.1 v2 immutable\n%%EOF\n');
  const v2OperationId = uuid();
  const v2Prepare = await edge(primary, {
    action: 'prepare', workspaceId: primaryWorkspace, operationId: v2OperationId, documentId,
    title: 'Phase 10.1 Real Cloud', fileName: 'phase10-1-v2.pdf', mimeType: 'application/pdf', byteSize: v2Bytes.byteLength,
  });
  assert(v2Prepare.ok && typeof v2Prepare.data?.signedUrl === 'string', 'v2_prepare_signed_capability');
  const preparedV2 = await getSession(v2OperationId);
  assert(preparedV2?.version_number === 2 && preparedV2.document_id === documentId, 'v2_new_version_relation');
  await uploadSignedUrl(v2Prepare.data.signedUrl, v2Bytes, 'application/pdf', 'phase10-1-v2.pdf');
  const v2Ack = await edge(primary, { action: 'acknowledge', operationId: v2OperationId });
  assert(v2Ack.ok && v2Ack.data?.ack?.versionNumber === 2, 'v2_acknowledged');

  const { data: versions, error: versionsError } = await admin.from('document_versions')
    .select('version_number,storage_path,size_bytes,mime_type').eq('document_id', documentId).order('version_number');
  if (versionsError) throw versionsError;
  for (const row of versions ?? []) if (row.storage_path) objectPaths.add(row.storage_path);
  assert(versions?.length === 2 && versions[0].version_number === 1 && versions[1].version_number === 2, 'v1_v2_history_preserved');
  assert(versions?.[0].storage_path !== versions?.[1].storage_path, 'v2_uses_distinct_immutable_path');

  for (const [versionNumber, expectedBytes] of [[1, v1Bytes], [2, v2Bytes]]) {
    const signed = await edge(primary, { action: 'download', workspaceId: primaryWorkspace, documentId, versionNumber });
    assert(signed.ok && typeof signed.data?.signedUrl === 'string', `v${versionNumber}_download_url`);
    const response = await fetch(signed.data.signedUrl);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert(response.ok && Buffer.compare(Buffer.from(bytes), Buffer.from(expectedBytes)) === 0, `v${versionNumber}_download_exact`);
  }

  const mismatchOperationId = uuid();
  const expectedMismatchBytes = new TextEncoder().encode('12345');
  const actualMismatchBytes = new TextEncoder().encode('123456789');
  const mismatchPrepare = await edge(primary, {
    action: 'prepare', workspaceId: primaryWorkspace, operationId: mismatchOperationId, documentId,
    title: 'Phase 10.1 Real Cloud', fileName: 'phase10-1-mismatch.pdf', mimeType: 'application/pdf', byteSize: expectedMismatchBytes.byteLength,
  });
  assert(mismatchPrepare.ok && typeof mismatchPrepare.data?.signedUrl === 'string', 'mismatch_prepare_succeeded');
  const mismatchSession = await getSession(mismatchOperationId);
  assert(mismatchSession?.version_number === 3, 'mismatch_targets_next_version');
  await uploadSignedUrl(mismatchPrepare.data.signedUrl, actualMismatchBytes, 'application/pdf', 'phase10-1-mismatch.pdf');
  const mismatchAck = await edge(primary, { action: 'acknowledge', operationId: mismatchOperationId });
  assert(mismatchAck.status === 409 && mismatchAck.data?.error === 'STORAGE_SIZE_MISMATCH', 'mismatch_ack_rejected_and_failed');
  const failedSession = await getSession(mismatchOperationId);
  assert(failedSession?.state === 'failed' && failedSession.failure_code === 'STORAGE_SIZE_MISMATCH', 'mismatch_session_marked_failed');
  const mismatchedObject = await admin.storage.from(BUCKET).info(failedSession.storage_path);
  assert(Boolean(mismatchedObject.error), 'mismatch_object_removed');

  const { data: afterMismatchDocument, error: afterMismatchError } = await admin.from('documents')
    .select('status,storage_path').eq('id', documentId).single();
  if (afterMismatchError) throw afterMismatchError;
  assert(afterMismatchDocument.status === 'ready' && afterMismatchDocument.storage_path === versions[1].storage_path, 'failed_v3_preserves_ready_v2_pointer');
  const { data: afterMismatchVersions, error: afterMismatchVersionsError } = await admin.from('document_versions').select('version_number').eq('document_id', documentId);
  if (afterMismatchVersionsError) throw afterMismatchVersionsError;
  assert(afterMismatchVersions?.length === 2, 'failed_v3_creates_no_version');

  const { error: archiveError } = await primary.client.rpc('archive_document_v1', { p_workspace_id: primaryWorkspace, p_document_id: documentId });
  if (archiveError) throw archiveError;
  record('document_archived_via_guarded_rpc');
  const { data: normalList, error: normalListError } = await primary.client.rpc('get_document_vault_v1', {
    p_workspace_id: primaryWorkspace, p_query: null, p_include_archived: false, p_limit: 100, p_offset: 0,
  });
  if (normalListError) throw normalListError;
  const { data: archiveList, error: archiveListError } = await primary.client.rpc('get_document_vault_v1', {
    p_workspace_id: primaryWorkspace, p_query: null, p_include_archived: true, p_limit: 100, p_offset: 0,
  });
  if (archiveListError) throw archiveListError;
  const normalItems = Array.isArray(normalList?.documents) ? normalList.documents : [];
  const archivedItems = Array.isArray(archiveList?.documents) ? archiveList.documents : [];
  assert(!normalItems.some((item) => item?.id === documentId), 'archive_excluded_from_normal_vault');
  assert(archivedItems.some((item) => item?.id === documentId), 'archive_retained_in_archive_vault');

  for (const row of versions) {
    const info = await admin.storage.from(BUCKET).info(row.storage_path);
    assert(!info.error && Boolean(info.data), `archive_preserves_v${row.version_number}_binary`);
  }

  const bucket = await admin.storage.getBucket(BUCKET);
  if (bucket.error || !bucket.data) throw bucket.error ?? new Error('Vault bucket missing after authenticated prepare');
  assert(bucket.data.public === false, 'bucket_private_after_e2e');
  const limit = Number(bucket.data.file_size_limit ?? bucket.data.fileSizeLimit);
  assert(limit === MAX_BYTES, 'bucket_50mb_limit');
  const allowed = bucket.data.allowed_mime_types ?? bucket.data.allowedMimeTypes ?? [];
  assert(Array.isArray(allowed) && allowed.includes('application/pdf') && allowed.includes('image/png'), 'bucket_mime_restricted');

  record('real_cloud_storage_e2e_complete');
} catch (error) {
  fatalError = error;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  await cleanupAll();
  const cleanupFailures = cleanup.filter((item) => !item.passed);
  if (cleanupFailures.length && !fatalError) fatalError = new Error(`Cleanup failed for ${cleanupFailures.length} resource(s)`);
  await writeEvidence();
}

if (fatalError) process.exitCode = 1;
else console.log(`PASS Phase 10.1 real-cloud E2E — evidence: ${EVIDENCE_PATH}`);
