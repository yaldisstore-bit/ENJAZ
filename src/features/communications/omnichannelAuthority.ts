export type OmnichannelProviderChannel = 'email' | 'whatsapp' | 'sms';
export type OmnichannelSourceChannel = OmnichannelProviderChannel | 'client_portal' | 'manual';
export type CommunicationDirection = 'incoming' | 'outgoing' | 'internal';
export type ConsentStatus = 'granted' | 'not_required' | 'unknown' | 'withdrawn';
export type ApprovalRequirement = 'none' | 'required';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type LinkSource = 'provider_thread' | 'endpoint_map' | 'explicit_reference';

export interface ProviderMessageIdentity {
  readonly workspaceId: string;
  readonly channel: OmnichannelProviderChannel;
  readonly providerAccountId: string;
  readonly providerMessageId: string;
}

export interface OutboundCommandIdentity {
  readonly workspaceId: string;
  readonly channel: OmnichannelProviderChannel;
  readonly providerAccountId: string;
  readonly idempotencyKey: string;
}

export interface CommunicationLink {
  readonly workspaceId: string;
  readonly companyId: string | null;
  readonly contactId: string | null;
  readonly transactionId: string | null;
}

export interface CommunicationLinkCandidate extends CommunicationLink {
  readonly source: LinkSource;
  readonly deterministic: boolean;
}

export interface ManualRelinkContext {
  readonly actorWorkspaceId: string;
  readonly communicationWorkspaceId: string;
  readonly actorHasWorkspaceTrust: boolean;
  readonly currentVersion: number;
  readonly expectedVersion: number;
}

export interface OutboundPolicyDecision {
  readonly channel: OmnichannelProviderChannel;
  readonly consentStatus: ConsentStatus;
  readonly approvalRequirement: ApprovalRequirement;
  readonly approvalStatus: ApprovalStatus;
}

export const COMMUNICATION_CLIENT_SAFE_FIELDS = Object.freeze([
  'id',
  'workspaceId',
  'companyId',
  'contactId',
  'transactionId',
  'channel',
  'direction',
  'summary',
  'occurredAt',
  'deliveryStatus',
  'conversationId',
  'createdAt',
] as const);

export const COMMUNICATION_FORBIDDEN_CLIENT_FIELDS = Object.freeze([
  'providerAccessToken',
  'providerRefreshToken',
  'providerSecret',
  'webhookSecret',
  'signingSecret',
  'rawWebhookPayload',
  'rawProviderHeaders',
  'serviceRoleKey',
  'internalMatchEvidence',
] as const);

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function encode(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('|');
}

export function providerMessageDedupeKey(identity: ProviderMessageIdentity): string | null {
  if (!nonEmpty(identity.workspaceId) || !nonEmpty(identity.providerAccountId) || !nonEmpty(identity.providerMessageId)) return null;
  return encode(['provider-message', identity.workspaceId, identity.channel, identity.providerAccountId, identity.providerMessageId]);
}

export function outboundCommandDedupeKey(identity: OutboundCommandIdentity): string | null {
  if (!nonEmpty(identity.workspaceId) || !nonEmpty(identity.providerAccountId) || !nonEmpty(identity.idempotencyKey)) return null;
  return encode(['outbound-command', identity.workspaceId, identity.channel, identity.providerAccountId, identity.idempotencyKey]);
}

function sameNullable(a: string | null, b: string | null): boolean {
  return a === b;
}

function sameLink(a: CommunicationLink, b: CommunicationLink): boolean {
  return a.workspaceId === b.workspaceId
    && sameNullable(a.companyId, b.companyId)
    && sameNullable(a.contactId, b.contactId)
    && sameNullable(a.transactionId, b.transactionId);
}

export function chooseAutomaticCommunicationLink(
  workspaceId: string,
  candidates: readonly CommunicationLinkCandidate[],
): CommunicationLink | null {
  const eligible = candidates.filter((candidate) => candidate.workspaceId === workspaceId && candidate.deterministic === true);
  if (eligible.length === 0) return null;

  const first = eligible[0];
  for (const candidate of eligible.slice(1)) {
    if (!sameLink(first, candidate)) return null;
  }

  return Object.freeze({
    workspaceId: first.workspaceId,
    companyId: first.companyId,
    contactId: first.contactId,
    transactionId: first.transactionId,
  });
}

export function manualRelinkIsAuthorized(context: ManualRelinkContext): boolean {
  if (!context.actorHasWorkspaceTrust) return false;
  if (context.actorWorkspaceId !== context.communicationWorkspaceId) return false;
  if (!Number.isSafeInteger(context.currentVersion) || !Number.isSafeInteger(context.expectedVersion)) return false;
  if (context.currentVersion < 1 || context.expectedVersion < 1) return false;
  return context.currentVersion === context.expectedVersion;
}

export function outboundDispatchAllowed(decision: OutboundPolicyDecision): boolean {
  const consentAllows = decision.consentStatus === 'granted' || decision.consentStatus === 'not_required';
  if (!consentAllows) return false;

  if (decision.approvalRequirement === 'required') return decision.approvalStatus === 'approved';
  return decision.approvalStatus === 'not_required' || decision.approvalStatus === 'approved';
}

export function canTreatTransportEvidenceAsCanonicalMessage(): false {
  return false;
}

export function endpointAloneGrantsWorkspaceAuthority(): false {
  return false;
}

export function assertCommunicationClientSafeProjection(fields: readonly string[]): void {
  const allowed = new Set<string>(COMMUNICATION_CLIENT_SAFE_FIELDS);
  const forbidden = new Set<string>(COMMUNICATION_FORBIDDEN_CLIENT_FIELDS);
  for (const field of fields) {
    if (forbidden.has(field) || !allowed.has(field)) {
      throw new Error(`Communication projection contains forbidden field: ${field}`);
    }
  }
}
