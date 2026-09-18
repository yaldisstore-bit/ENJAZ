export const FOUNDATION_SCHEMA='enjaz.copilot.foundation.v1' as const;
export const FOUNDATION_OPERATIONS=['capabilities','provider_probe'] as const;
export type FoundationOperation=typeof FOUNDATION_OPERATIONS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS=new Set(['workspaceId','requestId','operation']);

export type FoundationRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:FoundationOperation;
}>;

export type FoundationError=Readonly<{
  code:string;
  retryable:boolean;
  message:string;
}>;

export function parseFoundationRequest(value:unknown):FoundationRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  for(const key of Object.keys(row))if(!ALLOWED_KEYS.has(key))throw new Error('REQUEST_FIELD_FORBIDDEN');
  if(typeof row.workspaceId!=='string'||!UUID.test(row.workspaceId))throw new Error('WORKSPACE_ID_INVALID');
  if(typeof row.requestId!=='string'||!UUID.test(row.requestId))throw new Error('REQUEST_ID_INVALID');
  if(typeof row.operation!=='string'||!(FOUNDATION_OPERATIONS as readonly string[]).includes(row.operation))throw new Error('OPERATION_FORBIDDEN');
  return Object.freeze({workspaceId:row.workspaceId,requestId:row.requestId,operation:row.operation as FoundationOperation});
}

export async function foundationPayloadHash(req:FoundationRequest){
  const bytes=new TextEncoder().encode(JSON.stringify({workspaceId:req.workspaceId,operation:req.operation}));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function capabilitiesResult(){
  return Object.freeze({
    foundationVersion:'12.1',
    providerConfigured:false,
    providerBackedAssistance:false,
    toolExecution:false,
    businessMutation:false,
    operations:Object.freeze([...FOUNDATION_OPERATIONS]),
    rateLimit:Object.freeze({newRequestsPerMinute:20,scope:'actor_workspace'}),
    tracePolicy:Object.freeze({rawPromptStored:false,rawModelOutputStored:false,secretsStored:false}),
  });
}

export function successEnvelope(requestId:string,traceId:string,operation:FoundationOperation,result:unknown){
  return Object.freeze({schema:FOUNDATION_SCHEMA,ok:true,requestId,traceId,operation,result});
}

export function errorEnvelope(requestId:string|null,traceId:string|null,operation:FoundationOperation|null,error:FoundationError){
  return Object.freeze({schema:FOUNDATION_SCHEMA,ok:false,requestId,traceId,operation,error});
}

export function safeError(code:string):FoundationError{
  switch(code){
    case 'AUTH_REQUIRED': return {code,retryable:false,message:'Authentication is required.'};
    case 'AUTH_INVALID': return {code,retryable:false,message:'Authentication is invalid.'};
    case 'ENJAZ_COPILOT_WORKSPACE_FORBIDDEN': return {code,retryable:false,message:'Workspace access is not allowed.'};
    case 'ENJAZ_COPILOT_IDEMPOTENCY_CONFLICT': return {code,retryable:false,message:'Request id was already used with different input.'};
    case 'ENJAZ_COPILOT_RATE_LIMITED': return {code,retryable:true,message:'Copilot request limit reached. Retry after the current minute window.'};
    case 'PROVIDER_NOT_CONFIGURED': return {code,retryable:true,message:'Copilot provider is not configured in Foundation phase.'};
    case 'REQUEST_INVALID':
    case 'REQUEST_FIELD_FORBIDDEN':
    case 'WORKSPACE_ID_INVALID':
    case 'REQUEST_ID_INVALID':
    case 'OPERATION_FORBIDDEN':
      return {code,retryable:false,message:'Copilot request is invalid.'};
    default:return {code:'COPILOT_FOUNDATION_FAILED',retryable:true,message:'Copilot Foundation request could not be completed.'};
  }
}
