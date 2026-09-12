import type { RegulatorySourceKind, RegulatorySourceScope } from '../../features/regulatory/regulatoryKnowledgeContract.ts';

export const REGULATORY_KIND_LABELS:Readonly<Record<RegulatorySourceKind,string>>=Object.freeze({
  law:'قانون',regulation:'نظام',instruction:'تعليمات',circular:'تعميم',official_notice:'إعلان رسمي',procedure:'إجراء',
});
export const REGULATORY_SCOPE_LABELS:Readonly<Record<RegulatorySourceScope,string>>=Object.freeze({
  official_global:'مصدر رسمي',workspace_curated:'معرفة داخلية موثقة',
});
export const REGULATORY_FILTER_KINDS:readonly (RegulatorySourceKind|null)[]=Object.freeze([null,'law','regulation','instruction','circular','official_notice','procedure']);
export const REGULATORY_FILTER_SCOPES:readonly (RegulatorySourceScope|null)[]=Object.freeze([null,'official_global','workspace_curated']);

export function formatRegulatoryDate(value:string|null):string{
  if(!value)return'مستمر';
  const [year,month,day]=value.split('-').map(Number);if(!year||!month||!day)return value;
  return new Intl.DateTimeFormat('ar-IQ',{year:'numeric',month:'short',day:'numeric'}).format(new Date(Date.UTC(year,month-1,day)));
}
export function shortHash(value:string):string{return value.length>16?`${value.slice(0,8)}…${value.slice(-8)}`:value}
export function derivedKindLabel(kind:'editorial_interpretation'|'ai_summary'):string{return kind==='ai_summary'?'ملخص مساعد — غير رسمي':'تفسير تحريري — غير رسمي'}
