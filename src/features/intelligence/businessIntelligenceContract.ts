export const ENJAZ_BI_SCHEMA='enjaz-bi-forecast-v1' as const;
export const BI_MIN_DIRECTIONAL_SAMPLES=4;
export const BI_MAX_FORECAST_HORIZON_DAYS=365;

export type BISourceDomain='transactions'|'transaction-blockers'|'finance'|'field-operations'|'workflow';
export type BIDomain='operations'|'finance'|'capacity';
export type BIForecastConfidence='insufficient'|'directional';
export type BIForecastMethod='trailing_run_rate';

export type BIValue=
 | Readonly<{unit:'count';value:number}>
 | Readonly<{unit:'cents';valueCents:bigint}>
 | Readonly<{unit:'basis_points';valueBps:number}>
 | Readonly<{unit:'minutes';valueMinutes:number}>;

export interface BIProvenance{
 readonly schema:typeof ENJAZ_BI_SCHEMA;
 readonly workspaceId:string;
 readonly sourceDomain:BISourceDomain;
 readonly sourceAsOf:string;
 readonly sampleCount:number;
 readonly basis:readonly string[];
 readonly derivationVersion:string;
}
export interface DerivedKpi{
 readonly schema:typeof ENJAZ_BI_SCHEMA;
 readonly kpiId:string;
 readonly domain:BIDomain;
 readonly labelAr:string;
 readonly value:BIValue;
 readonly asOf:string;
 readonly authoritative:false;
 readonly provenance:readonly BIProvenance[];
}
export interface BITrendPoint{
 readonly periodStart:string;
 readonly periodEnd:string;
 readonly value:BIValue;
 readonly provenance:readonly BIProvenance[];
}
export interface ObservedTrend{
 readonly schema:typeof ENJAZ_BI_SCHEMA;
 readonly trendId:string;
 readonly domain:BIDomain;
 readonly labelAr:string;
 readonly authoritative:false;
 readonly points:readonly BITrendPoint[];
}
export interface DirectionalForecast{
 readonly schema:typeof ENJAZ_BI_SCHEMA;
 readonly forecastId:string;
 readonly domain:BIDomain;
 readonly labelAr:string;
 readonly authoritative:false;
 readonly method:BIForecastMethod;
 readonly observedWindowStart:string;
 readonly observedWindowEnd:string;
 readonly horizonDays:number;
 readonly sampleCount:number;
 readonly confidence:BIForecastConfidence;
 readonly projectedValue:BIValue|null;
 readonly assumptions:readonly string[];
 readonly provenance:readonly BIProvenance[];
}

export class BIContractError extends Error{constructor(message:string){super(message);this.name='BIContractError'}}
export class BIWorkspaceLineageError extends BIContractError{constructor(){super('BI provenance mixes workspaces');this.name='BIWorkspaceLineageError'}}
export class BIProvenanceRequiredError extends BIContractError{constructor(){super('BI provenance is required');this.name='BIProvenanceRequiredError'}}
export class BITimeWindowError extends BIContractError{constructor(){super('BI time window is invalid');this.name='BITimeWindowError'}}
export class BIUnsafeIntegerError extends BIContractError{constructor(){super('BI integer is outside safe contract');this.name='BIUnsafeIntegerError'}}
export class BIUnsupportedRunRateUnitError extends BIContractError{readonly unit:BIValue['unit'];constructor(unit:BIValue['unit']){super(`BI trailing run-rate requires an additive flow unit; unsupported: ${unit}`);this.name='BIUnsupportedRunRateUnitError';this.unit=unit}}

const DOMAINS=new Set<BISourceDomain>(['transactions','transaction-blockers','finance','field-operations','workflow']);
const clean=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const natural=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
const positive=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?v:null;
const iso=(v:unknown)=>{if(typeof v!=='string'||!v.endsWith('Z'))return null;const n=Date.parse(v);return Number.isFinite(n)?new Date(n).toISOString():null};
const basis=(v:unknown)=>Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'&&x.trim().length>0)?Object.freeze(v.map(x=>(x as string).trim())):null;

export function parseBIProvenance(input:unknown):BIProvenance|null{
 if(!input||typeof input!=='object')return null;const x=input as Record<string,unknown>;
 const workspaceId=clean(x.workspaceId),sourceAsOf=iso(x.sourceAsOf),sampleCount=natural(x.sampleCount),derivationVersion=clean(x.derivationVersion),fields=basis(x.basis),sourceDomain=typeof x.sourceDomain==='string'&&DOMAINS.has(x.sourceDomain as BISourceDomain)?x.sourceDomain as BISourceDomain:null;
 if(x.schema!==ENJAZ_BI_SCHEMA||!workspaceId||!sourceAsOf||sampleCount===null||!derivationVersion||!fields||!sourceDomain)return null;
 return Object.freeze({schema:ENJAZ_BI_SCHEMA,workspaceId,sourceDomain,sourceAsOf,sampleCount,basis:fields,derivationVersion});
}

export function assertBIProvenance(provenance:readonly BIProvenance[]):string{
 if(!provenance.length)throw new BIProvenanceRequiredError();const workspaceId=provenance[0]!.workspaceId;
 for(const item of provenance)if(item.workspaceId!==workspaceId)throw new BIWorkspaceLineageError();
 return workspaceId;
}

export function assertObservedNotAfterAsOf(provenance:readonly BIProvenance[],asOf:string):void{
 const limit=Date.parse(asOf);if(!Number.isFinite(limit))throw new BITimeWindowError();
 assertBIProvenance(provenance);for(const item of provenance)if(Date.parse(item.sourceAsOf)>limit)throw new BITimeWindowError();
}

function validValue(value:BIValue):boolean{
 if(value.unit==='cents')return typeof value.valueCents==='bigint';
 const v=value.unit==='count'?value.value:value.unit==='basis_points'?value.valueBps:value.valueMinutes;
 return Number.isSafeInteger(v);
}
function freezeValue(value:BIValue):BIValue{if(!validValue(value))throw new BIUnsafeIntegerError();return Object.freeze(value)}
function label(v:string){const x=clean(v);if(!x)throw new BIContractError('BI Arabic label/id is required');return x}

export function buildDerivedKpi(input:Readonly<{kpiId:string;domain:BIDomain;labelAr:string;value:BIValue;asOf:string;provenance:readonly BIProvenance[]}>):DerivedKpi{
 const asOf=iso(input.asOf);if(!asOf)throw new BITimeWindowError();assertObservedNotAfterAsOf(input.provenance,asOf);
 return Object.freeze({schema:ENJAZ_BI_SCHEMA,kpiId:label(input.kpiId),domain:input.domain,labelAr:label(input.labelAr),value:freezeValue(input.value),asOf,authoritative:false as const,provenance:Object.freeze([...input.provenance])});
}

export function buildObservedTrend(input:Readonly<{trendId:string;domain:BIDomain;labelAr:string;points:readonly BITrendPoint[]}>):ObservedTrend{
 if(!input.points.length)throw new BIContractError('Observed trend requires points');let workspace:string|null=null,lastEnd=-Infinity;
 const points=input.points.map(point=>{const start=iso(point.periodStart),end=iso(point.periodEnd);if(!start||!end)throw new BITimeWindowError();const s=Date.parse(start),e=Date.parse(end);if(s>=e||s<lastEnd)throw new BITimeWindowError();lastEnd=e;const w=assertBIProvenance(point.provenance);if(workspace&&workspace!==w)throw new BIWorkspaceLineageError();workspace=w;assertObservedNotAfterAsOf(point.provenance,end);return Object.freeze({periodStart:start,periodEnd:end,value:freezeValue(point.value),provenance:Object.freeze([...point.provenance])})});
 return Object.freeze({schema:ENJAZ_BI_SCHEMA,trendId:label(input.trendId),domain:input.domain,labelAr:label(input.labelAr),authoritative:false as const,points:Object.freeze(points)});
}

function scaleSafeInteger(value:number,numerator:number,denominator:number):number{
 if(!Number.isSafeInteger(value)||!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||denominator<=0)throw new BIUnsafeIntegerError();
 const result=(BigInt(value)*BigInt(numerator))/BigInt(denominator);if(result>BigInt(Number.MAX_SAFE_INTEGER)||result<BigInt(Number.MIN_SAFE_INTEGER))throw new BIUnsafeIntegerError();return Number(result);
}
export function projectRunRateValue(value:BIValue,observedDays:number,horizonDays:number):BIValue{
 const o=positive(observedDays),h=positive(horizonDays);if(!o||!h||h>BI_MAX_FORECAST_HORIZON_DAYS)throw new BITimeWindowError();
 if(value.unit==='cents')return Object.freeze({unit:'cents' as const,valueCents:(value.valueCents*BigInt(h))/BigInt(o)});
 if(value.unit==='count')return Object.freeze({unit:'count' as const,value:scaleSafeInteger(value.value,h,o)});
 throw new BIUnsupportedRunRateUnitError(value.unit);
}

export function buildTrailingRunRateForecast(input:Readonly<{forecastId:string;domain:BIDomain;labelAr:string;observedValue:BIValue;observedWindowStart:string;observedWindowEnd:string;horizonDays:number;sampleCount:number;assumptions:readonly string[];provenance:readonly BIProvenance[]}>):DirectionalForecast{
 const start=iso(input.observedWindowStart),end=iso(input.observedWindowEnd),h=positive(input.horizonDays),samples=natural(input.sampleCount);if(!start||!end||Date.parse(start)>=Date.parse(end)||!h||h>BI_MAX_FORECAST_HORIZON_DAYS||samples===null)throw new BITimeWindowError();
 assertObservedNotAfterAsOf(input.provenance,end);const observedDays=Math.max(1,Math.ceil((Date.parse(end)-Date.parse(start))/86_400_000));const confidence:BIForecastConfidence=samples>=BI_MIN_DIRECTIONAL_SAMPLES?'directional':'insufficient';const projectedValue=confidence==='directional'?projectRunRateValue(freezeValue(input.observedValue),observedDays,h):null;
 const assumptions=input.assumptions.map(label);if(!assumptions.length)throw new BIContractError('Forecast disclosure is required');
 return Object.freeze({schema:ENJAZ_BI_SCHEMA,forecastId:label(input.forecastId),domain:input.domain,labelAr:label(input.labelAr),authoritative:false as const,method:'trailing_run_rate' as const,observedWindowStart:start,observedWindowEnd:end,horizonDays:h,sampleCount:samples,confidence,projectedValue,assumptions:Object.freeze(assumptions),provenance:Object.freeze([...input.provenance])});
}

export function exactChangeBps(current:bigint,previous:bigint):number|null{
 if(previous===0n)return null;const raw=((current-previous)*10_000n)/(previous<0n?-previous:previous);if(raw>BigInt(Number.MAX_SAFE_INTEGER)||raw<BigInt(Number.MIN_SAFE_INTEGER))throw new BIUnsafeIntegerError();return Number(raw);
}
