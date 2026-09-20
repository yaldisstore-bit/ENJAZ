import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  A2_TABLES, A2_RPCS, PRODUCTION_REF, auditA2PrerequisitesContract, auditA2HostedTarget,
} from '../scripts/phase14-1-a2-hosted-readiness-audit.mjs';

const contract = JSON.parse(fs.readFileSync('docs/PHASE14_1_A2_HOSTED_PREREQUISITES.json','utf8'));
const clone = value => structuredClone(value);
const fixture = () => ({
  ref: 'abcdefghijklmnopqrst',
  kind: 'development_branch',
  parentRef: PRODUCTION_REF,
  isolationIndependentlyVerified: true,
  tables: A2_TABLES.map(name => ({ name: 'public.' + name, rls_enabled: true })),
  publicFunctionNames: [...A2_RPCS],
});
const fail = (candidate, expected) => {
  const result = auditA2HostedTarget(contract, candidate);
  assert.equal(result.structuralDiscoveryPassed, false);
  assert.ok(result.problems.includes(expected), JSON.stringify(result.problems));
  assert.equal(result.realAuthenticatedCloudCertified, false);
  assert.equal(result.destructiveTestAuthorized, false);
  assert.equal(result.phase14_2Allowed, false);
};

test('A2 complete immutable minimum inventory contract is accepted', () => {
  assert.equal(A2_TABLES.length, 23);
  assert.equal(A2_RPCS.length, 13);
  assert.deepEqual(auditA2PrerequisitesContract(contract), []);
});

test('A2 target structural inventory never claims a hosted user test or authorizes destruction', () => {
  const positive = auditA2HostedTarget(contract, fixture());
  assert.deepEqual(positive.problems, []);
  assert.equal(positive.structuralDiscoveryPassed, true);
  assert.equal(positive.realAuthenticatedCloudCertified, false);
  assert.equal(positive.destructiveTestAuthorized, false);
  assert.equal(positive.publishedBrowserCertified, false);
  assert.equal(positive.phase14_1Closed, false);
  assert.equal(positive.phase14_2Allowed, false);
});

test('A2 production project and wrong-parent development branches are categorically rejected', () => {
  fail({ ...fixture(), ref: PRODUCTION_REF }, 'isolated_project_ref');
  fail({ ...fixture(), parentRef: '99999999999999999999' }, 'branch_parent_is_production');
  fail({ ...fixture(), ref: 'not-a-real-ref' }, 'isolated_project_ref');
  fail({ ...fixture(), isolationIndependentlyVerified: false }, 'manual_isolation_verification_pending');
});

test('A2 existing historical isolated lab is not mistaken for full business schema', () => {
  const lab = { ...fixture(),
    ref: contract.labObservation.labRef, kind: 'disposable_project',
    tables: ['workspaces','workspace_memberships','import_jobs','contacts','companies','transactions']
      .map(name => ({ name: 'public.' + name, rls_enabled: true })),
    publicFunctionNames: [],
  };
  fail(lab, 'required_table:government_procedures');
  fail(lab, 'required_rpc:get_payment_receipt_v1');
});

test('A2 an exposed unprotected table or an absent permission-dependent RPC rejects readiness', () => {
  const noRls = fixture();
  noRls.tables[2].rls_enabled = false;
  fail(noRls, 'rls_enabled:companies');
  const missingRpc = fixture();
  missingRpc.publicFunctionNames.pop();
  fail(missingRpc, 'required_rpc:create_engagement_contract_revision_v1');
});

test('A2 missing or truncated metadata and duplicate rows reject instead of silently certifying', () => {
  fail({ ...fixture(), tables: undefined }, 'table_metadata_present');
  fail({ ...fixture(), publicFunctionNames: undefined }, 'rpc_metadata_present');
  const repeated = fixture();
  repeated.tables.push(repeated.tables[0]);
  fail(repeated, 'table_metadata_unique');
  repeated.publicFunctionNames.push(repeated.publicFunctionNames[0]);
  fail(repeated, 'rpc_metadata_unique');
});

test('A2 contract changes cannot erase finance, client permissions, RLS, or isolation safeguards', () => {
  const missingTable = clone(contract);
  missingTable.minimumTables = missingTable.minimumTables.filter(t => t !== 'payment_reversals');
  assert.ok(auditA2PrerequisitesContract(missingTable).includes('minimum_required_tables'));
  const missingRpc = clone(contract);
  missingRpc.minimumRpcs.pop();
  assert.ok(auditA2PrerequisitesContract(missingRpc).includes('minimum_required_rpcs'));
  const liftedSafety = clone(contract);
  liftedSafety.structuralAuditNeverAuthorizesDestructiveTests = false;
  assert.ok(auditA2PrerequisitesContract(liftedSafety).includes('non_certifying_and_non_destructive'));
  const forgedLab = clone(contract);
  forgedLab.labObservation.readiness = 'CLOUD_CERTIFIED';
  assert.ok(auditA2PrerequisitesContract(forgedLab).includes('historical_lab_marked_blocked'));
});
