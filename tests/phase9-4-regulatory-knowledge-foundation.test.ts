import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
  assertDeterministicRegulatoryLineage,
  buildRegulatoryCitation,
  normalizeArabicRegulatorySearchText,
  parseDerivedKnowledgeArtifact,
  parseRegulatorySourceIdentity,
  parseRegulatorySourceVersion,
  resolveRegulatoryVersionAsOf,
  type RegulatorySourceIdentity,
  type RegulatorySourceVersion,
} from '../src/features/regulatory/regulatoryKnowledgeContract.ts';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function source(overrides: Record<string, unknown> = {}): RegulatorySourceIdentity {
  const parsed = parseRegulatorySourceIdentity({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    sourceId: 'law-iraq-001',
    scope: 'official_global',
    workspaceId: null,
    kind: 'law',
    jurisdiction: 'العراق',
    issuer: 'الجهة الرسمية المختصة',
    referenceCode: 'قانون 1 لسنة 2026',
    ...overrides,
  });
  assert.ok(parsed);
  return parsed;
}

function version(overrides: Record<string, unknown> = {}): RegulatorySourceVersion {
  const parsed = parseRegulatorySourceVersion({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    sourceId: 'law-iraq-001',
    versionId: 'law-iraq-001-v1',
    revision: 1,
    titleAr: 'قانون اختبار المعرفة التنظيمية',
    publicationDate: '2026-01-01',
    effectiveFrom: '2026-01-15',
    effectiveTo: '2026-06-01',
    supersedesVersionId: null,
    sourceLocator: 'المادة 1',
    provenance: {
      publisher: 'الجهة الرسمية المختصة',
      sourceUrl: 'https://example.gov.iq/law/1',
      retrievedOn: '2026-09-11',
      sourceHash: HASH_A,
    },
    authoritative: true,
    ...overrides,
  });
  assert.ok(parsed);
  return parsed;
}

function version2(overrides: Record<string, unknown> = {}): RegulatorySourceVersion {
  const parsed = parseRegulatorySourceVersion({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    sourceId: 'law-iraq-001',
    versionId: 'law-iraq-001-v2',
    revision: 2,
    titleAr: 'قانون اختبار المعرفة التنظيمية — تعديل',
    publicationDate: '2026-05-15',
    effectiveFrom: '2026-06-01',
    effectiveTo: null,
    supersedesVersionId: 'law-iraq-001-v1',
    sourceLocator: 'المادة 1 بعد التعديل',
    provenance: {
      publisher: 'الجهة الرسمية المختصة',
      sourceUrl: 'https://example.gov.iq/law/1/revision/2',
      retrievedOn: '2026-09-11',
      sourceHash: HASH_B,
    },
    authoritative: true,
    ...overrides,
  });
  assert.ok(parsed);
  return parsed;
}

test('9.4 foundation 01 — official source/version and citation require real provenance', () => {
  const officialSource = source();
  const officialVersion = version();
  const citation = buildRegulatoryCitation(officialSource, officialVersion);
  assert.equal(citation.sourceId, officialSource.sourceId);
  assert.equal(citation.versionId, officialVersion.versionId);
  assert.match(citation.sourceUrl, /^https:/);
  assert.match(citation.label, /إصدار 1/);
});

test('9.4 foundation 02 — missing or malformed provenance is rejected', () => {
  assert.equal(parseRegulatorySourceVersion({ ...version(), provenance: null }), null);
  assert.equal(parseRegulatorySourceVersion({
    ...version(),
    provenance: { publisher: 'x', sourceUrl: 'http://unsafe.test', retrievedOn: '2026-09-11', sourceHash: HASH_A },
  }), null);
});

test('9.4 foundation 03 — official/workspace scopes cannot impersonate one another', () => {
  assert.equal(parseRegulatorySourceIdentity({ ...source(), workspaceId: 'workspace-1' }), null);
  assert.equal(parseRegulatorySourceIdentity({ ...source(), scope: 'workspace_curated', workspaceId: null }), null);
  assert.ok(parseRegulatorySourceIdentity({ ...source(), scope: 'workspace_curated', workspaceId: 'workspace-1' }));
});

test('9.4 foundation 04 — impossible effective intervals are rejected', () => {
  assert.equal(parseRegulatorySourceVersion({ ...version(), effectiveFrom: '2026-06-01', effectiveTo: '2026-06-01' }), null);
  assert.equal(parseRegulatorySourceVersion({ ...version(), effectiveFrom: '2026-02-30' }), null);
});

test('9.4 foundation 05 — duplicate version identities and revisions are rejected', () => {
  assert.throws(() => assertDeterministicRegulatoryLineage([version(), version()]));
  const duplicateRevision = version2({ revision: 1, versionId: 'law-iraq-001-v2', supersedesVersionId: null });
  assert.throws(() => assertDeterministicRegulatoryLineage([version(), duplicateRevision]));
});

test('9.4 foundation 06 — overlapping authoritative effective periods fail closed', () => {
  const overlappingFirst = version({ effectiveTo: '2026-07-01' });
  assert.throws(() => assertDeterministicRegulatoryLineage([overlappingFirst, version2()]));
});

test('9.4 foundation 07 — broken/cyclic/forked lineage is rejected', () => {
  const wrongParent = version2({ supersedesVersionId: 'not-v1' });
  assert.throws(() => assertDeterministicRegulatoryLineage([version(), wrongParent]));
  assert.equal(parseRegulatorySourceVersion({ ...version2(), supersedesVersionId: 'law-iraq-001-v2' }), null);
});

test('9.4 foundation 08 — AI output can never assert regulatory authority', () => {
  assert.equal(parseDerivedKnowledgeArtifact({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    artifactId: 'ai-1', kind: 'ai_summary', sourceId: 'law-iraq-001', sourceVersionId: 'law-iraq-001-v1',
    body: 'تلخيص غير ملزم للنص الرسمي', authoritative: true,
  }), null);
  const artifact = parseDerivedKnowledgeArtifact({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    artifactId: 'ai-1', kind: 'ai_summary', sourceId: 'law-iraq-001', sourceVersionId: 'law-iraq-001-v1',
    body: 'تلخيص غير ملزم للنص الرسمي', authoritative: false,
  });
  assert.ok(artifact);
  assert.equal(artifact.authoritative, false);
});

test('9.4 foundation 09 — editorial interpretation cannot replace official truth', () => {
  assert.equal(parseDerivedKnowledgeArtifact({
    schema: ENJAZ_REGULATORY_KNOWLEDGE_SCHEMA,
    artifactId: 'editorial-1', kind: 'editorial_interpretation', sourceId: 'law-iraq-001', sourceVersionId: 'law-iraq-001-v1',
    body: 'شرح تحريري', authoritative: true,
  }), null);
});

test('9.4 foundation 10 — as-of history resolves deterministic half-open versions', () => {
  const versions = [version(), version2()];
  assertDeterministicRegulatoryLineage(versions);
  assert.equal(resolveRegulatoryVersionAsOf(versions, 'law-iraq-001', '2026-05-31')?.versionId, 'law-iraq-001-v1');
  assert.equal(resolveRegulatoryVersionAsOf(versions, 'law-iraq-001', '2026-06-01')?.versionId, 'law-iraq-001-v2');
  assert.equal(resolveRegulatoryVersionAsOf(versions, 'law-iraq-001', '2025-12-31'), null);
});

test('9.4 foundation 11 — citation rejects source/version mismatch', () => {
  const mismatched = source({ sourceId: 'other-source' });
  assert.throws(() => buildRegulatoryCitation(mismatched, version()));
});

test('9.4 foundation 12 — Arabic search normalization is derived and successor follows certified lifecycle', () => {
  const original = 'قَانُونُ الشَّرِكَات ـ العراقي';
  const normalized = normalizeArabicRegulatorySearchText(original);
  assert.equal(original, 'قَانُونُ الشَّرِكَات ـ العراقي');
  assert.equal(normalized, 'قانون الشركات العراقي');

  const state = JSON.parse(fs.readFileSync(new URL('../docs/PHASE9_4_STATE.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  if (state.status === 'IN_PROGRESS') {
    assert.equal(state.exitGatePassed, false);
    assert.equal(state.phase9_5Allowed, false);
    assert.equal(state.successorStatus, 'LOCKED');
    return;
  }

  assert.equal(state.status, 'CLOSED');
  assert.equal(state.exitGatePassed, true);
  assert.equal(state.phase9_5Allowed, true);
  assert.equal(state.nextPhase, '9.5');
  assert.equal(state.successorStatus, 'AUTHORIZED');
  assert.equal(state.certifiedMainCommit, 'b72dbff8bb1dfb1afbce82ececd265bf2d5544ed');
});
