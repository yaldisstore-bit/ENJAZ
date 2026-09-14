import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENGAGEMENT_CONTRACT_AUTHORITIES,
  EngagementContractError,
  assertEngagementContractRevisionChain,
  assertEngagementContractTransition,
  canTransitionEngagementContract,
  engagementContractIdentity,
  validateEngagementContractRevision,
  type EngagementContractRevision,
} from '../src/features/engagements/engagementContract.ts';

const W = '11111111-1111-4111-8111-111111111111';
const W2 = '21111111-1111-4111-8111-111111111111';
const E = '22222222-2222-4222-8222-222222222222';
const TEMPLATE = '33333333-3333-4333-8333-333333333333';
const DRAFT = '44444444-4444-4444-8444-444444444444';
const DOC = '55555555-5555-4555-8555-555555555555';
const VERSION = '66666666-6666-4666-8666-666666666666';

function revision(overrides: Partial<EngagementContractRevision> = {}): EngagementContractRevision {
  return {
    workspaceId: W,
    engagementId: E,
    revision: 1,
    title: 'عقد خدمات قانونية سنوي',
    status: 'draft',
    templateVersionId: TEMPLATE,
    draftId: DRAFT,
    documentId: null,
    documentVersionId: null,
    supersedesRevision: null,
    effectiveOn: null,
    expiresOn: null,
    signedAt: null,
    ...overrides,
  };
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
    return 'NO_ERROR';
  } catch (error) {
    assert.ok(error instanceof EngagementContractError);
    return error.code;
  }
}

test('preserves existing commercial, finance, vault and factory authorities', () => {
  assert.equal(ENGAGEMENT_CONTRACT_AUTHORITIES.commercialEngagement, 'commercial_engagements');
  assert.equal(ENGAGEMENT_CONTRACT_AUTHORITIES.commercialTransactionLink, 'commercial_engagement_transactions');
  assert.deepEqual(ENGAGEMENT_CONTRACT_AUTHORITIES.finance, ['payments', 'payment_reversals', 'financial_ledger_entries', 'cashbox_accounts']);
  assert.deepEqual(ENGAGEMENT_CONTRACT_AUTHORITIES.issuedDocuments, ['documents', 'document_versions']);
  assert.deepEqual(ENGAGEMENT_CONTRACT_AUTHORITIES.documentFactory, ['document_templates', 'document_drafts', 'pdf_jobs']);
});

test('builds a stable revision identity bound to workspace and engagement', () => {
  const first = engagementContractIdentity({ workspaceId: W, engagementId: E, revision: 4 });
  const second = engagementContractIdentity({ workspaceId: W, engagementId: E, revision: 4 });
  assert.equal(first, second);
  assert.equal(first, `ENJAZ:CONTRACT:v1:${W}:${E}:R4`);
  assert.notEqual(first, engagementContractIdentity({ workspaceId: W2, engagementId: E, revision: 4 }));
});

test('allows only governed lifecycle transitions', () => {
  assert.equal(canTransitionEngagementContract('draft', 'under_review'), true);
  assert.equal(canTransitionEngagementContract('under_review', 'approved'), true);
  assert.equal(canTransitionEngagementContract('approved', 'signature_pending'), true);
  assert.equal(canTransitionEngagementContract('signature_pending', 'signed'), true);
  assert.equal(canTransitionEngagementContract('signed', 'effective'), true);
  assert.equal(canTransitionEngagementContract('effective', 'expired'), true);
  assert.equal(canTransitionEngagementContract('effective', 'terminated'), true);
  assert.equal(canTransitionEngagementContract('effective', 'draft'), false);
  assert.equal(errorCode(() => assertEngagementContractTransition('draft', 'signed')), 'ENGAGEMENT_CONTRACT_TRANSITION_INVALID');
  assert.equal(errorCode(() => assertEngagementContractTransition('superseded', 'effective')), 'ENGAGEMENT_CONTRACT_TRANSITION_INVALID');
});

test('rejects invalid revision lineage and revision gaps', () => {
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({ revision: 1, supersedesRevision: 1 }))), 'ENGAGEMENT_CONTRACT_REVISION_LINEAGE_INVALID');
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({ revision: 3, supersedesRevision: 1 }))), 'ENGAGEMENT_CONTRACT_REVISION_LINEAGE_INVALID');
});

test('requires immutable signed document authority for signed and effective states', () => {
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({ status: 'signed', signedAt: '2026-09-14T14:00:00Z' }))), 'ENGAGEMENT_CONTRACT_SIGNED_ARTIFACT_REQUIRED');

  const signed = validateEngagementContractRevision(revision({
    status: 'signed',
    documentId: DOC,
    documentVersionId: VERSION,
    signedAt: '2026-09-14T14:00:00Z',
  }));
  assert.equal(signed.documentVersionId, VERSION);

  assert.equal(errorCode(() => validateEngagementContractRevision(revision({
    status: 'effective',
    documentId: DOC,
    documentVersionId: VERSION,
    signedAt: '2026-09-14T14:00:00Z',
  }))), 'ENGAGEMENT_CONTRACT_EFFECTIVE_DATE_REQUIRED');
});

test('rejects impossible effective and expiry dates', () => {
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({
    status: 'effective',
    documentId: DOC,
    documentVersionId: VERSION,
    signedAt: '2026-09-14T14:00:00Z',
    effectiveOn: '2026-10-01',
    expiresOn: '2026-09-30',
  }))), 'ENGAGEMENT_CONTRACT_DATE_RANGE_INVALID');

  assert.equal(errorCode(() => validateEngagementContractRevision(revision({
    status: 'expired',
    documentId: DOC,
    documentVersionId: VERSION,
    signedAt: '2026-09-14T14:00:00Z',
    effectiveOn: '2026-09-14',
  }))), 'ENGAGEMENT_CONTRACT_EXPIRY_REQUIRED');
});

test('pre-signature states cannot smuggle signed timestamps or issued artifacts', () => {
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({ status: 'approved', signedAt: '2026-09-14T14:00:00Z' }))), 'ENGAGEMENT_CONTRACT_SIGNATURE_STATE_INVALID');
  assert.equal(errorCode(() => validateEngagementContractRevision(revision({ status: 'under_review', documentId: DOC, documentVersionId: VERSION }))), 'ENGAGEMENT_CONTRACT_ARTIFACT_STATE_INVALID');
});

test('accepts contiguous same-authority revision history and rejects cross-workspace chains', () => {
  const first = revision({
    status: 'superseded',
    documentId: DOC,
    documentVersionId: VERSION,
    signedAt: '2026-09-01T10:00:00Z',
  });
  const second = revision({
    revision: 2,
    supersedesRevision: 1,
    status: 'signed',
    documentId: '77777777-7777-4777-8777-777777777777',
    documentVersionId: '88888888-8888-4888-8888-888888888888',
    signedAt: '2026-09-14T14:00:00Z',
  });
  assert.doesNotThrow(() => assertEngagementContractRevisionChain([second, first]));
  assert.equal(errorCode(() => assertEngagementContractRevisionChain([first, { ...second, workspaceId: W2 }])), 'ENGAGEMENT_CONTRACT_CROSS_AUTHORITY_CHAIN');
});
