import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest, validateClosedEvidence } from './major-systems-zero-escape-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/ENJAZ_MAJOR_PRODUCT_SYSTEMS.json'), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));

function mustReject(name, fn) {
  let rejected = false;
  try { fn(); } catch { rejected = true; }
  if (!rejected) throw new Error(`selftest did not reject corruption: ${name}`);
  console.log(`PASS reject: ${name}`);
}

function validEvidence(systemId) {
  return {
    schemaVersion: 1,
    gateProfile: 'ZERO_ESCAPE_V1',
    systemId,
    status: 'CLOSED',
    candidateHead: '1'.repeat(40),
    mergeCommit: '2'.repeat(40),
    unresolvedCriticalCount: 0,
    unresolvedHighCount: 0,
    unresolvedFunctionalBlockerCount: 0,
    preMergeDeterministic: 'PASS',
    realCloudAuthenticated: 'PASS',
    freshWorkspaceBootstrap: 'PASS',
    durableWriteRoundTrip: 'PASS',
    permissionMatrix: 'PASS',
    realBrowserMobile: 'PASS',
    failureConflictRecovery: 'PASS',
    auditReconciliation: 'PASS',
    deployedLiveCriticalPath: 'PASS',
    postMergeRecertification: 'COMPLETE',
    workflowEvidence: [{ runId: 1, conclusion: 'success' }],
    liveEvidence: [{ target: 'published-runtime', result: 'PASS' }],
    escapedDefects: [],
  };
}

validateManifest(manifest, { root: ROOT, checkEvidenceFiles: false });

{
  const broken = clone(manifest);
  broken.majorSystemCount = 17;
  mustReject('major system silently removed', () => validateManifest(broken, { root: ROOT, checkEvidenceFiles: false }));
}

{
  const broken = clone(manifest);
  broken.systems[0].status = 'CLOSED';
  broken.systems[0].closureEvidence = null;
  mustReject('CLOSED without evidence path', () => validateManifest(broken, { root: ROOT, checkEvidenceFiles: false }));
}

{
  const evidence = validEvidence('M1');
  evidence.unresolvedHighCount = 1;
  mustReject('CLOSED with unresolved High defect', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

{
  const evidence = validEvidence('M1');
  evidence.deployedLiveCriticalPath = 'PENDING';
  mustReject('CLOSED without deployed-live critical path', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

{
  const evidence = validEvidence('M1');
  evidence.realCloudAuthenticated = 'PENDING';
  mustReject('CLOSED without real authenticated cloud evidence', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

{
  const evidence = validEvidence('M1');
  evidence.durableWriteRoundTrip = 'PENDING';
  mustReject('CLOSED without durable write round trip', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

{
  const evidence = validEvidence('M1');
  evidence.permissionMatrix = 'PENDING';
  mustReject('CLOSED without permission matrix', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

{
  const evidence = validEvidence('M1');
  evidence.escapedDefects = [{ id: 'ESC-1', status: 'OPEN' }];
  mustReject('CLOSED with open escaped defect', () => validateClosedEvidence({ id: 'M1' }, evidence));
}

validateClosedEvidence({ id: 'M1' }, validEvidence('M1'));
console.log('PASS accept: fully evidenced CLOSED state');
console.log('PASS Zero-Escape destructive selftest: closure lock fails closed under every injected corruption.');
