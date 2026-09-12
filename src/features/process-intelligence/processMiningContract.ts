export const ENJAZ_PROCESS_MINING_SCHEMA='enjaz-process-mining-v1' as const;
export const PROCESS_MIN_DIRECTIONAL_CASES=4;

export type ProcessSourceDomain='workflow'|'transaction-lifecycle'|'field-operations';
export type ProcessOrderingConfidence='strict'|'partial';
export type ProcessPredictionConfidence='insufficient'|'directional';
export type ProcessPredictionMethod='empirical_next_activity_frequency'|'empirical_wait_threshold_frequency';
export type ProcessPredictionTarget='next_activity'|'delay_threshold_exceedance';

export interface ProcessEventProvenance{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly caseId:string;
 readonly sourceDomain:ProcessSourceDomain;
 readonly sourceEntity:string;
 readonly sourceEventId:string;
 readonly sourceAsOf:string;
 readonly basis:readonly string[];
 readonly derivationVersion:string;
}

export interface ProcessEvent{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly caseId:string;
 readonly activityKey:string;
 readonly labelAr:string;
 readonly occurredAt:string;
 readonly authoritative:false;
 readonly provenance:ProcessEventProvenance;
}

export interface ProcessPath{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly caseId:string;
 readonly authoritative:false;
 readonly ordering:ProcessOrderingConfidence;
 readonly events:readonly ProcessEvent[];
 readonly reworkCount:number;
 readonly repeatedActivities:readonly string[];
 readonly observedDurationMs:number|null;
}

export interface ObservedProcessWait{
 readonly fromActivityKey:string;
 readonly toActivityKey:string;
 readonly startAt:string;
 readonly endAt:string;
 readonly durationMs:number;
 readonly strictOrderProven:boolean;
}

export interface BottleneckCandidate extends ObservedProcessWait{
 readonly thresholdMs:number;
 readonly evidence:'governed_duration_threshold';
}

export interface ProcessPredictionCandidate{
 readonly activityKey:string;
 readonly count:number;
}

export interface DirectionalProcessPrediction{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly target:'next_activity';
 readonly method:'empirical_next_activity_frequency';
 readonly currentActivityKey:string;
 readonly asOf:string;
 readonly sampleCount:number;
 readonly confidence:ProcessPredictionConfidence;
 readonly predictedActivityKey:string|null;
 readonly probabilityBps:number|null;
 readonly candidateCounts:readonly ProcessPredictionCandidate[];
 readonly assumptions:readonly string[];
 readonly authoritative:false;
 readonly provenance:readonly ProcessEventProvenance[];
}

export interface DirectionalDelayPrediction{
 readonly schema:typeof ENJAZ_PROCESS_MINING_SCHEMA;
 readonly workspaceId:string;
 readonly target:'delay_threshold_exceedance';
 readonly method:'empirical_wait_threshold_frequency';
 readonly currentActivityKey:string;
 readonly thresholdMs:number;
 readonly asOf:string;
 readonly sampleCount:number;
 readonly delayedSampleCount:number;
 readonly confidence:ProcessPredictionConfidence;
 readonly probabilityBps:number|null;
 readonly assumptions:readonly string[];
 readonly authoritative:false;
 readonly provenance:readonly ProcessEventProvenance[];
}

export class ProcessMiningContractError extends Error{constructor(message:string){super(message);this.name='ProcessMiningContractError'}}
export class ProcessWorkspaceLineageError extends ProcessMiningContractError{constructor(){super('Process intelligence cannot mix workspaces');this.name='ProcessWorkspaceLineageError'}}
export class ProcessCaseLineageError extends ProcessMiningContractError{constructor(){super('Process path cannot mix case identities');this.name='ProcessCaseLineageError'}}
export class ProcessProvenanceRequiredError extends ProcessMiningContractError{constructor(){super('Process intelligence provenance/evidence is required');this.name='ProcessProvenanceRequiredError'}}
export class ProcessTimeError extends ProcessMiningContractError{constructor(){super('Process event time or ordering is invalid');this.name='ProcessTimeError'}}
export class ProcessDuplicateSourceEventError extends ProcessMiningContractError{constructor(){super('Duplicate authoritative source event identity');this.name='ProcessDuplicateSourceEventError'}}
export class ProcessUnsafeIntegerError extends ProcessMiningContractError{constructor(){super('Process integer is outside safe contract');this.name='ProcessUnsafeIntegerError'}}

const DOMAINS=new Set<ProcessSourceDomain>(['workflow','transaction-lifecycle','field-operations']);
const clean=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const natural=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
const positive=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?v:null;
const iso=(v:unknown)=>{if(typeof v!=='string'||!v.endsWith('Z'))return null;const n=Date.parse(v);return Number.isFinite(n)?new Date(n).toISOString():null};
const basis=(v:unknown)=>Array.isArray(v)&&v.length>0&&v.every(x=>typeof x==='string'&&x.trim().length>0)?Object.freeze(v.map(x=>(x as string).trim())):null;
const required=(v:string,message:string)=>{const x=clean(v);if(!x)throw new ProcessMiningContractError(message);return x};

export function parseProcessEventProvenance(input:unknown):ProcessEventProvenance|null{
 if(!input||typeof input!=='object')return null;const x=input as Record<string,unknown>;
 const workspaceId=clean(x.workspaceId),caseId=clean(x.caseId),sourceEntity=clean(x.sourceEntity),sourceEventId=clean(x.sourceEventId),sourceAsOf=iso(x.sourceAsOf),derivationVersion=clean(x.derivationVersion),fields=basis(x.basis),sourceDomain=typeof x.sourceDomain==='string'&&DOMAINS.has(x.sourceDomain as ProcessSourceDomain)?x.sourceDomain as ProcessSourceDomain:null;
 if(x.schema!==ENJAZ_PROCESS_MINING_SCHEMA||!workspaceId||!caseId||!sourceEntity||!sourceEventId||!sourceAsOf||!derivationVersion||!fields||!sourceDomain)return null;
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,caseId,sourceDomain,sourceEntity,sourceEventId,sourceAsOf,sampleCount:undefined,basis:fields,derivationVersion}) as ProcessEventProvenance;
}

export function buildProcessEvent(input:Readonly<{workspaceId:string;caseId:string;activityKey:string;labelAr:string;occurredAt:string;provenance:ProcessEventProvenance}>):ProcessEvent{
 const workspaceId=required(input.workspaceId,'Process workspace is required'),caseId=required(input.caseId,'Process case is required'),activityKey=required(input.activityKey,'Process activity key is required'),labelAr=required(input.labelAr,'Process Arabic label is required'),occurredAt=iso(input.occurredAt);
 if(!occurredAt)throw new ProcessTimeError();
 const provenance=parseProcessEventProvenance(input.provenance);if(!provenance)throw new ProcessProvenanceRequiredError();
 if(provenance.workspaceId!==workspaceId)throw new ProcessWorkspaceLineageError();
 if(provenance.caseId!==caseId)throw new ProcessCaseLineageError();
 if(Date.parse(occurredAt)>Date.parse(provenance.sourceAsOf))throw new ProcessTimeError();
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,caseId,activityKey,labelAr,occurredAt,authoritative:false as const,provenance});
}

export function buildProcessPath(events:readonly ProcessEvent[]):ProcessPath{
 if(!events.length)throw new ProcessProvenanceRequiredError();
 const workspaceId=events[0]!.workspaceId,caseId=events[0]!.caseId,identities=new Set<string>(),counts=new Map<string,number>();
 let ordering:ProcessOrderingConfidence='strict',previous=-Infinity;
 for(const event of events){
  if(event.workspaceId!==workspaceId||event.provenance.workspaceId!==workspaceId)throw new ProcessWorkspaceLineageError();
  if(event.caseId!==caseId||event.provenance.caseId!==caseId)throw new ProcessCaseLineageError();
  const when=Date.parse(event.occurredAt);if(!Number.isFinite(when)||when<previous)throw new ProcessTimeError();if(when===previous)ordering='partial';previous=when;
  const identity=`${event.provenance.sourceDomain}:${event.provenance.sourceEntity}:${event.provenance.sourceEventId}`;if(identities.has(identity))throw new ProcessDuplicateSourceEventError();identities.add(identity);
  counts.set(event.activityKey,(counts.get(event.activityKey)??0)+1);
 }
 const repeatedActivities=Object.freeze([...counts.entries()].filter(([,count])=>count>1).map(([key])=>key).sort());
 const reworkCount=[...counts.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
 const observedDurationMs=events.length<2?null:Date.parse(events.at(-1)!.occurredAt)-Date.parse(events[0]!.occurredAt);
 if(observedDurationMs!==null&&!Number.isSafeInteger(observedDurationMs))throw new ProcessUnsafeIntegerError();
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,caseId,authoritative:false as const,ordering,events:Object.freeze([...events]),reworkCount,repeatedActivities,observedDurationMs});
}

export function buildObservedProcessWaits(path:ProcessPath):readonly ObservedProcessWait[]{
 const waits:ObservedProcessWait[]=[];
 for(let i=1;i<path.events.length;i+=1){const from=path.events[i-1]!,to=path.events[i]!,durationMs=Date.parse(to.occurredAt)-Date.parse(from.occurredAt);if(!Number.isSafeInteger(durationMs)||durationMs<0)throw new ProcessTimeError();waits.push(Object.freeze({fromActivityKey:from.activityKey,toActivityKey:to.activityKey,startAt:from.occurredAt,endAt:to.occurredAt,durationMs,strictOrderProven:durationMs>0}))}
 return Object.freeze(waits);
}

export function classifyBottleneckCandidates(path:ProcessPath,thresholdMs:number):readonly BottleneckCandidate[]{
 const threshold=positive(thresholdMs);if(!threshold)throw new ProcessUnsafeIntegerError();
 return Object.freeze(buildObservedProcessWaits(path).filter(wait=>wait.strictOrderProven&&wait.durationMs>=threshold).map(wait=>Object.freeze({...wait,thresholdMs:threshold,evidence:'governed_duration_threshold' as const})));
}

function assertPredictionPath(path:ProcessPath,workspaceId:string,asOf:string):void{
 if(path.workspaceId!==workspaceId)throw new ProcessWorkspaceLineageError();
 const limit=Date.parse(asOf);
 for(const event of path.events)if(Date.parse(event.occurredAt)>limit||Date.parse(event.provenance.sourceAsOf)>limit)throw new ProcessTimeError();
}

export function buildEmpiricalNextActivityPrediction(input:Readonly<{workspaceId:string;currentActivityKey:string;historicalPaths:readonly ProcessPath[];asOf:string;assumptions:readonly string[]}>):DirectionalProcessPrediction{
 const workspaceId=required(input.workspaceId,'Prediction workspace is required'),currentActivityKey=required(input.currentActivityKey,'Current activity is required'),asOf=iso(input.asOf);if(!asOf)throw new ProcessTimeError();
 const assumptions=input.assumptions.map(value=>required(value,'Prediction disclosure is required'));if(!assumptions.length)throw new ProcessMiningContractError('Prediction disclosure is required');
 const candidates=new Map<string,number>(),provenance:ProcessEventProvenance[]=[];let sampleCount=0;
 for(const path of input.historicalPaths){
  assertPredictionPath(path,workspaceId,asOf);
  let index=-1;for(let i=path.events.length-2;i>=0;i-=1){if(path.events[i]!.activityKey===currentActivityKey){index=i;break}}
  if(index<0)continue;const current=path.events[index]!,next=path.events[index+1]!;sampleCount+=1;candidates.set(next.activityKey,(candidates.get(next.activityKey)??0)+1);provenance.push(current.provenance,next.provenance);
 }
 if(sampleCount===0||provenance.length===0)throw new ProcessProvenanceRequiredError();
 const candidateCounts=Object.freeze([...candidates.entries()].map(([activityKey,count])=>Object.freeze({activityKey,count})).sort((a,b)=>b.count-a.count||a.activityKey.localeCompare(b.activityKey)));
 const top=candidateCounts[0]!,topTies=candidateCounts.filter(x=>x.count===top.count).length;const directional=sampleCount>=PROCESS_MIN_DIRECTIONAL_CASES&&topTies===1;
 const probabilityBps=directional?Number((BigInt(top.count)*10_000n)/BigInt(sampleCount)):null;
 if(probabilityBps!==null&&(natural(probabilityBps)===null||probabilityBps>10_000))throw new ProcessUnsafeIntegerError();
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,target:'next_activity' as const,method:'empirical_next_activity_frequency' as const,currentActivityKey,asOf,sampleCount,confidence:directional?'directional' as const:'insufficient' as const,predictedActivityKey:directional?top.activityKey:null,probabilityBps,candidateCounts,assumptions:Object.freeze(assumptions),authoritative:false as const,provenance:Object.freeze(provenance)});
}

export function buildEmpiricalDelayPrediction(input:Readonly<{workspaceId:string;currentActivityKey:string;historicalPaths:readonly ProcessPath[];thresholdMs:number;asOf:string;assumptions:readonly string[]}>):DirectionalDelayPrediction{
 const workspaceId=required(input.workspaceId,'Delay prediction workspace is required'),currentActivityKey=required(input.currentActivityKey,'Delay prediction activity is required'),threshold=positive(input.thresholdMs),asOf=iso(input.asOf);if(!threshold)throw new ProcessUnsafeIntegerError();if(!asOf)throw new ProcessTimeError();
 const assumptions=input.assumptions.map(value=>required(value,'Delay prediction disclosure is required'));if(!assumptions.length)throw new ProcessMiningContractError('Delay prediction disclosure is required');
 let sampleCount=0,delayedSampleCount=0;const provenance:ProcessEventProvenance[]=[];
 for(const path of input.historicalPaths){
  assertPredictionPath(path,workspaceId,asOf);
  let index=-1;for(let i=path.events.length-2;i>=0;i-=1){if(path.events[i]!.activityKey===currentActivityKey){index=i;break}}
  if(index<0)continue;const current=path.events[index]!,next=path.events[index+1]!,durationMs=Date.parse(next.occurredAt)-Date.parse(current.occurredAt);
  if(!Number.isSafeInteger(durationMs)||durationMs<0)throw new ProcessTimeError();
  if(durationMs===0)continue;
  sampleCount+=1;if(durationMs>=threshold)delayedSampleCount+=1;provenance.push(current.provenance,next.provenance);
 }
 if(sampleCount===0||provenance.length===0)throw new ProcessProvenanceRequiredError();
 const directional=sampleCount>=PROCESS_MIN_DIRECTIONAL_CASES,probabilityBps=directional?Number((BigInt(delayedSampleCount)*10_000n)/BigInt(sampleCount)):null;
 if(probabilityBps!==null&&(natural(probabilityBps)===null||probabilityBps>10_000))throw new ProcessUnsafeIntegerError();
 return Object.freeze({schema:ENJAZ_PROCESS_MINING_SCHEMA,workspaceId,target:'delay_threshold_exceedance' as const,method:'empirical_wait_threshold_frequency' as const,currentActivityKey,thresholdMs:threshold,asOf,sampleCount,delayedSampleCount,confidence:directional?'directional' as const:'insufficient' as const,probabilityBps,assumptions:Object.freeze(assumptions),authoritative:false as const,provenance:Object.freeze(provenance)});
}
