export const ENGAGEMENT_CONTRACT_IDENTITY_VERSION = 1 as const;

export const ENGAGEMENT_CONTRACT_AUTHORITIES = Object.freeze({
  commercialEngagement: 'commercial_engagements',
  commercialTransactionLink: 'commercial_engagement_transactions',
  finance: Object.freeze(['payments', 'payment_reversals', 'financial_ledger_entries', 'cashbox_accounts'] as const),
  issuedDocuments: Object.freeze(['documents', 'document_versions'] as const),
  documentFactory: Object.freeze(['document_templates', 'document_drafts', 'pdf_jobs'] as const),
});

export type EngagementContractStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'signature_pending'
  | 'signed'
  | 'effective'
  | 'expired'
  | 'terminated'
  | 'superseded';

export type EngagementContractRevision = Readonly<{
  workspaceId: string;
  engagementId: string;
  revision: number;
  title: string;
  status: EngagementContractStatus;
  templateVersionId: string;
  draftId: string;
  documentId: string | null;
  documentVersionId: string | null;
  supersedesRevision: number | null;
  effectiveOn: string | null;
  expiresOn: string | null;
  signedAt: string | null;
}>;

export class EngagementContractError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EngagementContractError';
    this.code = code;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function transitionTargets(...statuses: EngagementContractStatus[]): readonly EngagementContractStatus[] {
  return Object.freeze(statuses);
}

const TRANSITIONS: Readonly<Record<EngagementContractStatus, readonly EngagementContractStatus[]>> = Object.freeze({
  draft: transitionTargets('under_review'),
  under_review: transitionTargets('draft', 'approved'),
  approved: transitionTargets('under_review', 'signature_pending'),
  signature_pending: transitionTargets('approved', 'signed'),
  signed: transitionTargets('effective', 'superseded'),
  effective: transitionTargets('expired', 'terminated', 'superseded'),
  expired: transitionTargets('superseded'),
  terminated: transitionTargets('superseded'),
  superseded: transitionTargets(),
});

function requireUuid(value: string, label: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_ID_INVALID', `${label} must be a UUID`);
  }
  return normalized;
}

function requireText(value: string, label: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || /[\u0000\r\n]/u.test(normalized)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_TEXT_INVALID', `${label} is invalid`);
  }
  return normalized;
}

function requireDate(value: string | null, label: string): string | null {
  if (value === null) return null;
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_DATE_INVALID', `${label} is invalid`);
  }
  return value;
}

function requireInstant(value: string | null, label: string): string | null {
  if (value === null) return null;
  if (!value.trim() || Number.isNaN(Date.parse(value))) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_INSTANT_INVALID', `${label} is invalid`);
  }
  return value;
}

function requiresImmutableArtifact(status: EngagementContractStatus): boolean {
  return status === 'signed' || status === 'effective' || status === 'expired' || status === 'terminated' || status === 'superseded';
}

export function engagementContractIdentity(input: Pick<EngagementContractRevision, 'workspaceId' | 'engagementId' | 'revision'>): string {
  const workspaceId = requireUuid(input.workspaceId, 'workspaceId');
  const engagementId = requireUuid(input.engagementId, 'engagementId');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_REVISION_INVALID', 'revision must be a positive safe integer');
  }
  return `ENJAZ:CONTRACT:v${ENGAGEMENT_CONTRACT_IDENTITY_VERSION}:${workspaceId}:${engagementId}:R${input.revision}`;
}

export function canTransitionEngagementContract(from: EngagementContractStatus, to: EngagementContractStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertEngagementContractTransition(from: EngagementContractStatus, to: EngagementContractStatus): void {
  if (!canTransitionEngagementContract(from, to)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_TRANSITION_INVALID', `cannot transition ${from} -> ${to}`);
  }
}

export function validateEngagementContractRevision(input: EngagementContractRevision): EngagementContractRevision {
  const workspaceId = requireUuid(input.workspaceId, 'workspaceId');
  const engagementId = requireUuid(input.engagementId, 'engagementId');
  const templateVersionId = requireUuid(input.templateVersionId, 'templateVersionId');
  const draftId = requireUuid(input.draftId, 'draftId');
  const title = requireText(input.title, 'title', 320);

  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_REVISION_INVALID', 'revision must be a positive safe integer');
  }

  if (input.revision === 1 && input.supersedesRevision !== null) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_REVISION_LINEAGE_INVALID', 'first revision cannot supersede another revision');
  }
  if (input.revision > 1 && input.supersedesRevision !== input.revision - 1) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_REVISION_LINEAGE_INVALID', 'revision must supersede the immediately previous revision');
  }

  const effectiveOn = requireDate(input.effectiveOn, 'effectiveOn');
  const expiresOn = requireDate(input.expiresOn, 'expiresOn');
  const signedAt = requireInstant(input.signedAt, 'signedAt');
  if (effectiveOn && expiresOn && expiresOn < effectiveOn) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_DATE_RANGE_INVALID', 'expiresOn cannot be before effectiveOn');
  }

  const documentId = input.documentId === null ? null : requireUuid(input.documentId, 'documentId');
  const documentVersionId = input.documentVersionId === null ? null : requireUuid(input.documentVersionId, 'documentVersionId');
  if ((documentId === null) !== (documentVersionId === null)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_ARTIFACT_PAIR_INVALID', 'documentId and documentVersionId must be present together');
  }

  if (requiresImmutableArtifact(input.status) && (!documentId || !documentVersionId || !signedAt)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_SIGNED_ARTIFACT_REQUIRED', 'signed/effective history requires an immutable signed document version');
  }

  if (input.status === 'effective' || input.status === 'expired' || input.status === 'terminated') {
    if (!effectiveOn) {
      throw new EngagementContractError('ENGAGEMENT_CONTRACT_EFFECTIVE_DATE_REQUIRED', 'effective lifecycle states require effectiveOn');
    }
  }

  if (input.status === 'expired' && !expiresOn) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_EXPIRY_REQUIRED', 'expired status requires expiresOn');
  }

  if ((input.status === 'draft' || input.status === 'under_review' || input.status === 'approved' || input.status === 'signature_pending') && signedAt !== null) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_SIGNATURE_STATE_INVALID', 'pre-signature lifecycle states cannot carry signedAt');
  }

  if ((input.status === 'draft' || input.status === 'under_review' || input.status === 'approved') && (documentId !== null || documentVersionId !== null)) {
    throw new EngagementContractError('ENGAGEMENT_CONTRACT_ARTIFACT_STATE_INVALID', 'draft/review/approval states cannot claim an issued signed artifact');
  }

  return Object.freeze({
    ...input,
    workspaceId,
    engagementId,
    title,
    templateVersionId,
    draftId,
    documentId,
    documentVersionId,
    effectiveOn,
    expiresOn,
    signedAt,
  });
}

export function assertEngagementContractRevisionChain(revisions: readonly EngagementContractRevision[]): void {
  if (revisions.length === 0) return;
  const ordered = [...revisions].sort((a, b) => a.revision - b.revision);
  const first = validateEngagementContractRevision(ordered[0]!);
  const workspaceId = first.workspaceId;
  const engagementId = first.engagementId;

  for (let index = 0; index < ordered.length; index += 1) {
    const current = validateEngagementContractRevision(ordered[index]!);
    const expectedRevision = index + 1;
    if (current.workspaceId !== workspaceId || current.engagementId !== engagementId) {
      throw new EngagementContractError('ENGAGEMENT_CONTRACT_CROSS_AUTHORITY_CHAIN', 'revision chain cannot cross workspace or engagement authority');
    }
    if (current.revision !== expectedRevision) {
      throw new EngagementContractError('ENGAGEMENT_CONTRACT_REVISION_GAP', `expected revision ${expectedRevision}`);
    }
    if (index > 0) {
      const previous = ordered[index - 1]!;
      if (previous.status !== 'superseded') {
        throw new EngagementContractError('ENGAGEMENT_CONTRACT_PREVIOUS_REVISION_NOT_SUPERSEDED', 'a newer revision requires the previous revision to be superseded');
      }
    }
  }
}
