import type { TransactionListRequest } from './transactionListModel.ts';
export type TransactionSavedViewBridgeSnapshot=Readonly<{request:TransactionListRequest|null;apply:((request:Partial<TransactionListRequest>)=>void)|null}>;
const empty:TransactionSavedViewBridgeSnapshot=Object.freeze({request:null,apply:null}),listeners=new Set<()=>void>();let snapshot=empty,owner:symbol|null=null;
const emit=()=>listeners.forEach(fn=>fn());
export function publishTransactionSavedViewBridge(token:symbol,request:TransactionListRequest,apply:(request:Partial<TransactionListRequest>)=>void){owner=token;snapshot=Object.freeze({request,apply});emit()}
export function clearTransactionSavedViewBridge(token:symbol){if(owner===token){owner=null;snapshot=empty;emit()}}
export function subscribeTransactionSavedViewBridge(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)}
export const getTransactionSavedViewBridgeSnapshot=()=>snapshot;
