export const AGENT_ACTION_SCHEMA='enjaz.copilot.agent.action.v1' as const;
export const AGENT_ACTION_OPERATIONS=[
  'prepare_followup_snooze','execute_followup_snooze',
  'prepare_followup_create','execute_followup_create',
] as const;
export type AgentActionOperation=typeof AGENT_ACTION_OPERATIONS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256=/^[0-9a-f]{64}$/;

export type PrepareFollowupSnoozeRequest=Readonly<{
  workspaceId:string;requestId:string;operation:'prepare_followup_snooze';followupId:string;snoozedUntil:string;
}>;
export type PrepareFollowupCreateRequest=Readonly<{
  workspaceId:string;requestId:string;operation:'prepare_followup_create';transactionId:string;followupId:string;title:string;dueAt:string;
}>;
export type ExecuteFollowupActionRequest=Readonly<{
  workspaceId:string;requestId:string;operation:'execute_followup_snooze'|'execute_followup_create';
  proposalId:string;proposalHash:string;executionKey:string;
}>;
export type AgentActionRequest=PrepareFollowupSnoozeRequest|PrepareFollowupCreateRequest|ExecuteFollowupActionRequest;

function uuid(v:unknown,code:string){
  if(typeof v!=='string'||!UUID.test(v.trim()))throw new Error(code);
  return v.trim().toLowerCase();
}
function exactKeys(row:Record<string,unknown>,allowed:readonly string[]){
  const set=new Set(allowed);
  for(const key of Object.keys(row))if(!set.has(key))throw new Error('ACTION_FIELD_FORBIDDEN');
}
async function sha256Text(value:string){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function futureIso(v:unknown,code:string){
  const iso=typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():'';
  if(!iso||Date.parse(iso)<=Date.now()+30_000)throw new Error(code);
  return iso;
}

export function isAgentActionOperation(value:unknown):value is AgentActionOperation{
  return typeof value==='string'&&(AGENT_ACTION_OPERATIONS as readonly string[]).includes(value);
}

export function parseAgentActionRequest(value:unknown):AgentActionRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ACTION_REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  if(!isAgentActionOperation(row.operation))throw new Error('ACTION_OPERATION_FORBIDDEN');

  if(row.operation==='prepare_followup_snooze'){
    exactKeys(row,['workspaceId','requestId','operation','followupId','snoozedUntil']);
    return Object.freeze({
      workspaceId:uuid(row.workspaceId,'WORKSPACE_ID_INVALID'),
      requestId:uuid(row.requestId,'REQUEST_ID_INVALID'),
      operation:'prepare_followup_snooze',
      followupId:uuid(row.followupId,'FOLLOWUP_ID_INVALID'),
      snoozedUntil:futureIso(row.snoozedUntil,'ACTION_SNOOZE_INVALID'),
    });
  }

  if(row.operation==='prepare_followup_create'){
    exactKeys(row,['workspaceId','requestId','operation','transactionId','followupId','title','dueAt']);
    const title=typeof row.title==='string'?row.title.trim():'';
    if(title.length<1||title.length>320)throw new Error('ACTION_TITLE_INVALID');
    return Object.freeze({
      workspaceId:uuid(row.workspaceId,'WORKSPACE_ID_INVALID'),
      requestId:uuid(row.requestId,'REQUEST_ID_INVALID'),
      operation:'prepare_followup_create',
      transactionId:uuid(row.transactionId,'TRANSACTION_ID_INVALID'),
      followupId:uuid(row.followupId,'FOLLOWUP_ID_INVALID'),
      title,
      dueAt:futureIso(row.dueAt,'ACTION_DUE_AT_INVALID'),
    });
  }

  exactKeys(row,['workspaceId','requestId','operation','proposalId','proposalHash','executionKey']);
  if(typeof row.proposalHash!=='string'||!SHA256.test(row.proposalHash))throw new Error('PROPOSAL_HASH_INVALID');
  return Object.freeze({
    workspaceId:uuid(row.workspaceId,'WORKSPACE_ID_INVALID'),
    requestId:uuid(row.requestId,'REQUEST_ID_INVALID'),
    operation:row.operation,
    proposalId:uuid(row.proposalId,'PROPOSAL_ID_INVALID'),
    proposalHash:row.proposalHash,
    executionKey:uuid(row.executionKey,'EXECUTION_KEY_INVALID'),
  });
}

export function followupSnoozeCanonical(req:PrepareFollowupSnoozeRequest){
  return [AGENT_ACTION_SCHEMA,req.workspaceId,req.requestId,req.operation,req.followupId,req.snoozedUntil].join('|');
}
export async function followupCreateCanonical(req:PrepareFollowupCreateRequest){
  const titleHash=await sha256Text(req.title);
  return [
    AGENT_ACTION_SCHEMA,req.workspaceId,req.requestId,req.operation,
    req.transactionId,req.followupId,titleHash,req.dueAt,
  ].join('|');
}

export async function actionProposalHash(req:PrepareFollowupSnoozeRequest|PrepareFollowupCreateRequest){
  return sha256Text(req.operation==='prepare_followup_snooze'
    ?followupSnoozeCanonical(req)
    :await followupCreateCanonical(req));
}

export async function actionTracePayloadHash(req:AgentActionRequest){
  if(req.operation==='prepare_followup_snooze'||req.operation==='prepare_followup_create')return actionProposalHash(req);
  return sha256Text([
    AGENT_ACTION_SCHEMA,req.workspaceId,req.requestId,req.operation,
    req.proposalId,req.proposalHash,req.executionKey,
  ].join('|'));
}

export function preparedSnoozeActionResult(input:Readonly<{
  proposalId:string;proposalHash:string;expiresAt:string;replayed:boolean;followupId:string;snoozedUntil:string;
}>){
  return Object.freeze({
    schema:AGENT_ACTION_SCHEMA,status:'pending_approval' as const,
    proposalId:input.proposalId,proposalHash:input.proposalHash,expiresAt:input.expiresAt,replayed:input.replayed,
    action:Object.freeze({kind:'followup.snooze' as const,followupId:input.followupId,snoozedUntil:input.snoozedUntil}),
    explicitApprovalRequired:true as const,digestBound:true as const,executionAllowed:false as const,genericWriteToolAllowed:false as const,
  });
}

export function preparedCreateActionResult(input:Readonly<{
  proposalId:string;proposalHash:string;expiresAt:string;replayed:boolean;
  transactionId:string;followupId:string;title:string;dueAt:string;
}>){
  return Object.freeze({
    schema:AGENT_ACTION_SCHEMA,status:'pending_approval' as const,
    proposalId:input.proposalId,proposalHash:input.proposalHash,expiresAt:input.expiresAt,replayed:input.replayed,
    action:Object.freeze({
      kind:'followup.create' as const,transactionId:input.transactionId,followupId:input.followupId,title:input.title,dueAt:input.dueAt,
    }),
    explicitApprovalRequired:true as const,digestBound:true as const,executionAllowed:false as const,genericWriteToolAllowed:false as const,
  });
}

export function parseExecutionResult(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  const row=value as Record<string,unknown>;
  if(row.schema!=='enjaz.copilot.agent.action-execution.v1')throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.proposalId!=='string'||!UUID.test(row.proposalId))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.proposalHash!=='string'||!SHA256.test(row.proposalHash))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(row.actionKind!=='followup.snooze'&&row.actionKind!=='followup.create')throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.targetId!=='string'||!UUID.test(row.targetId))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.replayed!=='boolean'||!row.result||typeof row.result!=='object'||Array.isArray(row.result))throw new Error('ACTION_EXECUTION_RESULT_INVALID');

  const snooze=row.actionKind==='followup.snooze';
  if(snooze&&(typeof row.snoozedUntil!=='string'||!Number.isFinite(Date.parse(row.snoozedUntil))))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(!snooze&&(
    typeof row.transactionId!=='string'||!UUID.test(row.transactionId)
    ||typeof row.title!=='string'||row.title.length<1||row.title.length>320
    ||typeof row.dueAt!=='string'||!Number.isFinite(Date.parse(row.dueAt))
  ))throw new Error('ACTION_EXECUTION_RESULT_INVALID');

  return Object.freeze({
    schema:row.schema as 'enjaz.copilot.agent.action-execution.v1',
    proposalId:row.proposalId,proposalHash:row.proposalHash,executionKey:String(row.executionKey??''),
    actionKind:row.actionKind as 'followup.snooze'|'followup.create',
    targetId:row.targetId,
    snoozedUntil:snooze?new Date(String(row.snoozedUntil)).toISOString():null,
    transactionId:snooze?null:String(row.transactionId),
    title:snooze?null:String(row.title),
    dueAt:snooze?null:new Date(String(row.dueAt)).toISOString(),
    result:row.result as Record<string,unknown>,replayed:row.replayed,
    atomicApprovalConsumption:true as const,
    domainAuthority:(snooze?'mutate_transaction_followup_state_v1':'create_transaction_followup_v1') as
      'mutate_transaction_followup_state_v1'|'create_transaction_followup_v1',
    genericWriteToolAllowed:false as const,
  });
}
