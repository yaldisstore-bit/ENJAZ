export const AGENT_PLAN_SCHEMA='enjaz.copilot.agent.plan.v1' as const;
export const AGENT_OPERATIONS=['plan','propose'] as const;
export type AgentOperation=typeof AGENT_OPERATIONS[number];

export const AGENT_CONTEXT_DOMAINS=['transactions','companies','people','procedures','documents'] as const;
export type AgentContextDomain=typeof AGENT_CONTEXT_DOMAINS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS=new Set(['workspaceId','requestId','operation','goal','contextQuery','limitPerDomain']);

export type AgentRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:AgentOperation;
  goal:string;
  contextQuery:string;
  limitPerDomain:number;
}>;

export type AgentSourceReference=Readonly<{
  schema:'enjaz.global-search-result.v1';
  domain:AgentContextDomain;
  entityId:string;
  title:string;
  subtitle:string|null;
  destination:string;
}>;

export type AgentCitation=Readonly<AgentSourceReference & {
  citationId:string;
  authoritative:true;
}>;

export type AgentPlanStep=Readonly<{
  stepId:string;
  kind:'inspect_context'|'prepare_proposal';
  label:string;
  execution:'read_only'|'proposal_only';
  citationIds:readonly string[];
}>;

export type AgentPlanResult=Readonly<{
  goal:string;
  steps:readonly AgentPlanStep[];
  citations:readonly AgentCitation[];
  proposal:Readonly<{
    status:'locked_proposal_only';
    executionAllowed:false;
    explicitApprovalRequired:true;
    approvalBindingRequired:true;
    approvalExpiryRequired:true;
    approvalReplayProtectionRequired:true;
    domainValidationRequired:true;
    rlsRequired:true;
    genericWriteToolAllowed:false;
  }>;
  grounding:Readonly<{
    authoritativeContextFound:boolean;
    sourceCount:number;
    sourceDomains:readonly AgentContextDomain[];
    planningMode:'deterministic_grounded_plan_v1';
    providerUsed:false;
    nonAuthoritativeProposal:true;
    executionStatus:'locked_proposal_only';
  }>;
}>;

function text(value:unknown,max:number){
  if(typeof value!=='string')return '';
  return value.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,max);
}
function domain(value:unknown):value is AgentContextDomain{
  return AGENT_CONTEXT_DOMAINS.includes(value as AgentContextDomain);
}

export function parseAgentRequest(value:unknown):AgentRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  for(const key of Object.keys(row))if(!ALLOWED_KEYS.has(key))throw new Error('REQUEST_FIELD_FORBIDDEN');
  if(typeof row.workspaceId!=='string'||!UUID.test(row.workspaceId))throw new Error('WORKSPACE_ID_INVALID');
  if(typeof row.requestId!=='string'||!UUID.test(row.requestId))throw new Error('REQUEST_ID_INVALID');
  if(typeof row.operation!=='string'||!(AGENT_OPERATIONS as readonly string[]).includes(row.operation))throw new Error('OPERATION_FORBIDDEN');
  const goal=text(row.goal,240),contextQuery=text(row.contextQuery,120);
  if(goal.length<3)throw new Error('GOAL_INVALID');
  if(contextQuery.length<2)throw new Error('CONTEXT_QUERY_INVALID');
  const limit=row.limitPerDomain===undefined?4:Number(row.limitPerDomain);
  if(!Number.isSafeInteger(limit)||limit<1||limit>4)throw new Error('LIMIT_INVALID');
  return Object.freeze({workspaceId:row.workspaceId,requestId:row.requestId,operation:row.operation as AgentOperation,goal,contextQuery,limitPerDomain:limit});
}

export async function agentPayloadHash(req:AgentRequest){
  const body={workspaceId:req.workspaceId,operation:req.operation,goal:req.goal,contextQuery:req.contextQuery,limitPerDomain:req.limitPerDomain};
  const bytes=new TextEncoder().encode(JSON.stringify(body));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function parseAgentReferences(value:unknown):readonly AgentSourceReference[]{
  if(!Array.isArray(value))throw new Error('CONTEXT_SOURCE_INVALID');
  return Object.freeze(value.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('CONTEXT_SOURCE_INVALID');
    const row=item as Record<string,unknown>;
    if(row.schema!=='enjaz.global-search-result.v1'||!domain(row.domain))throw new Error('CONTEXT_SOURCE_INVALID');
    const entityId=text(row.entityId,128),title=text(row.title,180),destination=text(row.destination,320);
    const subtitle=row.subtitle===null?null:text(row.subtitle,220)||null;
    if(!entityId||!title||!destination.startsWith('/app/'))throw new Error('CONTEXT_SOURCE_INVALID');
    return Object.freeze({schema:'enjaz.global-search-result.v1' as const,domain:row.domain,entityId,title,subtitle,destination});
  }));
}

function citations(rows:readonly AgentSourceReference[]):AgentCitation[]{
  return rows.slice(0,12).map((row,index)=>Object.freeze({...row,citationId:`A${index+1}`,authoritative:true as const}));
}

export function buildAgentPlan(req:AgentRequest,refs:readonly AgentSourceReference[]):AgentPlanResult{
  const cited=Object.freeze(citations(refs));
  const ids=Object.freeze(cited.map(x=>x.citationId));
  const domains=Object.freeze([...new Set(cited.map(x=>x.domain))] as AgentContextDomain[]);
  const hasContext=cited.length>0;
  const steps:AgentPlanStep[]=hasContext?[
    Object.freeze({
      stepId:'P1',
      kind:'inspect_context' as const,
      label:`راجع ${cited.length} مرجعًا موثوقًا مرتبطًا بالهدف قبل اقتراح أي إجراء.`,
      execution:'read_only' as const,
      citationIds:ids,
    }),
    Object.freeze({
      stepId:'P2',
      kind:'prepare_proposal' as const,
      label:'حضّر اقتراحًا غير قابل للتنفيذ، وحدد ما يحتاج موافقة صريحة والتحقق الدوميني قبل أي كتابة مستقبلية.',
      execution:'proposal_only' as const,
      citationIds:ids,
    }),
  ]:[];

  return Object.freeze({
    goal:req.goal,
    steps:Object.freeze(steps),
    citations:cited,
    proposal:Object.freeze({
      status:'locked_proposal_only' as const,
      executionAllowed:false as const,
      explicitApprovalRequired:true as const,
      approvalBindingRequired:true as const,
      approvalExpiryRequired:true as const,
      approvalReplayProtectionRequired:true as const,
      domainValidationRequired:true as const,
      rlsRequired:true as const,
      genericWriteToolAllowed:false as const,
    }),
    grounding:Object.freeze({
      authoritativeContextFound:hasContext,
      sourceCount:cited.length,
      sourceDomains:domains,
      planningMode:'deterministic_grounded_plan_v1' as const,
      providerUsed:false as const,
      nonAuthoritativeProposal:true as const,
      executionStatus:'locked_proposal_only' as const,
    }),
  });
}

export function successAgentEnvelope(requestId:string,operation:AgentOperation,result:AgentPlanResult){
  return Object.freeze({schema:AGENT_PLAN_SCHEMA,ok:true,requestId,operation,result});
}

export function errorAgentEnvelope(requestId:string|null,operation:AgentOperation|null,error:Readonly<{code:string;retryable:boolean;message:string}>){
  return Object.freeze({schema:AGENT_PLAN_SCHEMA,ok:false,requestId,operation,error});
}
