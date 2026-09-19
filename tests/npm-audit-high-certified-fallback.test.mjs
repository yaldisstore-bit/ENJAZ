import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAuditInfrastructureFailure,CERTIFIED_LOCK_BLOB,certifiedLockMatches} from '../scripts/npm-audit-high-certified-fallback.mjs';

test('classifies registry maintenance and transport outages only',()=>{
  assert.equal(classifyAuditInfrastructureFailure('503 Service Unavailable - currently performing maintenance'),true);
  assert.equal(classifyAuditInfrastructureFailure('npm ERR! code ETIMEDOUT'),true);
  assert.equal(classifyAuditInfrastructureFailure('This endpoint is being retired /-/npm/v1/security/audits/quick Invalid package tree'),true);
  assert.equal(classifyAuditInfrastructureFailure('found 1 high severity vulnerability'),false);
  assert.equal(classifyAuditInfrastructureFailure('npm ERR! audit report contains vulnerabilities'),false);
});

test('current package lock remains the exact security-certified blob',()=>{
  assert.equal(CERTIFIED_LOCK_BLOB,'e3b275e728bcfcbde46f854f3ec8304688539653');
  const r=certifiedLockMatches();
  assert.equal(r.ok,true,`actual lock blob ${r.actual}`);
});
