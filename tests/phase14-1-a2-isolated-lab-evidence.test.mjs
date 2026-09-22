import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const evidence = JSON.parse(fs.readFileSync('docs/PHASE14_1_A2_ISOLATED_LAB_STRUCTURAL_EVIDENCE.json', 'utf8'));
const contract = JSON.parse(fs.readFileSync('docs/PHASE14_1_A2_HOSTED_PREREQUISITES.json', 'utf8'));

test('isolated lab evidence is structurally complete and non-certifying', () => {
  assert.equal(evidence.productionRef, 'juzxriirhkuzviwnhkbd');
  assert.match(evidence.labRef, /^[a-z0-9]{20}$/);
  assert.notEqual(evidence.labRef, evidence.productionRef);
  assert.equal(evidence.labKind, 'disposable_project');
  assert.equal(evidence.isolationIndependentlyVerified, true);
  assert.equal(evidence.productionWasReadOnly, true);
  assert.equal(evidence.destructiveTestAuthorized, false);
  assert.equal(evidence.cloudAuthenticationCertificate, false);
  assert.equal(evidence.requiredMinimumInventory.tablesFound, contract.minimumTables.length);
  assert.equal(evidence.requiredMinimumInventory.rpcsFound, contract.minimumRpcs.length);
  assert.equal(evidence.zeroResidueSnapshot.authUsers, 0);
  assert.equal(evidence.zeroResidueSnapshot.publicBusinessRows, 0);
  assert.equal(evidence.zeroResidueSnapshot.storageObjects, 0);
  assert.ok(evidence.remainingGates.length >= 5);
});

test('historical prerequisite contract remains frozen and distinct from current lab evidence', () => {
  assert.equal(contract.labObservation.readiness, 'BLOCKED_SCHEMA_INCOMPLETE');
  assert.equal(contract.structuralAuditIsNotCloudCertification, true);
  assert.equal(contract.structuralAuditNeverAuthorizesDestructiveTests, true);
  assert.equal(contract.labObservation.labRef, evidence.labRef);
  assert.notEqual(contract.labObservation.readiness, evidence.schemaReadiness);
  assert.notEqual(contract.labObservation.publicTableCount, evidence.publicInventory.tables);
});
