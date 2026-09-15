import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';

export type CommunicationAwaitingParty = 'staff' | 'client' | null;

export interface CommunicationsHubSummary {
  readonly conversationCount: number;
  readonly unreadCount: number;
  readonly reviewCount: number;
  readonly failedCount: number;
  readonly reconciliationCount: number;
  readonly awaitingApprovalCount: number;
  readonly slaMinutes: number;
}

export interface CommunicationProviderAccount {
  readonly id: string;
  readonly channel: string;
  readonly provider: string;
  readonly displayName: string;
  readonly capabilities: readonly string[];
  readonly enabled: boolean;
}

export interface CommunicationConversation {
  readonly id: string;
  readonly subject: string;
  readonly status: string;
  readonly companyId: string | null;
  readonly companyLabel: string | null;
  readonly contactId: string | null;
  readonly contactLabel: string | null;
  readonly transactionId: string | null;
  readonly transactionLabel: string | null;
  readonly updatedAt: string;
  readonly unreadCount: number;
  readonly awaitingParty: CommunicationAwaitingParty;
  readonly unansweredSince: string | null;
  readonly unansweredMinutes: number | null;
  readonly slaBreached: boolean;
  readonly transportStatus: string | null;
  readonly outboundStatus: string | null;
  readonly approvalStatus: string | null;
  readonly canRetry: boolean;
  readonly needsReview: boolean;
  readonly needsAttention: boolean;
  readonly latestMessage: Readonly<{
    id: string;
    channel: string;
    direction: 'incoming' | 'outgoing';
    summary: string;
    subject: string | null;
    occurredAt: string;
    linkStatus: string;
  }> | null;
}

export interface CommunicationTimelineItem {
  readonly id: string;
  readonly channel: string;
  readonly direction: 'incoming' | 'outgoing';
  readonly subject: string | null;
  readonly bodyText: string;
  readonly summary: string;
  readonly occurredAt: string;
  readonly linkStatus: string;
  readonly linkVersion: number;
  readonly transportStatus: string | null;
  readonly transportErrorCode: string | null;
  readonly outboundCommandId: string | null;
  readonly outboundStatus: string | null;
  readonly approvalStatus: string | null;
  readonly outboundVersion: number | null;
  readonly canRetry: boolean;
  readonly attachmentCount: number;
}

export interface CommunicationReviewItem {
  readonly communicationId: string;
  readonly conversationId: string | null;
  readonly channel: string;
  readonly subject: string | null;
  readonly summary: string;
  readonly occurredAt: string;
  readonly linkStatus: 'review_required' | 'unmatched';
  readonly linkVersion: number;
}

export interface CommunicationsHubSnapshot {
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly canGovern: boolean;
  readonly query: string | null;
  readonly selectedConversationId: string | null;
  readonly summary: CommunicationsHubSummary;
  readonly providerAccounts: readonly CommunicationProviderAccount[];
  readonly conversations: readonly CommunicationConversation[];
  readonly timeline: readonly CommunicationTimelineItem[];
  readonly reviewQueue: readonly CommunicationReviewItem[];
}

export class CommunicationsHubWorkspaceUnavailableError extends Error {
  constructor() { super('communications workspace unavailable'); this.name = 'CommunicationsHubWorkspaceUnavailableError'; }
}

export class CommunicationsHubCommandError extends Error {
  readonly code: string;
  constructor(code: string, message = code) { super(message); this.name = 'CommunicationsHubCommandError'; this.code = code; }
}

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CommunicationsHubCommandError('INVALID_HUB_PAYLOAD');
  return value as Record<string, unknown>;
}
function str(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
function nullableStr(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
function num(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function bool(value: unknown): boolean { return value === true; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function errorText(error: unknown): string {
  if (!error) return 'COMMUNICATIONS_RPC_FAILED';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const row = error as Record<string, unknown>;
    return str(row.message) || str(row.code) || 'COMMUNICATIONS_RPC_FAILED';
  }
  return String(error);
}
function throwRpc(error: unknown): never {
  const text = errorText(error);
  const marker = text.match(/ENJAZ_[A-Z0-9_]+/)?.[0] ?? 'COMMUNICATIONS_RPC_FAILED';
  throw new CommunicationsHubCommandError(marker, text);
}

function parseLatest(value: unknown): CommunicationConversation['latestMessage'] {
  if (!value) return null;
  const row = obj(value);
  const direction = str(row.direction);
  if (direction !== 'incoming' && direction !== 'outgoing') return null;
  return Object.freeze({
    id: str(row.id), channel: str(row.channel), direction,
    summary: str(row.summary), subject: nullableStr(row.subject), occurredAt: str(row.occurredAt), linkStatus: str(row.linkStatus),
  });
}

function parseConversation(value: unknown): CommunicationConversation {
  const row = obj(value);
  const awaiting = str(row.awaitingParty);
  return Object.freeze({
    id: str(row.id), subject: str(row.subject, 'محادثة بلا عنوان'), status: str(row.status),
    companyId: nullableStr(row.companyId), companyLabel: nullableStr(row.companyLabel),
    contactId: nullableStr(row.contactId), contactLabel: nullableStr(row.contactLabel),
    transactionId: nullableStr(row.transactionId), transactionLabel: nullableStr(row.transactionLabel), updatedAt: str(row.updatedAt),
    latestMessage: parseLatest(row.latestMessage), unreadCount: num(row.unreadCount),
    awaitingParty: awaiting === 'staff' || awaiting === 'client' ? awaiting : null,
    unansweredSince: nullableStr(row.unansweredSince), unansweredMinutes: row.unansweredMinutes === null ? null : num(row.unansweredMinutes),
    slaBreached: bool(row.slaBreached), transportStatus: nullableStr(row.transportStatus), outboundStatus: nullableStr(row.outboundStatus),
    approvalStatus: nullableStr(row.approvalStatus), canRetry: bool(row.canRetry), needsReview: bool(row.needsReview), needsAttention: bool(row.needsAttention),
  });
}

function parseTimeline(value: unknown): CommunicationTimelineItem {
  const row = obj(value);
  const direction = str(row.direction);
  if (direction !== 'incoming' && direction !== 'outgoing') throw new CommunicationsHubCommandError('INVALID_TIMELINE_DIRECTION');
  return Object.freeze({
    id: str(row.id), channel: str(row.channel), direction, subject: nullableStr(row.subject), bodyText: str(row.bodyText), summary: str(row.summary),
    occurredAt: str(row.occurredAt), linkStatus: str(row.linkStatus), linkVersion: num(row.linkVersion), transportStatus: nullableStr(row.transportStatus),
    transportErrorCode: nullableStr(row.transportErrorCode), outboundCommandId: nullableStr(row.outboundCommandId), outboundStatus: nullableStr(row.outboundStatus),
    approvalStatus: nullableStr(row.approvalStatus), outboundVersion: row.outboundVersion === null ? null : num(row.outboundVersion), canRetry: bool(row.canRetry),
    attachmentCount: num(row.attachmentCount),
  });
}

function parseReview(value: unknown): CommunicationReviewItem {
  const row = obj(value);
  const status = str(row.linkStatus);
  if (status !== 'review_required' && status !== 'unmatched') throw new CommunicationsHubCommandError('INVALID_REVIEW_STATUS');
  return Object.freeze({
    communicationId: str(row.communicationId), conversationId: nullableStr(row.conversationId), channel: str(row.channel), subject: nullableStr(row.subject),
    summary: str(row.summary), occurredAt: str(row.occurredAt), linkStatus: status, linkVersion: num(row.linkVersion),
  });
}

function parseSnapshot(value: unknown): CommunicationsHubSnapshot {
  const row = obj(value);
  const summary = obj(row.summary);
  return Object.freeze({
    workspaceId: str(row.workspaceId), actorUserId: str(row.actorUserId), canGovern: bool(row.canGovern), query: nullableStr(row.query),
    selectedConversationId: nullableStr(row.selectedConversationId),
    summary: Object.freeze({
      conversationCount: num(summary.conversationCount), unreadCount: num(summary.unreadCount), reviewCount: num(summary.reviewCount),
      failedCount: num(summary.failedCount), reconciliationCount: num(summary.reconciliationCount), awaitingApprovalCount: num(summary.awaitingApprovalCount),
      slaMinutes: num(summary.slaMinutes),
    }),
    providerAccounts: Object.freeze(array(row.providerAccounts).map((item) => { const p = obj(item); return Object.freeze({
      id: str(p.id), channel: str(p.channel), provider: str(p.provider), displayName: str(p.displayName), capabilities: Object.freeze(array(p.capabilities).map((x) => str(x))), enabled: bool(p.enabled),
    }); })),
    conversations: Object.freeze(array(row.conversations).map(parseConversation)),
    timeline: Object.freeze(array(row.timeline).map(parseTimeline)),
    reviewQueue: Object.freeze(array(row.reviewQueue).map(parseReview)),
  });
}

async function workspaceId(factory: EnjazDataLayerFactory, userId: string): Promise<string> {
  const id = await factory.resolveWorkspaceId(userId);
  if (!id) throw new CommunicationsHubWorkspaceUnavailableError();
  return id;
}

async function callRpc<T>(factory: EnjazDataLayerFactory, functionName: string, args: Record<string, unknown>) {
  if (!factory.rpc) throw new CommunicationsHubCommandError('COMMUNICATIONS_RPC_UNAVAILABLE');
  return factory.rpc<T>(functionName, args);
}

export async function loadCommunicationsHub(
  factory: EnjazDataLayerFactory,userId: string,query = '',conversationId: string | null = null,
): Promise<CommunicationsHubSnapshot> {
  const id = await workspaceId(factory,userId);
  const result = await callRpc<unknown>(factory,'get_communications_hub_v1', {
    p_workspace_id: id,p_query: query.trim() || null,p_conversation_id: conversationId,p_limit: 60,
  });
  if (result.error) throwRpc(result.error);
  return parseSnapshot(result.data);
}

export async function markCommunicationConversationRead(
  factory: EnjazDataLayerFactory,userId: string,conversationId: string,
): Promise<void> {
  const id = await workspaceId(factory,userId);
  const result = await callRpc(factory,'mark_communication_conversation_read_v1', {
    p_workspace_id: id,p_conversation_id: conversationId,p_expected_version: null,
  });
  if (result.error) throwRpc(result.error);
}

export async function retryCommunicationOutbound(
  factory: EnjazDataLayerFactory,userId: string,commandId: string,expectedVersion: number,
): Promise<void> {
  const id = await workspaceId(factory,userId);
  const result = await callRpc(factory,'retry_communication_outbound_v1', {
    p_workspace_id: id,p_command_id: commandId,p_expected_version: expectedVersion,
  });
  if (result.error) throwRpc(result.error);
}

export async function relinkCommunicationToConversation(
  factory: EnjazDataLayerFactory,userId: string,item: CommunicationReviewItem,target: CommunicationConversation,reason: string,
): Promise<void> {
  const id = await workspaceId(factory,userId);
  const result = await callRpc(factory,'relink_communication_v1', {
    p_workspace_id: id,p_communication_id: item.communicationId,p_expected_version: item.linkVersion,p_conversation_id: target.id,
    p_company_id: target.companyId,p_contact_id: target.contactId,p_transaction_id: target.transactionId,p_reason: reason.trim() || 'ربط يدوي من مركز الاتصالات',
  });
  if (result.error) throwRpc(result.error);
}
