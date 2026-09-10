import { useEffect, useMemo, useRef, useState } from 'react';
import { DataAccessError } from '../../data/contracts/DataAccessError.ts';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { buildTransactionListSnapshot, normalizeTransactionListRequest, type TransactionListRequest, type TransactionListSnapshot, type TransactionListSort, type TransactionListSource, type TransactionListView } from './transactionListModel.ts';
import { clearTransactionSavedViewBridge, publishTransactionSavedViewBridge } from './transactionSavedViewBridge.ts';
import { loadTransactionListSource, TransactionListCapacityError, TransactionWorkspaceUnavailableError } from './transactionListService.ts';

export type TransactionListLoadState='loading'|'ready'|'error';
export interface TransactionListController{readonly status:TransactionListLoadState;readonly snapshot:TransactionListSnapshot|null;readonly request:TransactionListRequest;readonly errorMessage:string|null;readonly retry:()=>void;readonly setView:(view:TransactionListView)=>void;readonly setSearch:(search:string)=>void;readonly setSort:(sort:TransactionListSort)=>void;readonly setPage:(page:number)=>void;readonly applyRequest:(request:Partial<TransactionListRequest>)=>void}
const INITIAL_REQUEST=normalizeTransactionListRequest();
function toTransactionListErrorMessage(error:unknown):string{if(error instanceof TransactionWorkspaceUnavailableError)return'تعذر العثور على مساحة العمل المرتبطة بحسابك.';if(error instanceof TransactionListCapacityError)return'عدد المعاملات أكبر من حد العرض الآمن الحالي. لم يتم عرض قائمة جزئية أو مضللة.';if(error instanceof DataAccessError){if(error.dataCode==='DATA_FORBIDDEN')return'ليس لديك صلاحية لقراءة معاملات مساحة العمل الحالية.';if(error.dataCode==='DATA_UNAVAILABLE')return'تعذر الوصول إلى بيانات المعاملات الآن. تحقق من الاتصال ثم أعد المحاولة.'}return'حدث خطأ غير متوقع أثناء تجهيز قائمة المعاملات. لم يتم عرض نتائج جزئية.'}

export function useTransactionList():TransactionListController{
  const userId=useCurrentUserId(),factory=useDataLayerFactory(),token=useRef(Symbol());
  const [attempt,setAttempt]=useState(0),[source,setSource]=useState<TransactionListSource|null>(null),[status,setStatus]=useState<TransactionListLoadState>('loading'),[errorMessage,setErrorMessage]=useState<string|null>(null),[request,setRequest]=useState<TransactionListRequest>(INITIAL_REQUEST);
  useEffect(()=>{let active=true;if(!userId){setSource(null);setStatus('error');setErrorMessage('انتهت جلسة المستخدم. سجّل الدخول مرة أخرى.');return()=>{active=false}}setStatus('loading');setErrorMessage(null);void loadTransactionListSource(factory,userId).then(({source:next})=>{if(active){setSource(next);setStatus('ready')}}).catch((error:unknown)=>{if(active){setSource(null);setStatus('error');setErrorMessage(toTransactionListErrorMessage(error))}});return()=>{active=false}},[attempt,factory,userId]);
  useEffect(()=>{const t=token.current;publishTransactionSavedViewBridge(t,request,next=>setRequest(normalizeTransactionListRequest({...next,page:0})));return()=>clearTransactionSavedViewBridge(t)},[request]);
  const snapshot=useMemo(()=>source?buildTransactionListSnapshot(source,request):null,[request,source]);
  return Object.freeze({status,snapshot,request,errorMessage,retry(){setAttempt(x=>x+1)},setView(view){setRequest(x=>normalizeTransactionListRequest({...x,view,page:0}))},setSearch(search){setRequest(x=>normalizeTransactionListRequest({...x,search,page:0}))},setSort(sort){setRequest(x=>normalizeTransactionListRequest({...x,sort,page:0}))},setPage(page){setRequest(x=>normalizeTransactionListRequest({...x,page}))},applyRequest(next){setRequest(normalizeTransactionListRequest({...next,page:0}))}});
}
