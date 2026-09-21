// Test-fixture cleanup only. Never imported by the application.
const LAB_URL = 'https://nqhgaukutkyvfumbtbtg.supabase.co';
const MARKER = 'phase14_1_a2_j04_field_real_cloud';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanupDiagnostic(error) {
  // Do not log request bodies, JWTs, email addresses or arbitrary server text.
  const code = /^[A-Z0-9_]{1,100}$/.test(error?.code ?? '') ? error.code : 'UNKNOWN';
  const constraint = String(error?.message ?? '').match(/\b[a-z][a-z0-9_]+_(?:fkey|fk|check)\b/)?.[0];
  return { code, ...(constraint ? { constraint } : {}) };
}

function fail(code, cause) {
  const error = new Error(code);
  error.code = code;
  error.diagnostic = cleanupDiagnostic(cause);
  throw error;
}

export async function removeLinkedFixtureWorkspace({ admin, url, userId, workspaceId }) {
  if (url !== LAB_URL || !UUID.test(userId) || !UUID.test(workspaceId))
    fail('CLEANUP_TARGET_DENIED');
  // The caller supplies only IDs captured from this run's createUser/bootstrap.
  // Recheck marker AND workspace ownership immediately before scoped deletion.
  const auth = await admin.auth.admin.getUserById(userId);
  const user = auth.data?.user;
  if (auth.error || user?.id !== userId || user.user_metadata?.enjaz_test_marker !== MARKER ||
      !['owner','outsider','portal-client','member'].includes(user.user_metadata?.label) ||
      !/^enjaz-a2-j03-[a-z-]+-[0-9a-f-]+@example\.com$/.test(user.email ?? ''))
    fail('CLEANUP_UNMARKED_USER_DENIED', auth.error);
  const workspace = await admin.from('workspaces').select('id,owner_user_id')
    .eq('id', workspaceId).eq('owner_user_id', userId).single();
  if (workspace.error || workspace.data?.id !== workspaceId || workspace.data?.owner_user_id !== userId)
    fail('CLEANUP_WORKSPACE_OWNER_MISMATCH', workspace.error);

  // These leaf fixtures have RESTRICT links to the company/transaction/document
  // graph. Remove them first, so workspace cascade order cannot strand them.
  // Never disable constraints, delete a foreign workspace, or sweep Auth users.
  for (const table of ['client_portal_authority_events','client_portal_resource_shares',
    'client_portal_grants','document_upload_sessions']) {
    const result = await admin.from(table).delete().eq('workspace_id', workspaceId);
    if (result.error) fail('CLEANUP_DEPENDENCY_DELETE_DENIED', result.error);
  }
  const removed = await admin.from('workspaces').delete()
    .eq('id', workspaceId).eq('owner_user_id', userId).select('id');
  if (removed.error || removed.data?.length !== 1 || removed.data[0].id !== workspaceId)
    fail('CLEANUP_WORKSPACE_DELETE_UNCONFIRMED', removed.error);
}
