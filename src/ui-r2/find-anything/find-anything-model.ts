import { R2_DESTINATIONS, R2_SEARCH_ALIASES, getR2Destination, type R2DestinationId } from '../architecture/navigation-contract.ts';

export type R2FindAnythingKind='feature'|'transaction';
export type R2FindAnythingSource='navigation'|'preview-record';
export type R2FindAnythingResult={key:string;kind:R2FindAnythingKind;label:string;secondary:string;destinationId:R2DestinationId;transactionId:string|null;source:R2FindAnythingSource;score:number};
export type SearchableRecord={key:string;kind:'transaction';label:string;secondary:string;destinationId: 'transactions.detail';transactionId:string;terms:readonly string[]};
type SearchGlobal=typeof globalThis&{__ENJAZ_R2_PREVIEW_SEARCH_RECORDS__?:readonly SearchableRecord[]};

export function normalizeR2Search(value:string):string{return value.normalize('NFKC').toLocaleLowerCase('ar-IQ').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/\u0640/g,'').replace(/[أإآٱ]/g,'ا').replace(/ؤ/g,'و').replace(/[ئى]/g,'ي').replace(/\s+/g,' ').trim()}
function score(query:string,terms:readonly string[]){if(!query)return 0;const tokens=query.split(' ').filter(Boolean);let best=0;for(const raw of terms){const term=normalizeR2Search(raw);best=Math.max(best,term===query?100:term.startsWith(query)?84:term.includes(query)?72:tokens.length>1&&tokens.every(x=>term.includes(x))?62:0)}return best}
const SHORTCUTS:readonly R2DestinationId[]=['transactions','today','companies','finance','automation','documents'];

export function buildR2FindAnythingResults(rawQuery:string,options:{limit?:number;records?:readonly SearchableRecord[]}={}):readonly R2FindAnythingResult[]{
  const limit=Math.min(Math.max(options.limit??12,1),20),query=normalizeR2Search(rawQuery);
  if(!query)return SHORTCUTS.slice(0,limit).map((id,index):R2FindAnythingResult=>({key:`feature:${id}`,kind:'feature',label:getR2Destination(id).label,secondary:'اختصار سريع · منزل قانوني واحد',destinationId:id,transactionId:null,source:'navigation',score:100-index}));
  const records=options.records??(globalThis as SearchGlobal).__ENJAZ_R2_PREVIEW_SEARCH_RECORDS__??[];
  const recordResults=records.map((record):R2FindAnythingResult=>({key:record.key,kind:'transaction',label:record.label,secondary:record.secondary,destinationId: 'transactions.detail',transactionId:record.transactionId,source:'preview-record',score:score(query,record.terms)})).filter(x=>x.score>0);
  const featureResults=R2_DESTINATIONS.filter(x=>x.kind!=='system_boundary').map((item):R2FindAnythingResult=>({key:`feature:${item.id}`,kind:'feature',label:item.label,secondary:item.kind==='launcher_destination'?'ميزة · منزل قانوني واحد':'وجهة نظام',destinationId:item.id,transactionId:null,source:'navigation',score:score(query,[item.label,item.id,...Object.entries(R2_SEARCH_ALIASES).filter(([,id])=>id===item.id).map(([alias])=>alias)])})).filter(x=>x.score>0);
  return [...recordResults,...featureResults].sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'ar')).slice(0,limit);
}
