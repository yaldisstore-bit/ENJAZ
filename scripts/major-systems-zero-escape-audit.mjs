import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(ROOT, 'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json');
const policyPath = path.join(ROOT, 'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md');

const REQUIRED_RELEASE_REQUIREMENTS = [
  'authoritative-schema-data-contract',
  'workspace-rls-permission-contract',
  'domain-service-layer',
  'complete-live-user-journey',
  'real-error-offline-conflict-states',
  'destructive-automated-tests',
  'real-cloud-authenticated-boundary',
  'fresh-workspace-bootstrap',
  'durable-write-round-trip',
  'permission-matrix-negative-tests',
  'real-chromium-mobile-acceptance',
  'audit-evidence-for-sensitive-writes',
  'failure-conflict-recovery',
  'authoritative-reconciliation',
  'deployed-live-critical-path',
  'post-merge-recertification',
  'zero-critical-high-functional-blockers',
  'no-demo-only-production-substitute',
];

const REQUIRED_CLOSED_GATES = [
  'preMergeDeterministic',
  'realCloudAuthenticated',
  'freshWorkspaceBootstrap',
  'durableWriteRoundTrip',
  'permissionMatrix',
  'realBrowserMobile',
  'failureConflictRecovery',
  'auditReconciliation',
  'deployedLiveCriticalPath',
  'postMergeRecertification',
];

const allowedStatuses = new Set(['PLANNED', 'ACTIVE', 'CLOSURE_CANDIDATE', 'CLOSED', 'REOPENED_DUE_TO_ESCAPE']);
const isSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
const pass = value => value === 'PASS' || value === 'COMPLETE';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateClosedEvidence(system, evidence) {
  assert(evidence && typeof evidence === 'object', `${system.id}: closure evidence must be an object`);
  assert(evidence.gateProfile === 'ZERO_ESCAPE_V1', `${system.id}: wrong gateProfile`);
  assert(evidence.systemId === system.id, `${system.id}: evidence systemId mismatch`);
  assert(evidence.status === 'CLOSED', `${system.id}: CLOSED system requires evidence.status=CLOSED`);
  assert(isSha(evidence.candidateHead), `${system.id}: missing/invalid candidateHead SHA`);
  assert(isSha(evidence.mergeCommit), `${system.id}: missing/invalid mergeCommit SHA`);
  assert(evidence.unresolvedCriticalCount === 0, `${system.id}: unresolvedCriticalCount must be 0`);
  assert(evidence.unresolvedHighCount === 0, `${system.id}: unresolvedHighCount must be 0`);
  assert(evidence.unresolvedFunctionalBlockerCount === 0, `${system.id}: unresolvedFunctionalBlockerCount must be 0`);
  for (const gate of REQUIRED_CLOSED_GATES) {
    assert(pass(evidence[gate]), `${system.id}: ${gate} must be PASS/COMPLETE before CLOSED`);
  }
  assert(Array.isArray(evidence.workflowEvidence) && evidence.workflowEvidence.length > 0,
    `${system.id}: workflowEvidence required before CLOSED`);
  assert(Array.isArray(evidence.liveEvidence) && evidence.liveEvidence.length > 0,
    `${system.id}: liveEvidence required before CLOSED`);
  assert(Array.isArray(evidence.escapedDefects), `${system.id}: escapedDefects must be an array`);
  const openEscape = evidence.escapedDefects.find(defect => defect && defect.status && defect.status !== 'CLOSED');
  assert(!openEscape, `${system.id}: escaped defect still open: ${openEscape?.id ?? 'unknown'}`);
  return true;
}

export function validateManifest(manifest, { root = ROOT, checkEvidenceFiles = true } = {}) {
  assert(manifest.schemaVersion >= 2, 'Major systems manifest schemaVersion must be >=2');
  assert(manifest.status === 'GOVERNING_AMENDMENT', 'Major systems manifest must be GOVERNING_AMENDMENT');
  assert(manifest.majorSystemCount === 18, 'majorSystemCount must remain 18 unless governance is explicitly amended');
  assert(manifest.closedPhasesReopened === false, 'closedPhasesReopened must remain false');
  assert(manifest.phaseOrderChanged === false, 'phaseOrderChanged must remain false');
  assert(manifest.closurePolicy === 'docs/ENJAZ_MAJOR_SYSTEMS_ZERO_ESCAPE_POLICY.md', 'closurePolicy mismatch');
  assert(manifest.closureGateProfile === 'ZERO_ESCAPE_V1', 'closureGateProfile must be ZERO_ESCAPE_V1');
  assert(manifest.closureAuthority === 'deployed-merged-sha', 'closureAuthority must be deployed-merged-sha');
  assert(Array.isArray(manifest.systems) && manifest.systems.length === 18, 'systems must contain exactly 18 entries');

  const ids = manifest.systems.map(system => system.id);
  const expected = Array.from({ length: 18 }, (_, i) => `M${i + 1}`);
  assert(new Set(ids).size === ids.length, 'major system IDs must be unique');
  assert(expected.every(id => ids.includes(id)), 'major systems M1..M18 must all exist');

  for (const requirement of REQUIRED_RELEASE_REQUIREMENTS) {
    assert(manifest.releaseRequirements.includes(requirement), `releaseRequirements missing ${requirement}`);
  }

  for (const system of manifest.systems) {
    assert(allowedStatuses.has(system.status), `${system.id}: invalid status ${system.status}`);
    assert(Array.isArray(system.anchors) && system.anchors.length > 0, `${system.id}: anchors required`);
    assert(typeof system.name === 'string' && system.name.length > 3, `${system.id}: name required`);
    assert(typeof system.kind === 'string' && system.kind.length > 2, `${system.id}: kind required`);

    if (system.status === 'CLOSED' || system.status === 'CLOSURE_CANDIDATE' || system.status === 'REOPENED_DUE_TO_ESCAPE') {
      assert(typeof system.closureEvidence === 'string' && system.closureEvidence.startsWith('docs/'),
        `${system.id}: ${system.status} requires a docs/ closureEvidence path`);
    }

    if (system.status === 'CLOSED' && checkEvidenceFiles) {
      const evidencePath = path.join(root, system.closureEvidence);
      assert(fs.existsSync(evidencePath), `${system.id}: closureEvidence file does not exist: ${system.closureEvidence}`);
      const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
      validateClosedEvidence(system, evidence);
    }
  }

  return true;
}

function validatePolicy(policy) {
  const markers = [
    'Real Cloud / Real Auth / Real Data',
    'Post-merge deployed recertification',
    'Defect-escape rule',
    'Zero-defect meaning',
    'fresh account / fresh workspace / no seed data',
    'deployed merged SHA',
    'no closure based only on mocks/previews',
  ];
  for (const marker of markers) assert(policy.includes(marker), `Zero-Escape policy missing marker: ${marker}`);
}

export function runAudit() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const policy = fs.readFileSync(policyPath, 'utf8');
  validatePolicy(policy);
  validateManifest(manifest);
  console.log('PASS major systems Zero-Escape governance: M1-M18 closure is fail-closed and deployed-live authoritative.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    runAudit();
  } catch (error) {
    console.error(`FAIL major systems Zero-Escape governance: ${error.message}`);
    process.exit(1);
  }
}
