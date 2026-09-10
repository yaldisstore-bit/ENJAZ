import type { TransactionListRequest } from './transactionListModel.ts';

export type TransactionSavedViewApply = (request: Partial<TransactionListRequest>) => void;
export type TransactionSavedViewBridgeSnapshot = Readonly<{
  request: TransactionListRequest | null;
  apply: TransactionSavedViewApply | null;
}>;

const EMPTY: TransactionSavedViewBridgeSnapshot = Object.freeze({ request: null, apply: null });
let snapshot: TransactionSavedViewBridgeSnapshot = EMPTY;
let owner: symbol | null = null;
const listeners = new Set<() => void>();

function emit() { for (const listener of listeners) listener(); }

export function publishTransactionSavedViewBridge(token: symbol, request: TransactionListRequest, apply: TransactionSavedViewApply): void {
  owner = token;
  snapshot = Object.freeze({ request, apply });
  emit();
}

export function clearTransactionSavedViewBridge(token: symbol): void {
  if (owner !== token) return;
  owner = null;
  snapshot = EMPTY;
  emit();
}

export function subscribeTransactionSavedViewBridge(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTransactionSavedViewBridgeSnapshot(): TransactionSavedViewBridgeSnapshot { return snapshot; }
