import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';
import {
  validateEngagementContractRevision,
  type EngagementContractRevision,
  type EngagementContractStatus,
} from './engagementContract.ts';

export type EngagementContractRuntimeRevision = Readonly<EngagementContractRevision & {
  id: string;
  version: number;
  signatureProvenance: Readonly<Record<string, unknown>>;
  terminationNote: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateEngagementContractRevisionInput = Readonly<{
  workspaceId: string;
  engagementId: string;
  templateVersionId: string;
  draftId: string;
  title: string;
  idempotencyKey: string;
}>;

export type TransitionEngagementContractRevisionInput = Readonly<{
  workspaceId: string;
  revisionId: string;
  operationId: string;
  expectedVersion: number;
  toStatus: EngagementContractStatus;
  documentId?: string | null;
  documentVersionId?: string | null;
  effectiveOn?: string | null;
  expiresOn?: string | null;
  signatureProvenance?: Readonly<Record<string, unknown>> | null;
  note?: string | null;
}>;

export type UnifiedAttentionKind = 'intake_followup' | 'client_approval' | 'contract_renewal';
export type UnifiedAttentionFilter = 'all' | UnifiedAttentionKind;
export type UnifiedAttentionItem = Readonly<{
  id:string; kind:UnifiedAttentionKind; title:string;
  state:'open'|'responded'|'revoked'|'expired'|'awaiting_client'|'decision_ready'|'reconciled'|'active'|'completed'|'cancelled';
  attentionState:'terminal'|'response_ready'|'waiting_external'|'action_required'|'conflict'|'overdue'|'due_today'|'upcoming';
  stale:boolean; dueAt:string|null; decision:'approved'|'rejected'|null; communicationEvidence:boolean;
  canonicalId:string; companyId:string|null; transactionId:string|null; contractRevisionId:string|null;
  ownerSurface:'intake_review'|'documents'|'calendar'; sourceVersion:number; canonicalVersion:number;
}>;
export type UnifiedAttentionView = Readonly<{
  schema:'enjaz.intake-contract-attention.v1'; workspaceId:string; workspaceTimezone:string;
  kind:UnifiedAttentionFilter; includeTerminal:boolean; generatedAt:string; items:readonly UnifiedAttentionItem[];
}>;

export interface EngagementContractGateway {
  list(workspaceId: string, engagementId?: string | null): Promise<readonly EngagementContractRuntimeRevision[]>;
  listAttention(workspaceId:string,kind?:UnifiedAttentionFilter,includeTerminal?:boolean,limit?:number):Promise<UnifiedAttentionView>;
  create(input: CreateEngagementContractRevisionInput): Promise<EngagementContractRuntimeRevision>;
  transition(input: TransitionEngagementContractRevisionInput): Promise<EngagementContractRuntimeRevision>;
}

type RpcClientLike = {
  rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<{ data: unknown; error: DataFailureLike | null }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly EngagementContractStatus[] = Object.freeze([
  'draft','under_review','approved','signature_pending','signed','effective','expired','terminated','superseded',
]);
const ATTENTION_KINDS=['intake_followup','client_approval','contract_renewal'] as const;
const ATTENTION_FILTERS=['all',...ATTENTION_KINDS] as const;
const ATTENTION_STATES=['open','responded','revoked','expired','awaiting_client','decision_ready','reconciled','active','completed','cancelled'] as const;
const ATTENTION_LEVELS=['terminal','response_ready','waiting_external','action_required','conflict','overdue','due_today','upcoming'] as const;
const ATTENTION_SURFACES=['intake_review','documents','calendar'] as const;

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value.trim();
}

function nullableUuid(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireUuid(value, label);
}

function requireText(value: unknown, label: string, max = 320): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000\r\n]/u.test(value)) {
    throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  }
  return value.trim();
}

function nullableText(value: unknown, label: string, max = 1000): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireText(value, label, max);
}

function nullableDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  }
  return value;
}

function status(value: unknown): EngagementContractStatus {
  if (typeof value === 'string' && STATUSES.includes(value as EngagementContractStatus)) return value as EngagementContractStatus;
  throw new DataAccessError('Invalid engagement contract status', 'DATA_OPERATION_FAILED');
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}

function rows(value: unknown, label: string): readonly Readonly<Record<string, unknown>>[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value.map((item) => record(item, label));
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return parsed;
}

function revisionNumber(value: unknown): number {
  return positiveInteger(value, 'contract revision number');
}

function enumValue<T extends readonly string[]>(value:unknown,allowed:T,label:string):T[number]{
  if(typeof value!=='string'||!(allowed as readonly string[]).includes(value))throw new DataAccessError(`Invalid ${label}`,'DATA_OPERATION_FAILED');
  return value as T[number];
}
function strictBoolean(value:unknown,label:string):boolean{
  if(typeof value!=='boolean')throw new DataAccessError(`Invalid ${label}`,'DATA_OPERATION_FAILED');
  return value;
}
function attentionTime(value:unknown,label:string):string|null{
  if(value===null)return null;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new DataAccessError(`Invalid ${label}`,'DATA_OPERATION_FAILED');
  return value;
}
function parseAttentionItem(value:unknown):UnifiedAttentionItem{
  const row=record(value,'unified attention item');
  const decision=row.decision===null?null:enumValue(row.decision,['approved','rejected'] as const,'attention decision');
  return Object.freeze({
    id:requireUuid(row.id,'attention id'),
    kind:enumValue(row.kind,ATTENTION_KINDS,'attention kind'),
    title:requireText(row.title,'attention title'),
    state:enumValue(row.state,ATTENTION_STATES,'attention state'),
    attentionState:enumValue(row.attentionState,ATTENTION_LEVELS,'attention level'),
    stale:strictBoolean(row.stale,'attention stale flag'),
    dueAt:attentionTime(row.dueAt,'attention due time'),
    decision,
    communicationEvidence:strictBoolean(row.communicationEvidence,'communication evidence flag'),
    canonicalId:requireUuid(row.canonicalId,'attention canonical id'),
    companyId:nullableUuid(row.companyId,'attention company id'),
    transactionId:nullableUuid(row.transactionId,'attention transaction id'),
    contractRevisionId:nullableUuid(row.contractRevisionId,'attention contract revision id'),
    ownerSurface:enumValue(row.ownerSurface,ATTENTION_SURFACES,'attention owner surface'),
    sourceVersion:positiveInteger(row.sourceVersion,'attention source version'),
    canonicalVersion:positiveInteger(row.canonicalVersion,'attention canonical version'),
  });
}
function parseAttentionView(value:unknown):UnifiedAttentionView{
  const row=record(value,'unified attention view'),generatedAt=attentionTime(row.generatedAt,'attention generated time');
  if(row.schema!=='enjaz.intake-contract-attention.v1'||generatedAt===null||typeof row.includeTerminal!=='boolean')throw new DataAccessError('Invalid unified attention view','DATA_OPERATION_FAILED');
  return Object.freeze({
    schema:'enjaz.intake-contract-attention.v1',
    workspaceId:requireUuid(row.workspaceId,'attention workspace id'),
    workspaceTimezone:requireText(row.workspaceTimezone,'workspace timezone',120),
    kind:enumValue(row.kind,ATTENTION_FILTERS,'attention filter'),
    includeTerminal:row.includeTerminal,
    generatedAt,
    items:Object.freeze(rows(row.items,'unified attention items').map(parseAttentionItem)),
  });
}

function parseRevision(row: Readonly<Record<string, unknown>>): EngagementContractRuntimeRevision {
  const revision = validateEngagementContractRevision({
    workspaceId: requireUuid(row.workspace_id ?? row.workspaceId, 'workspace id'),
    engagementId: requireUuid(row.engagement_id ?? row.engagementId, 'engagement id'),
    revision: revisionNumber(row.revision_number ?? row.revision),
    title: requireText(row.title, 'contract title'),
    status: status(row.status),
    templateVersionId: requireUuid(row.template_version_id ?? row.templateVersionId, 'template version id'),
    draftId: requireUuid(row.draft_id ?? row.draftId, 'draft id'),
    documentId: nullableUuid(row.document_id ?? row.documentId, 'document id'),
    documentVersionId: nullableUuid(row.document_version_id ?? row.documentVersionId, 'document version id'),
    supersedesRevision: row.supersedes_revision_number === null || row.supersedesRevision === null || row.supersedes_revision_number === undefined && row.supersedesRevision === undefined
      ? null
      : revisionNumber(row.supersedes_revision_number ?? row.supersedesRevision),
    effectiveOn: nullableDate(row.effective_on ?? row.effectiveOn, 'effective date'),
    expiresOn: nullableDate(row.expires_on ?? row.expiresOn, 'expiry date'),
    signedAt: nullableText(row.signed_at ?? row.signedAt, 'signed timestamp', 100),
  });
  const provenanceValue = row.signature_provenance ?? row.signatureProvenance ?? {};
  const provenance = record(provenanceValue, 'signature provenance');
  return Object.freeze({
    ...revision,
    id: requireUuid(row.id ?? row.revisionId, 'revision id'),
    version: positiveInteger(row.version, 'contract revision version'),
    signatureProvenance: Object.freeze({ ...provenance }),
    terminationNote: nullableText(row.termination_note ?? row.terminationNote, 'termination note', 1000),
    createdAt: typeof (row.created_at ?? row.createdAt) === 'string' ? String(row.created_at ?? row.createdAt) : '',
    updatedAt: typeof (row.updated_at ?? row.updatedAt) === 'string' ? String(row.updated_at ?? row.updatedAt) : '',
  });
}

export function createEngagementContractGateway(client: EnjazSupabaseClient, timeoutMs = 15_000): EngagementContractGateway {
  const rpc = client as unknown as RpcClientLike;
  const wait = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('engagement contract timeout')), timeoutMs); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const call = async (name: string, args: Readonly<Record<string, unknown>>, write = true): Promise<unknown> => {
    try {
      const result = await wait(Promise.resolve(rpc.rpc(name, args)));
      if (result.error) throw normalizeDataFailure(result.error);
      return result.data;
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw normalizeThrownDataFailure(error, write ? 'write' : 'read');
    }
  };

  const fetchRevision = async (workspaceId: string, revisionId: string): Promise<EngagementContractRuntimeRevision> => {
    try {
      const result = await client.from('engagement_contract_revisions')
        .select('id,workspace_id,engagement_id,revision_number,title,status,template_version_id,draft_id,document_id,document_version_id,supersedes_revision_number,effective_on,expires_on,signed_at,signature_provenance,termination_note,version,created_at,updated_at')
        .eq('workspace_id', requireUuid(workspaceId, 'workspace id'))
        .eq('id', requireUuid(revisionId, 'revision id'))
        .maybeSingle();
      if (result.error) throw normalizeDataFailure(result.error as DataFailureLike);
      if (!result.data) throw new DataAccessError('Engagement contract revision not found', 'DATA_OPERATION_FAILED');
      return parseRevision(record(result.data, 'engagement contract revision'));
    } catch (error) {
      if (error instanceof DataAccessError) throw error;
      throw normalizeThrownDataFailure(error, 'read');
    }
  };

  return Object.freeze({
    async list(workspaceId: string, engagementId: string | null = null) {
      const ws = requireUuid(workspaceId, 'workspace id');
      const engagement = engagementId ? requireUuid(engagementId, 'engagement id') : null;
      try {
        let query = client.from('engagement_contract_revisions')
          .select('id,workspace_id,engagement_id,revision_number,title,status,template_version_id,draft_id,document_id,document_version_id,supersedes_revision_number,effective_on,expires_on,signed_at,signature_provenance,termination_note,version,created_at,updated_at')
          .eq('workspace_id', ws)
          .order('updated_at', { ascending: false });
        if (engagement) query = query.eq('engagement_id', engagement);
        const result = await wait(Promise.resolve(query));
        if (result.error) throw normalizeDataFailure(result.error as DataFailureLike);
        return Object.freeze(rows(result.data ?? [], 'engagement contract revisions').map(parseRevision));
      } catch (error) {
        if (error instanceof DataAccessError) throw error;
        throw normalizeThrownDataFailure(error, 'read');
      }
    },

    async listAttention(workspaceId:string,kind:UnifiedAttentionFilter='all',includeTerminal=false,limit=200){
      const ws=requireUuid(workspaceId,'workspace id');
      if(!ATTENTION_FILTERS.includes(kind)||typeof includeTerminal!=='boolean'||!Number.isSafeInteger(limit)||limit<1||limit>500)throw new DataAccessError('Invalid unified attention request','DATA_VALIDATION_FAILED');
      return parseAttentionView(await call('list_unified_intake_contract_attention_v1',{p_workspace_id:ws,p_kind:kind,p_include_terminal:includeTerminal,p_limit:limit},false));
    },

    async create(input: CreateEngagementContractRevisionInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const response = record(await call('create_engagement_contract_revision_v1', {
        p_workspace_id: workspaceId,
        p_engagement_id: requireUuid(input.engagementId, 'engagement id'),
        p_template_version_id: requireUuid(input.templateVersionId, 'template version id'),
        p_draft_id: requireUuid(input.draftId, 'draft id'),
        p_title: requireText(input.title, 'contract title'),
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }), 'contract create response');
      return fetchRevision(workspaceId, requireUuid(response.revisionId, 'revision id'));
    },

    async transition(input: TransitionEngagementContractRevisionInput) {
      const workspaceId = requireUuid(input.workspaceId, 'workspace id');
      const revisionId = requireUuid(input.revisionId, 'revision id');
      const operationId = requireUuid(input.operationId, 'operation id');
      const expectedVersion = positiveInteger(input.expectedVersion, 'expected contract revision version');
      const documentId = input.documentId === undefined ? null : nullableUuid(input.documentId, 'document id');
      const documentVersionId = input.documentVersionId === undefined ? null : nullableUuid(input.documentVersionId, 'document version id');
      if ((documentId === null) !== (documentVersionId === null)) throw new DataAccessError('Document and version must be supplied together', 'DATA_VALIDATION_FAILED');
      const signature = input.signatureProvenance === undefined || input.signatureProvenance === null
        ? null
        : Object.freeze({ ...record(input.signatureProvenance, 'signature provenance') });
      const response = record(await call('transition_engagement_contract_revision_v2', {
        p_workspace_id: workspaceId,
        p_revision_id: revisionId,
        p_operation_id: operationId,
        p_expected_version: expectedVersion,
        p_to_status: status(input.toStatus),
        p_document_id: documentId,
        p_document_version_id: documentVersionId,
        p_effective_on: input.effectiveOn === undefined ? null : nullableDate(input.effectiveOn, 'effective date'),
        p_expires_on: input.expiresOn === undefined ? null : nullableDate(input.expiresOn, 'expiry date'),
        p_signature_provenance: signature,
        p_note: input.note === undefined ? null : nullableText(input.note, 'transition note', 1000),
      }), 'contract transition response');
      const canonicalId = requireUuid(response.revisionId ?? revisionId, 'revision id');
      return fetchRevision(workspaceId, canonicalId);
    },
  });
}
