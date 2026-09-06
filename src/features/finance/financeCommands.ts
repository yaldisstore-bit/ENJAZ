import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import { DataAccessError, normalizeDataFailure, normalizeThrownDataFailure, type DataFailureLike } from '../../data/contracts/DataAccessError.ts';

export type FinancePaymentMethod = 'cash' | 'transfer' | 'card' | 'other';
export type EngagementType = 'contract' | 'retainer' | 'service_agreement' | 'other';
export type EngagementBillingMode = 'per_transaction' | 'retainer' | 'fixed' | 'mixed';

export type ReceiptSnapshot = Readonly<Record<string, unknown>>;

export interface FinanceCashboxContext {
  readonly id: string;
  readonly name: string;
  readonly openingBalanceCents: bigint;
  readonly active: boolean;
}

export interface FinanceEngagementContext {
  readonly id: string;
  readonly companyId: string;
  readonly title: string;
  readonly reference: string | null;
  readonly type: EngagementType;
  readonly billingMode: EngagementBillingMode;
  readonly status: string;
  readonly transactionIds: readonly string[];
}

export interface FinanceReversalReceipt {
  readonly reversalId: string;
  readonly reversalRef: string;
  readonly paymentId: string;
  readonly reason: string;
  readonly reversedAt: string;
  readonly snapshot: ReceiptSnapshot;
  readonly wasDuplicate: boolean;
}

export interface FinanceReceipt {
  readonly paymentId: string;
  readonly receiptRef: string;
  readonly receiptSerial: bigint;
  readonly receiptToken: string;
  readonly amountCents: bigint;
  readonly method: FinancePaymentMethod;
  readonly paidAt: string;
  readonly status: 'posted' | 'reversed';
  readonly transactionId: string;
  readonly companyId: string;
  readonly cashboxId: string | null;
  readonly engagementId: string | null;
  readonly note: string | null;
  readonly snapshot: ReceiptSnapshot;
  readonly reversal: FinanceReversalReceipt | null;
  readonly wasDuplicate: boolean;
}

export interface FinanceReconciliation {
  readonly postedTotalCents: bigint;
  readonly reversedTotalCents: bigint;
  readonly statusWithoutReversal: number;
  readonly reversalWithoutStatus: number;
  readonly shadowLedgerEntries: number;
  readonly integrityWarnings: number;
  readonly moneyAuthority: 'payments_plus_non_payment_ledger';
}

export interface FinancePaymentContext {
  readonly cashboxes: readonly FinanceCashboxContext[];
  readonly engagements: readonly FinanceEngagementContext[];
  readonly recentReceipts: readonly FinanceReceipt[];
  readonly reconciliation: FinanceReconciliation;
}

export interface PostPaymentInput {
  readonly workspaceId: string;
  readonly transactionId: string;
  readonly amountCents: bigint;
  readonly method: FinancePaymentMethod;
  readonly paidAt: string;
  readonly note: string | null;
  readonly idempotencyKey: string;
  readonly cashboxId: string | null;
  readonly engagementId: string | null;
}

export interface ReversePaymentInput {
  readonly workspaceId: string;
  readonly paymentId: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export interface CreateCashboxInput {
  readonly workspaceId: string;
  readonly name: string;
  readonly openingBalanceCents: bigint;
  readonly idempotencyKey: string;
}

export interface CreateEngagementInput {
  readonly workspaceId: string;
  readonly companyId: string;
  readonly transactionId: string;
  readonly title: string;
  readonly type: EngagementType;
  readonly billingMode: EngagementBillingMode;
  readonly reference: string | null;
  readonly startOn: string | null;
  readonly endOn: string | null;
  readonly idempotencyKey: string;
}

export interface FinanceCommandGateway {
  loadContext(workspaceId: string): Promise<FinancePaymentContext>;
  postPayment(input: PostPaymentInput): Promise<FinanceReceipt>;
  reversePayment(input: ReversePaymentInput): Promise<FinanceReversalReceipt>;
  getReceipt(workspaceId: string, paymentId: string): Promise<FinanceReceipt>;
  createCashbox(input: CreateCashboxInput): Promise<FinanceCashboxContext & Readonly<{ wasDuplicate: boolean }>>;
  createEngagement(input: CreateEngagementInput): Promise<FinanceEngagementContext & Readonly<{ wasDuplicate: boolean }>>;
}

interface RpcResponse { readonly data: unknown; readonly error: DataFailureLike | null }
interface RpcClientLike { rpc(name: string, args: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }

const DEFAULT_RPC_TIMEOUT_MS = 15_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECIMAL_PATTERN = /^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/;

function requireUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value.trim();
}

function requireString(value: unknown, label: string, max = 10_000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  return requireString(value, label);
}

function requireRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value as Readonly<Record<string, unknown>>;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return value;
}

function requireInteger(value: unknown, label: string): number {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(numberValue) || numberValue < 0) throw new DataAccessError(`Invalid ${label}`, 'DATA_OPERATION_FAILED');
  return numberValue;
}

export function parseFinanceDecimalToCents(value: string, label = 'money'): bigint {
  const normalized = value.trim();
  const match = normalized.match(DECIMAL_PATTERN);
  if (!match) throw new DataAccessError(`Invalid ${label}`, 'DATA_VALIDATION_FAILED');
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  return whole * 100n + fraction;
}

export function financeCentsToDecimal(cents: bigint): string {
  if (cents < 0n) throw new DataAccessError('Negative finance command amount', 'DATA_VALIDATION_FAILED');
  const whole = cents / 100n;
  const fraction = cents % 100n;
  if (whole > 9_999_999_999_999_999n) throw new DataAccessError('Finance command amount exceeds numeric(18,2)', 'DATA_VALIDATION_FAILED');
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
}

function parseMethod(value: unknown): FinancePaymentMethod {
  if (value === 'cash' || value === 'transfer' || value === 'card' || value === 'other') return value;
  throw new DataAccessError('Invalid payment method response', 'DATA_OPERATION_FAILED');
}

function parseEngagementType(value: unknown): EngagementType {
  if (value === 'contract' || value === 'retainer' || value === 'service_agreement' || value === 'other') return value;
  throw new DataAccessError('Invalid engagement type response', 'DATA_OPERATION_FAILED');
}

function parseBillingMode(value: unknown): EngagementBillingMode {
  if (value === 'per_transaction' || value === 'retainer' || value === 'fixed' || value === 'mixed') return value;
  throw new DataAccessError('Invalid billing mode response', 'DATA_OPERATION_FAILED');
}

function parseSnapshot(value: unknown): ReceiptSnapshot {
  return Object.freeze({ ...requireRecord(value, 'receipt snapshot') });
}

function parseReversal(value: unknown, duplicateFallback = false): FinanceReversalReceipt {
  const row = requireRecord(value, 'reversal result');
  return Object.freeze({
    reversalId: requireUuid(row.reversalId, 'reversal id'),
    reversalRef: requireString(row.reversalRef, 'reversal ref', 120),
    paymentId: requireUuid(row.paymentId, 'payment id'),
    reason: requireString(row.reason, 'reversal reason', 600),
    reversedAt: requireString(row.reversedAt, 'reversed at', 80),
    snapshot: parseSnapshot(row.snapshot),
    wasDuplicate: typeof row.wasDuplicate === 'boolean' ? row.wasDuplicate : duplicateFallback,
  });
}

function parseReceipt(value: unknown): FinanceReceipt {
  const row = requireRecord(value, 'receipt result');
  const status = row.status === 'posted' || row.status === 'reversed' ? row.status : null;
  if (!status) throw new DataAccessError('Invalid payment status response', 'DATA_OPERATION_FAILED');
  const reversal = row.reversal === null || row.reversal === undefined ? null : parseReversal({ ...requireRecord(row.reversal, 'receipt reversal'), paymentId: row.paymentId, wasDuplicate: true }, true);
  return Object.freeze({
    paymentId: requireUuid(row.paymentId, 'payment id'),
    receiptRef: requireString(row.receiptRef, 'receipt ref', 120),
    receiptSerial: BigInt(requireString(String(row.receiptSerial), 'receipt serial', 32)),
    receiptToken: requireUuid(row.receiptToken, 'receipt token'),
    amountCents: parseFinanceDecimalToCents(requireString(row.amount, 'receipt amount', 32), 'receipt amount'),
    method: parseMethod(row.method),
    paidAt: requireString(row.paidAt, 'paid at', 80),
    status,
    transactionId: requireUuid(row.transactionId, 'transaction id'),
    companyId: requireUuid(row.companyId, 'company id'),
    cashboxId: row.cashboxId === null || row.cashboxId === undefined ? null : requireUuid(row.cashboxId, 'cashbox id'),
    engagementId: row.engagementId === null || row.engagementId === undefined ? null : requireUuid(row.engagementId, 'engagement id'),
    note: nullableString(row.note, 'receipt note'),
    snapshot: parseSnapshot(row.snapshot),
    reversal,
    wasDuplicate: row.wasDuplicate === true,
  });
}

function parseContext(value: unknown): FinancePaymentContext {
  const row = requireRecord(value, 'payment context');
  const cashboxes = requireArray(row.cashboxes, 'cashboxes').map((item) => {
    const value = requireRecord(item, 'cashbox');
    return Object.freeze({
      id: requireUuid(value.id, 'cashbox id'),
      name: requireString(value.name, 'cashbox name', 180),
      openingBalanceCents: parseFinanceDecimalToCents(requireString(value.openingBalance, 'opening balance', 32), 'opening balance'),
      active: value.active === true,
    });
  });
  const engagements = requireArray(row.engagements, 'engagements').map((item) => {
    const value = requireRecord(item, 'engagement');
    return Object.freeze({
      id: requireUuid(value.id, 'engagement id'),
      companyId: requireUuid(value.companyId, 'engagement company id'),
      title: requireString(value.title, 'engagement title', 320),
      reference: nullableString(value.reference, 'engagement reference'),
      type: parseEngagementType(value.type),
      billingMode: parseBillingMode(value.billingMode),
      status: requireString(value.status, 'engagement status', 40),
      transactionIds: Object.freeze(requireArray(value.transactionIds, 'engagement transactions').map((id) => requireUuid(id, 'engagement transaction id'))),
    });
  });
  const reconciliationRow = requireRecord(row.reconciliation, 'reconciliation');
  const authority = reconciliationRow.moneyAuthority;
  if (authority !== 'payments_plus_non_payment_ledger') throw new DataAccessError('Unexpected finance authority', 'DATA_OPERATION_FAILED');
  const reconciliation: FinanceReconciliation = Object.freeze({
    postedTotalCents: parseFinanceDecimalToCents(requireString(reconciliationRow.postedTotal, 'posted total', 32), 'posted total'),
    reversedTotalCents: parseFinanceDecimalToCents(requireString(reconciliationRow.reversedTotal, 'reversed total', 32), 'reversed total'),
    statusWithoutReversal: requireInteger(reconciliationRow.statusWithoutReversal, 'status without reversal'),
    reversalWithoutStatus: requireInteger(reconciliationRow.reversalWithoutStatus, 'reversal without status'),
    shadowLedgerEntries: requireInteger(reconciliationRow.shadowLedgerEntries, 'shadow ledger entries'),
    integrityWarnings: requireInteger(reconciliationRow.integrityWarnings, 'integrity warnings'),
    moneyAuthority: authority,
  });
  return Object.freeze({
    cashboxes: Object.freeze(cashboxes),
    engagements: Object.freeze(engagements),
    recentReceipts: Object.freeze(requireArray(row.recentReceipts, 'recent receipts').map(parseReceipt)),
    reconciliation,
  });
}

async function settleRpc<T>(operation: PromiseLike<T>, write: boolean, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DataAccessError(
      write ? 'Finance write outcome could not be confirmed' : 'Finance RPC read deadline elapsed',
      write ? 'DATA_OUTCOME_UNKNOWN' : 'DATA_UNAVAILABLE',
    )), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(operation), deadline]);
  } catch (error) {
    throw normalizeThrownDataFailure(error, write ? 'write' : 'read');
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function runRpc(client: RpcClientLike, name: string, args: Readonly<Record<string, unknown>>, write: boolean, timeoutMs: number): Promise<unknown> {
  const response = await settleRpc(client.rpc(name, args), write, timeoutMs);
  if (response.error) throw normalizeDataFailure(response.error);
  return response.data;
}

export function createSupabaseFinanceCommandGateway(client: EnjazSupabaseClient, timeoutMs = DEFAULT_RPC_TIMEOUT_MS): FinanceCommandGateway {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid finance RPC timeout');
  const rpcClient = client as unknown as RpcClientLike;
  return Object.freeze({
    async loadContext(workspaceId) {
      return parseContext(await runRpc(rpcClient, 'finance_payment_context_v1', { p_workspace_id: requireUuid(workspaceId, 'workspace id') }, false, timeoutMs));
    },
    async postPayment(input) {
      if (input.amountCents <= 0n) throw new DataAccessError('Payment amount must be positive', 'DATA_VALIDATION_FAILED');
      return parseReceipt(await runRpc(rpcClient, 'post_payment_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_transaction_id: requireUuid(input.transactionId, 'transaction id'),
        p_amount: financeCentsToDecimal(input.amountCents),
        p_method: input.method,
        p_paid_at: requireString(input.paidAt, 'paid at', 80),
        p_note: input.note,
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
        p_cashbox_id: input.cashboxId === null ? null : requireUuid(input.cashboxId, 'cashbox id'),
        p_engagement_id: input.engagementId === null ? null : requireUuid(input.engagementId, 'engagement id'),
      }, true, timeoutMs));
    },
    async reversePayment(input) {
      const reason = input.reason.trim();
      if (reason.length < 3 || reason.length > 600) throw new DataAccessError('Invalid reversal reason', 'DATA_VALIDATION_FAILED');
      return parseReversal(await runRpc(rpcClient, 'reverse_payment_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_payment_id: requireUuid(input.paymentId, 'payment id'),
        p_reason: reason,
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }, true, timeoutMs));
    },
    async getReceipt(workspaceId, paymentId) {
      return parseReceipt(await runRpc(rpcClient, 'get_payment_receipt_v1', {
        p_workspace_id: requireUuid(workspaceId, 'workspace id'),
        p_payment_id: requireUuid(paymentId, 'payment id'),
      }, false, timeoutMs));
    },
    async createCashbox(input) {
      const row = requireRecord(await runRpc(rpcClient, 'create_finance_cashbox_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_name: requireString(input.name, 'cashbox name', 180).trim(),
        p_opening_balance: financeCentsToDecimal(input.openingBalanceCents),
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }, true, timeoutMs), 'cashbox result');
      return Object.freeze({
        id: requireUuid(row.cashboxId, 'cashbox id'),
        name: requireString(row.name, 'cashbox name', 180),
        openingBalanceCents: parseFinanceDecimalToCents(requireString(row.openingBalance, 'opening balance', 32), 'opening balance'),
        active: true,
        wasDuplicate: row.wasDuplicate === true,
      });
    },
    async createEngagement(input) {
      const row = requireRecord(await runRpc(rpcClient, 'create_billing_engagement_v1', {
        p_workspace_id: requireUuid(input.workspaceId, 'workspace id'),
        p_company_id: requireUuid(input.companyId, 'company id'),
        p_transaction_id: requireUuid(input.transactionId, 'transaction id'),
        p_title: requireString(input.title, 'engagement title', 320).trim(),
        p_engagement_type: input.type,
        p_billing_mode: input.billingMode,
        p_reference: input.reference,
        p_start_on: input.startOn,
        p_end_on: input.endOn,
        p_idempotency_key: requireUuid(input.idempotencyKey, 'idempotency key'),
      }, true, timeoutMs), 'engagement result');
      return Object.freeze({
        id: requireUuid(row.engagementId, 'engagement id'),
        companyId: input.companyId,
        title: requireString(row.title, 'engagement title', 320),
        reference: nullableString(row.reference, 'engagement reference'),
        type: parseEngagementType(row.type),
        billingMode: parseBillingMode(row.billingMode),
        status: 'active',
        transactionIds: Object.freeze([input.transactionId]),
        wasDuplicate: row.wasDuplicate === true,
      });
    },
  });
}
