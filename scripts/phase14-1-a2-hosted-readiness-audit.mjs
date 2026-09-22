import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Frozen minimum from canonical Phase 14.1 journey; one structural preflight, NEVER a
// destructive-test permit or a substitute for actual JWT/RLS/zero-residue evidence.
export const A2_TABLES = Object.freeze([
  'workspaces','workspace_memberships','companies','transactions',
  'government_procedures','workflow_instances','workflow_transition_events',
  'field_assignments','field_visits','transaction_followups','in_app_notifications',
  'payments','payment_reversals','documents','document_versions','document_drafts',
  'commercial_engagements','engagement_contract_revisions','corporate_authority_grants',
  'client_portal_principals','client_portal_grants','client_portal_resource_shares',
  'client_portal_requests',
]);
export const A2_RPCS = Object.freeze([
  'start_government_procedure_v1','transition_workflow_v1',
  'get_field_operations_context_v1','upsert_field_assignment_v1',
  'mutate_transaction_followup_state_v1','post_payment_v1','reverse_payment_v1',
  'get_payment_receipt_v1','get_document_factory_v1','generate_document_draft_v1',
  'get_client_portal_read_model_v1','get_company_governance_context_v1',
  'create_engagement_contract_revision_v1',
]);
export const PRODUCTION_REF = 'juzxriirhkuzviwnhkbd';
const REF = /^[a-z0-9]{20}$/;

export function auditA2PrerequisitesContract(c) {
  const errors = [];
  const check = (name, condition) => { if (!condition) errors.push(name); };
  check('contract_schema', c?.schema === 'enjaz.phase14-1.a2.hosted-structural-prerequisites.v1');
  check('canonical_production_ref', c?.productionRef === PRODUCTION_REF);
  check('minimum_required_tables',
    Array.isArray(c?.minimumTables) && c.minimumTables.length === A2_TABLES.length &&
    new Set(c.minimumTables).size === A2_TABLES.length && A2_TABLES.every(t => c.minimumTables.includes(t)));
  check('minimum_required_rpcs',
    Array.isArray(c?.minimumRpcs) && c.minimumRpcs.length === A2_RPCS.length &&
    new Set(c.minimumRpcs).size === A2_RPCS.length && A2_RPCS.every(n => c.minimumRpcs.includes(n)));
  check('remaining_evidence',
    Array.isArray(c?.requiredFutureEvidence) && c.requiredFutureEvidence.length === 8 &&
    c.requiredFutureEvidence.every(s => typeof s === 'string' && s.length >= 32));
  check('non_certifying_and_non_destructive',
    c?.structuralAuditIsNotCloudCertification === true &&
    c?.structuralAuditNeverAuthorizesDestructiveTests === true);
  check('historical_lab_marked_blocked', c?.labObservation?.readiness === 'BLOCKED_SCHEMA_INCOMPLETE' &&
    c.labObservation.labRef !== PRODUCTION_REF && c.labObservation.requiredRpcsFound === 0 &&
    c.labObservation.publicTableCount === 6 && c.labObservation.readOnlyInventory === true);
  return Object.freeze(errors);
}

/**
 * candidate is only metadata collected by a separately authorized READ-ONLY
 * tool call. Never pass API keys, user records or production data here.
 * A positive result means 'could begin an independent manual Auth/RLS test',
 * NOT permission to run destructive tests and NOT an A2 certificate.
 */
export function auditA2HostedTarget(contract, candidate) {
  const problems = [...auditA2PrerequisitesContract(contract)];
  const check = (name, condition) => { if (!condition) problems.push(name); };
  check('isolated_project_ref',
    typeof candidate?.ref === 'string' && REF.test(candidate.ref) &&
    candidate.ref !== PRODUCTION_REF && candidate.ref !== contract?.productionRef);
  check('explicit_disposable_target_kind', candidate?.kind === 'development_branch' || candidate?.kind === 'disposable_project');
  check('branch_parent_is_production',
    candidate?.kind !== 'development_branch' || candidate?.parentRef === PRODUCTION_REF);
  check('manual_isolation_verification_pending',
    candidate?.isolationIndependentlyVerified === true);
  // Missing / partial inventory is a failure, not a successful zero-table project.
  check('table_metadata_present', Array.isArray(candidate?.tables));
  const tableRecords = Array.isArray(candidate?.tables) ? candidate.tables : [];
  const names = tableRecords.map(t => t?.name);
  check('table_metadata_unique', new Set(names).size === names.length);
  for (const name of A2_TABLES) {
    const observed = tableRecords.find(t => t?.name === 'public.' + name);
    check('required_table:' + name, Boolean(observed));
    check('rls_enabled:' + name, observed?.rls_enabled === true);
  }
  check('rpc_metadata_present', Array.isArray(candidate?.publicFunctionNames));
  const functions = Array.isArray(candidate?.publicFunctionNames) ? candidate.publicFunctionNames : [];
  check('rpc_metadata_unique', functions.length === new Set(functions).size);
  for (const name of A2_RPCS) check('required_rpc:' + name, functions.includes(name));
  return Object.freeze({
    problems: Object.freeze(problems),
    structuralDiscoveryPassed: problems.length === 0,
    realAuthenticatedCloudCertified: false,
    destructiveTestAuthorized: false,
    publishedBrowserCertified: false,
    phase14_1Closed: false,
    phase14_2Allowed: false,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL('file://' + process.argv[1]))) {
  const contract = JSON.parse(fs.readFileSync('docs/PHASE14_1_A2_HOSTED_PREREQUISITES.json','utf8'));
  const errors = auditA2PrerequisitesContract(contract);
  if (errors.length) {
    console.error('ENJAZ 14.1 A2 hosted prerequisites FAIL: ' + errors.join(', '));
    process.exitCode = 1;
  } else {
    console.log('ENJAZ 14.1 A2 hosted structural prerequisites PASS (manifest only). No hosted JWT/RLS or destructive authorization claimed.');
  }
}
