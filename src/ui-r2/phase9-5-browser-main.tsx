import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { BusinessIntelligenceSnapshot } from '../features/intelligence/businessIntelligenceService.ts';
import { ENJAZ_BI_SCHEMA,type BIProvenance,type DerivedKpi,type DirectionalForecast,type ObservedTrend } from '../features/intelligence/businessIntelligenceContract.ts';
import { BusinessIntelligencePanel } from './intelligence/BusinessIntelligenceCenter.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111',AS_OF='2026-09-12T07:00:00.000Z';
const p=(sourceDomain:BIProvenance['sourceDomain'],sampleCount:number,basis:readonly string[],sourceAsOf=AS_OF):BIProvenance=>Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId:W,sourceDomain,sourceAsOf,sampleCount,basis:Object.freeze([...basis]),derivationVersion:'phase9.5-browser-v1'});
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

const months=Object.freeze([
 ['2026-04-01T00:00:00.000Z','2026-05-01T00:00:00.000Z',4,1200000n],
 ['2026-05-01T00:00:00.000Z','2026-06-01T00:00:00.000Z',6,1900000n],
 ['2026-06-01T00:00:00.000Z','2026-07-01T00:00:00.000Z',7,2500000n],
 ['2026-07-01T00:00:00.000Z','2026-08-01T00:00:00.000Z',8,3000000n],
 ['2026-08-01T00:00:00.000Z','2026-09-01T00:00:00.000Z',10,4100000n],
 ['2026-09-01T00:00:00.000Z',AS_OF,11,4567890n],
] as const);
const trends:readonly ObservedTrend[]=Object.freeze([
 {schema:ENJAZ_BI_SCHEMA,trendId:'operations.completed_monthly',domain:'operations',labelAr:'المنجز حسب الشهر',authoritative:false,points:Object.freeze(months.map(([periodStart,periodEnd,count])=>({periodStart,periodEnd,value:{unit:'count' as const,value:count},provenance:[p('transactions',count,['status=completed','completed_at','calendar_month'],periodEnd)]})))},
 {schema:ENJAZ_BI_SCHEMA,trendId:'finance.collections_monthly',domain:'finance',labelAr:'التحصيل حسب الشهر',authoritative:false,points:Object.freeze(months.map(([periodStart,periodEnd,count,cents])=>({periodStart,periodEnd,value:{unit:'cents' as const,valueCents:cents},provenance:[p('finance',Math.max(1,Math.ceil(count/2)),['phase7.3','posted_payments','payment_reversals','paid_at','calendar_month'],periodEnd)]})))},
]);

const forecasts:readonly DirectionalForecast[]=Object.freeze([
 {schema:ENJAZ_BI_SCHEMA,forecastId:'operations.completed_next_30d',domain:'operations',labelAr:'اتجاه الإنجاز للثلاثين يوماً القادمة',authoritative:false,method:'trailing_run_rate',observedWindowStart:'2026-08-13T07:00:00.000Z',observedWindowEnd:AS_OF,horizonDays:30,sampleCount:11,confidence:'directional',projectedValue:{unit:'count',value:11},assumptions:['إسقاط اتجاهي فقط يفترض استمرار عدد المعاملات المنجزة المرصود خلال الثلاثين يوماً السابقة دون تغيير.'],provenance:[tx]},
 {schema:ENJAZ_BI_SCHEMA,forecastId:'finance.collections_next_30d',domain:'finance',labelAr:'اتجاه التحصيل للثلاثين يوماً القادمة',authoritative:false,method:'trailing_run_rate',observedWindowStart:'2026-08-13T07:00:00.000Z',observedWindowEnd:AS_OF,horizonDays:30,sampleCount:3,confidence:'insufficient',projectedValue:null,assumptions:['العينات غير كافية؛ لا يتم عرض قيمة متوقعة حتى تتحقق عتبة الثقة الاتجاهية.'],provenance:[finance]},
]);

const snapshot:BusinessIntelligenceSnapshot=Object.freeze({
 schema:ENJAZ_BI_SCHEMA,workspaceId:W,generatedAt:AS_OF,authority:'read_only_derived_intelligence',kpis,trends,forecasts,
 sourceCounts:Object.freeze({transactions:42,activeTransactions:18,completedLast30:11,fieldAssignments:7,fieldVisits:2,financeSignals:2}),
});

declare global{interface Window{__ENJAZ_PHASE95_BROWSER__?:Readonly<{workspaceId:string;kpiCount:number;trendCount:number;trendPointCount:number;forecastCount:number}>}}
window.__ENJAZ_PHASE95_BROWSER__=Object.freeze({workspaceId:W,kpiCount:snapshot.kpis.length,trendCount:snapshot.trends.length,trendPointCount:snapshot.trends.reduce((n,x)=>n+x.points.length,0),forecastCount:snapshot.forecasts.length});
const root=document.getElementById('phase95-browser-root');if(!root)throw new Error('Phase 9.5 browser root missing');
createRoot(root).render(<StrictMode><div className="ez-r2-root r2-shell" data-r2-runtime-mode="live" data-destination="insights"><main id="r2-main" className="r2-shell__main" aria-label="مركز ذكاء الأعمال"><BusinessIntelligencePanel snapshot={snapshot}/></main></div></StrictMode>);
