import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { BusinessIntelligenceSnapshot } from '../features/intelligence/businessIntelligenceService.ts';
import { ENJAZ_BI_SCHEMA,type BIProvenance,type DerivedKpi,type DirectionalForecast } from '../features/intelligence/businessIntelligenceContract.ts';
import { BusinessIntelligencePanel } from './intelligence/BusinessIntelligenceCenter.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111',AS_OF='2026-09-12T07:00:00.000Z';
const p=(sourceDomain:BIProvenance['sourceDomain'],sampleCount:number,basis:readonly string[]):BIProvenance=>Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId:W,sourceDomain,sourceAsOf:AS_OF,sampleCount,basis:Object.freeze([...basis]),derivationVersion:'phase9.5-browser-v1'});
const tx=p('transactions',42,['status','completed_at','archived_at','deleted_at']),field=p('field-operations',9,['assignment.status','visit.status']),finance=p('finance',8,['phase7.3','posted_payments','payment_reversals','paid_at']);

const kpis:readonly DerivedKpi[]=Object.freeze([
 {schema:ENJAZ_BI_SCHEMA,kpiId:'operations.active_transactions',domain:'operations',labelAr:'المعاملات الفعالة',value:{unit:'count',value:18},asOf:AS_OF,authoritative:false,provenance:[tx]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'operations.stalled_transactions',domain:'operations',labelAr:'المعاملات المتوقفة',value:{unit:'count',value:3},asOf:AS_OF,authoritative:false,provenance:[tx]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'operations.completed_last_30d',domain:'operations',labelAr:'المنجز خلال 30 يوماً',value:{unit:'count',value:11},asOf:AS_OF,authoritative:false,provenance:[tx]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'finance.total_outstanding',domain:'finance',labelAr:'إجمالي الرصيد المفتوح',value:{unit:'cents',valueCents:98765432n},asOf:AS_OF,authoritative:false,provenance:[finance]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'finance.collected_last_30d',domain:'finance',labelAr:'التحصيل خلال 30 يوماً',value:{unit:'cents',valueCents:45678900n},asOf:AS_OF,authoritative:false,provenance:[finance]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'finance.collection_change',domain:'finance',labelAr:'تغير التحصيل مقابل الثلاثين يوماً السابقة',value:{unit:'basis_points',valueBps:1250},asOf:AS_OF,authoritative:false,provenance:[finance]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'capacity.active_assignments',domain:'capacity',labelAr:'التكليفات الميدانية الفعالة',value:{unit:'count',value:7},asOf:AS_OF,authoritative:false,provenance:[field]},
 {schema:ENJAZ_BI_SCHEMA,kpiId:'capacity.active_visits',domain:'capacity',labelAr:'الزيارات الميدانية الجارية',value:{unit:'count',value:2},asOf:AS_OF,authoritative:false,provenance:[field]},
]);

const forecasts:readonly DirectionalForecast[]=Object.freeze([
 {schema:ENJAZ_BI_SCHEMA,forecastId:'operations.completed_next_30d',domain:'operations',labelAr:'اتجاه الإنجاز للثلاثين يوماً القادمة',authoritative:false,method:'trailing_run_rate',observedWindowStart:'2026-08-13T07:00:00.000Z',observedWindowEnd:AS_OF,horizonDays:30,sampleCount:11,confidence:'directional',projectedValue:{unit:'count',value:11},assumptions:['إسقاط اتجاهي فقط يفترض استمرار عدد المعاملات المنجزة المرصود خلال الثلاثين يوماً السابقة دون تغيير.'],provenance:[tx]},
 {schema:ENJAZ_BI_SCHEMA,forecastId:'finance.collections_next_30d',domain:'finance',labelAr:'اتجاه التحصيل للثلاثين يوماً القادمة',authoritative:false,method:'trailing_run_rate',observedWindowStart:'2026-08-13T07:00:00.000Z',observedWindowEnd:AS_OF,horizonDays:30,sampleCount:3,confidence:'insufficient',projectedValue:null,assumptions:['العينات غير كافية؛ لا يتم عرض قيمة متوقعة حتى تتحقق عتبة الثقة الاتجاهية.'],provenance:[finance]},
]);

const snapshot:BusinessIntelligenceSnapshot=Object.freeze({
 schema:ENJAZ_BI_SCHEMA,workspaceId:W,generatedAt:AS_OF,authority:'read_only_derived_intelligence',kpis,forecasts,
 sourceCounts:Object.freeze({transactions:42,activeTransactions:18,completedLast30:11,fieldAssignments:7,fieldVisits:2,financeSignals:2}),
});

declare global{interface Window{__ENJAZ_PHASE95_BROWSER__?:Readonly<{workspaceId:string;kpiCount:number;forecastCount:number}>}}
window.__ENJAZ_PHASE95_BROWSER__=Object.freeze({workspaceId:W,kpiCount:snapshot.kpis.length,forecastCount:snapshot.forecasts.length});
const root=document.getElementById('phase95-browser-root');if(!root)throw new Error('Phase 9.5 browser root missing');
createRoot(root).render(<StrictMode><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="insights"><main id="r2-main" className="r2-shell__main" aria-label="مركز ذكاء الأعمال"><BusinessIntelligencePanel snapshot={snapshot}/></main></div></StrictMode>);
