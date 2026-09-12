import { useEffect,useMemo,useState } from 'react';
import { useDataLayerFactory } from '../../data/react/DataLayerContext.tsx';
import { useFieldOperationsCommandGateway } from '../../features/field-operations/FieldOperationsCommandContext.tsx';
import type { BITrendPoint,BIValue,DerivedKpi,DirectionalForecast,ObservedTrend } from '../../features/intelligence/businessIntelligenceContract.ts';
import { loadBusinessIntelligence,type BusinessIntelligenceSnapshot } from '../../features/intelligence/businessIntelligenceService.ts';
import { formatFinanceMoney } from '../../features/finance/financeModel.ts';
import { useCurrentUserId } from '../../shared/session/CurrentUserIdContext.tsx';
import { IntelligenceViewTabs,useIntelligenceView } from './IntelligenceViewTabs.tsx';
import { ProcessIntelligenceCenter } from './ProcessIntelligenceCenter.tsx';

type Status='loading'|'ready'|'error';
function value(v:BIValue){if(v.unit==='cents')return formatFinanceMoney(v.valueCents);if(v.unit==='basis_points')return `${(v.valueBps/100).toLocaleString('ar-IQ',{maximumFractionDigits:2})}%`;if(v.unit==='minutes')return `${v.valueMinutes.toLocaleString('ar-IQ')} دقيقة`;return v.value.toLocaleString('ar-IQ')}
function sourceLabel(item:DerivedKpi|DirectionalForecast){return [...new Set(item.provenance.map(p=>p.sourceDomain))].join(' · ')}
function sampleLabel(item:DerivedKpi|DirectionalForecast){return item.provenance.reduce((n,p)=>n+p.sampleCount,0).toLocaleString('ar-IQ')}
function pointSourceLabel(point:BITrendPoint){return [...new Set(point.provenance.map(p=>p.sourceDomain))].join(' · ')}
function pointSamples(point:BITrendPoint){return point.provenance.reduce((n,p)=>n+p.sampleCount,0).toLocaleString('ar-IQ')}
function periodLabel(point:BITrendPoint){return new Date(point.periodStart).toLocaleDateString('ar-IQ',{year:'numeric',month:'long',timeZone:'UTC'})}
function KpiRow({item}:{item:DerivedKpi}){return <article className="r2-launcher-row" data-bi-kpi={item.kpiId} data-bi-authoritative="false"><span className="r2-launcher-row__icon" aria-hidden="true">◆</span><span className="r2-launcher-row__copy"><strong>{item.labelAr}</strong><small>{sourceLabel(item)} · {sampleLabel(item)} عينة · مشتق غير مُعدِّل</small></span><strong dir="auto">{value(item.value)}</strong></article>}
function TrendPointRow({trend,point}:{trend:ObservedTrend;point:BITrendPoint}){return <article className="r2-launcher-row" data-bi-trend-point={`${trend.trendId}:${point.periodStart}`} data-bi-authoritative="false"><span className="r2-launcher-row__icon" aria-hidden="true">●</span><span className="r2-launcher-row__copy"><strong>{periodLabel(point)}</strong><small>{pointSourceLabel(point)} · {pointSamples(point)} عينة · مرصود من التاريخ الفعلي</small></span><strong dir="auto">{value(point.value)}</strong></article>}
function ForecastRow({item}:{item:DirectionalForecast}){const confidence=item.confidence==='directional'?'اتجاهي':'عينات غير كافية';return <article className="r2-search-result" data-bi-forecast={item.forecastId} data-bi-forecast-confidence={item.confidence} data-bi-authoritative="false"><span className="r2-search-result__icon" aria-hidden="true">↗</span><span><strong>{item.labelAr}</strong><small>{confidence} · {item.method} · {item.sampleCount.toLocaleString('ar-IQ')} عينة · {item.horizonDays.toLocaleString('ar-IQ')} يوم</small><small>{item.assumptions[0]}</small></span><strong dir="auto">{item.projectedValue?value(item.projectedValue):'—'}</strong></article>}
function Hero(){return <div className="r2-section-heading r2-section-heading--hero"><div><p className="r2-eyebrow">M13 · Business Intelligence · Phase 9.5</p><h1>مركز ذكاء الأعمال</h1><p>مؤشرات واتجاهات مرصودة وتنبؤات اتجاهية مشتقة من حقائق إنجاز المعتمدة، مع توثيق المصدر والعينات. التاريخ المرصود منفصل عن التنبؤ، وهذه الشاشة لا تكتب في مصادر البيانات ولا تعرض المستقبل كحقيقة.</p></div></div>}
function Empty({title,body}:{title:string;body:string}){return <section className="r2-destination-placeholder"><p className="r2-eyebrow">M13 · BI</p><h2>{title}</h2><p>{body}</p></section>}

export function BusinessIntelligencePanel({snapshot}:{readonly snapshot:BusinessIntelligenceSnapshot}){
 const groups=useMemo(()=>({operations:snapshot.kpis.filter(x=>x.domain==='operations'),finance:snapshot.kpis.filter(x=>x.domain==='finance'),capacity:snapshot.kpis.filter(x=>x.domain==='capacity')}),[snapshot]);
 return <section className="r2-screen" dir="rtl" data-phase9-5-runtime="business-intelligence" data-bi-authority="read-only-derived" data-bi-provenance="required"><IntelligenceViewTabs/><Hero/>
  <div className="r2-launcher-groups" data-bi-kpi-groups="true">
   <section className="r2-launcher-group"><h2>التشغيل</h2><div className="r2-launcher-list">{groups.operations.map(x=><KpiRow key={x.kpiId} item={x}/>)}</div></section>
   <section className="r2-launcher-group"><h2>المالية</h2><div className="r2-launcher-list">{groups.finance.map(x=><KpiRow key={x.kpiId} item={x}/>)}</div></section>
   <section className="r2-launcher-group"><h2>السعة الميدانية</h2><div className="r2-launcher-list">{groups.capacity.map(x=><KpiRow key={x.kpiId} item={x}/>)}</div></section>
  </div>
  <section className="r2-search-live-group" data-bi-trend-group="true"><div className="r2-search-live-group__title"><strong>الاتجاهات المرصودة</strong><span>{snapshot.trends.length.toLocaleString('ar-IQ')}</span></div><div className="r2-launcher-groups">{snapshot.trends.map(item=><section className="r2-launcher-group" key={item.trendId} data-bi-trend={item.trendId} data-bi-authoritative="false"><h2>{item.labelAr}</h2><div className="r2-launcher-list">{item.points.map(point=><TrendPointRow key={point.periodStart} trend={item} point={point}/>)}</div></section>)}</div></section>
  <section className="r2-search-live-group" data-bi-forecast-group="true"><div className="r2-search-live-group__title"><strong>التوقعات الاتجاهية</strong><span>{snapshot.forecasts.length.toLocaleString('ar-IQ')}</span></div>{snapshot.forecasts.map(x=><ForecastRow key={x.forecastId} item={x}/>)}</section>
  <section className="r2-search-live-group" data-bi-provenance-summary="true"><div className="r2-search-live-group__title"><strong>سلامة المصدر</strong><span>موثّق</span></div><div className="r2-search-result"><span className="r2-search-result__icon" aria-hidden="true">✓</span><span><strong>نفس مساحة العمل فقط</strong><small>{snapshot.workspaceId} · توليد {new Date(snapshot.generatedAt).toLocaleString('ar-IQ')}</small><small>{snapshot.sourceCounts.transactions.toLocaleString('ar-IQ')} معاملة · {snapshot.sourceCounts.fieldAssignments.toLocaleString('ar-IQ')} تكليف ميداني · {snapshot.sourceCounts.financeSignals.toLocaleString('ar-IQ')} إشارة مالية</small></span></div></section>
 </section>
}

function BusinessIntelligenceRuntime(){
 const userId=useCurrentUserId(),dataFactory=useDataLayerFactory(),fieldOperations=useFieldOperationsCommandGateway(),[status,setStatus]=useState<Status>('loading'),[snapshot,setSnapshot]=useState<BusinessIntelligenceSnapshot|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{let live=true;setStatus('loading');setError('');void (async()=>{try{if(!userId)throw new Error('لا توجد جلسة مستخدم صالحة.');const x=await loadBusinessIntelligence({dataFactory,fieldOperations},userId);if(live){setSnapshot(x);setStatus('ready')}}catch(cause){if(live){setSnapshot(null);setError(cause instanceof Error?cause.message:'تعذر تحميل ذكاء الأعمال.');setStatus('error')}}})();return()=>{live=false}},[dataFactory,fieldOperations,reload,userId]);
 if(status==='ready'&&snapshot)return <BusinessIntelligencePanel snapshot={snapshot}/>;
 return <section className="r2-screen" dir="rtl" data-phase9-5-runtime="business-intelligence" data-bi-authority="read-only-derived" data-bi-provenance="required"><IntelligenceViewTabs/><Hero/>{status==='loading'?<Empty title="جارٍ بناء الصورة التحليلية…" body="يتم جمع المصادر المعتمدة لمساحة العمل والتحقق من نسبها قبل عرض أي رقم."/>:<section className="r2-destination-placeholder" role="alert"><p className="r2-eyebrow">Fail closed</p><h2>تعذر بناء الصورة التحليلية</h2><p>{error}</p><div className="r2-placeholder-actions"><button type="button" className="r2-action r2-action--primary" onClick={()=>setReload(x=>x+1)}>إعادة المحاولة</button></div></section>}</section>
}

export function BusinessIntelligenceCenter(){
 const view=useIntelligenceView();
 return view==='process'?<ProcessIntelligenceCenter/>:<BusinessIntelligenceRuntime/>;
}
