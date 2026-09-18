import {AGENT_PLAN_SCHEMA,type AgentPlanResult,type AgentRequest} from './core.ts';

export const AGENT_APPROVAL_SCHEMA='enjaz.copilot.agent.approval.v1' as const;
export const AGENT_APPROVAL_DECISIONS=['approve','reject'] as const;
export type AgentApprovalDecision=typeof AGENT_APPROVAL_DECISIONS[number];

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256=/^[0-9a-f]{64}$/;
const ALLOWED_KEYS=new Set(['workspaceId','requestId','proposalId','proposalHash','decision','decisionKey']);

export type AgentApprovalRequest=Readonly<{
  workspaceId:string;
  requestId:string;
  proposalId:string;
  proposalHash:string;
  decision:AgentApprovalDecision;
  decisionKey:string;
}>;

async function sha256(value:unknown){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export async function agentProposalHash(req:AgentRequest,result:AgentPlanResult){
  return sha256({
    schema:AGENT_PLAN_SCHEMA,
    workspaceId:req.workspaceId,
    requestId:req.requestId,
    operation:req.operation,
    goal:req.goal,
    steps:result.steps,
    citations:result.citations,
    proposal:result.proposal,
    grounding:result.grounding,
  });
}

export function parseAgentApprovalRequest(value:unknown):AgentApprovalRequest{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('APPROVAL_REQUEST_INVALID');
  const row=value as Record<string,unknown>;
  for(const key of Object.keys(row))if(!ALLOWED_KEYS.has(key))throw new Error('APPROVAL_FIELD_FORBIDDEN');
  for(const key of ['workspaceId','requestId','proposalId','decisionKey'] as const){
    if(typeof row[key]!=='string'||!UUID.test(row[key] as string))throw new Error(`${key.toUpperCase()}_INVALID`);
  }
  if(typeof row.proposalHash!=='string'||!SHA256.test(row.proposalHash))throw new Error('PROPOSAL_HASH_INVALID');
  if(typeof row.decision!=='string'||!(AGENT_APPROVAL_DECISIONS as readonly string[]).includes(row.decision))throw new Error('APPROVAL_DECISION_INVALID');
  return Object.freeze({
    workspaceId:row.workspaceId as string,
    requestId:row.requestId as string,
    proposalId:row.proposalId as string,
    proposalHash:row.proposalHash,
    decision:row.decision as AgentApprovalDecision,
    decisionKey:row.decisionKey as string,
  });
}

export function approvalTraceOperation(decision:AgentApprovalDecision){
  return decision==='approve'?'approve_proposal' as const:'reject_proposal' as const;
}

export function approvalDbDecision(decision:AgentApprovalDecision){
  return decision==='approve'?'approved' as const:'rejected' as const;
}

export async function approvalPayloadHash(req:AgentApprovalRequest){
  return sha256({
    schema:AGENT_APPROVAL_SCHEMA,
    workspaceId:req.workspaceId,
    proposalId:req.proposalId,
    proposalHash:req.proposalHash,
    decision:req.decision,
    decisionKey:req.decisionKey,
  });
}

export function approvalResult(input:Readonly<{
  proposalId:string;proposalHash:string;status:'pending'|'approved'|'rejected';
  expiresAt:string;decidedAt?:string|null;replayed:boolean;
}>){
  return Object.freeze({
    schema:AGENT_APPROVAL_SCHEMA,
    proposalId:input.proposalId,
    proposalHash:input.proposalHash,
    status:input.status,
    expiresAt:input.expiresAt,
    decidedAt:input.decidedAt??null,
    replayed:input.replayed,
    actorBound:true as const,
    workspaceBound:true as const,
    digestBound:true as const,
    expiryRequired:true as const,
    singleUseRequired:true as const,
    executionAllowed:false as const,
    businessMutationAllowed:false as const,
  });
}
