export const AGENT_ACTION_SCHEMA='enjaz.copilot.agent.action.v1' as const;
export const AGENT_ACTION_OPERATIONS=['prepare_followup_snooze','execute_followup_snooze'] as const;
export type AgentActionOperation=typeof AGENT_ACTION_OPERATIONS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256=/^[0-9a-f]{64}$/;

export type PrepareFollowupSnoozeRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:'prepare_followup_snooze';
  followupId:string;
  snoozedUntil:string;
}>;

export type ExecuteFollowupSnoozeRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  operation:'execute_followup_snooze';
  proposalId:string;
  proposalHash:string;
  executionKey:string;
}>;

export type AgentActionRequest=PrepareFollowupSnoozeRequest|ExecuteFollowupSnoozeRequest;

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

export function isAgentActionOperation(value:unknown):value is AgentActionOperation{
  return typeof value==='string'&&(AGENT_ACTION_OPERATIONS as readonly string[]).includes(value);
}

export function parseAgentActionRequest(value:unknown):AgentActionRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ACTION_REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  if(!isAgentActionOperation(row.operation))throw new Error('ACTION_OPERATION_FORBIDDEN');
  if(row.operation==='prepare_followup_snooze'){
    exactKeys(row,['workspaceId','requestId','operation','followupId','snoozedUntil']);
    const snoozedUntil=typeof row.snoozedUntil==='string'&&Number.isFinite(Date.parse(row.snoozedUntil))
      ?new Date(row.snoozedUntil).toISOString():'';
    if(!snoozedUntil||Date.parse(snoozedUntil)<=Date.now()+30_000)throw new Error('ACTION_SNOOZE_INVALID');
    return Object.freeze({
      workspaceId:uuid(row.workspaceId,'WORKSPACE_ID_INVALID'),
      requestId:uuid(row.requestId,'REQUEST_ID_INVALID'),
      operation:'prepare_followup_snooze',
      followupId:uuid(row.followupId,'FOLLOWUP_ID_INVALID'),
      snoozedUntil,
    });
  }
  exactKeys(row,['workspaceId','requestId','operation','proposalId','proposalHash','executionKey']);
  if(typeof row.proposalHash!=='string'||!SHA256.test(row.proposalHash))throw new Error('PROPOSAL_HASH_INVALID');
  return Object.freeze({
    workspaceId:uuid(row.workspaceId,'WORKSPACE_ID_INVALID'),
    requestId:uuid(row.requestId,'REQUEST_ID_INVALID'),
    operation:'execute_followup_snooze',
    proposalId:uuid(row.proposalId,'PROPOSAL_ID_INVALID'),
    proposalHash:row.proposalHash,
    executionKey:uuid(row.executionKey,'EXECUTION_KEY_INVALID'),
  });
}

export function followupSnoozeCanonical(req:PrepareFollowupSnoozeRequest){
  return [
    AGENT_ACTION_SCHEMA,req.workspaceId,req.requestId,req.operation,req.followupId,req.snoozedUntil,
  ].join('|');
}

export async function actionProposalHash(req:PrepareFollowupSnoozeRequest){
  return sha256Text(followupSnoozeCanonical(req));
}

export async function actionTracePayloadHash(req:AgentActionRequest){
  if(req.operation==='prepare_followup_snooze')return actionProposalHash(req);
  return sha256Text([
    AGENT_ACTION_SCHEMA,req.workspaceId,req.requestId,req.operation,
    req.proposalId,req.proposalHash,req.executionKey,
  ].join('|'));
}

export function preparedActionResult(input:Readonly<{
  proposalId:string;proposalHash:string;expiresAt:string;replayed:boolean;
  followupId:string;snoozedUntil:string;
}>){
  return Object.freeze({
    schema:AGENT_ACTION_SCHEMA,
    status:'pending_approval' as const,
    proposalId:input.proposalId,
    proposalHash:input.proposalHash,
    expiresAt:input.expiresAt,
    replayed:input.replayed,
    action:Object.freeze({
      kind:'followup.snooze' as const,
      followupId:input.followupId,
      snoozedUntil:input.snoozedUntil,
    }),
    explicitApprovalRequired:true as const,
    digestBound:true as const,
    executionAllowed:false as const,
    genericWriteToolAllowed:false as const,
  });
}

export function parseExecutionResult(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  const row=value as Record<string,unknown>;
  if(row.schema!=='enjaz.copilot.agent.action-execution.v1')throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.proposalId!=='string'||!UUID.test(row.proposalId))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.proposalHash!=='string'||!SHA256.test(row.proposalHash))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(row.actionKind!=='followup.snooze')throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.targetId!=='string'||!UUID.test(row.targetId))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.snoozedUntil!=='string'||!Number.isFinite(Date.parse(row.snoozedUntil)))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  if(typeof row.replayed!=='boolean'||!row.result||typeof row.result!=='object'||Array.isArray(row.result))throw new Error('ACTION_EXECUTION_RESULT_INVALID');
  return Object.freeze({
    schema:row.schema as 'enjaz.copilot.agent.action-execution.v1',
    proposalId:row.proposalId,
    proposalHash:row.proposalHash,
    executionKey:String(row.executionKey??''),
    actionKind:'followup.snooze' as const,
    targetId:row.targetId,
    snoozedUntil:new Date(row.snoozedUntil).toISOString(),
    result:row.result as Record<string,unknown>,
    replayed:row.replayed,
    atomicApprovalConsumption:true as const,
    domainAuthority:'mutate_transaction_followup_state_v1' as const,
    genericWriteToolAllowed:false as const,
  });
}
