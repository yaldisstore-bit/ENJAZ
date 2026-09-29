import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';

export type IntegrationScope='companies:read'|'transactions:read'|'webhooks:read'|'webhooks:manage'|'imports:dry-run'|'imports:execute';
export type IntegrationEventType='company.updated'|'transaction.updated'|'followup.due'|'payment.recorded'|'document.ready';
export type IntegrationAccountView=Readonly<{id:string;name:string;scopes:readonly IntegrationScope[];status:'active'|'revoked';expiresAt:string|null;revokedAt:string|null;createdAt:string}>;
export type IntegrationWebhookView=Readonly<{id:string;serviceAccountId:string;endpointUrl:string;eventTypes:readonly IntegrationEventType[];signingKeyPrefix:string;status:'active'|'disabled';disabledAt:string|null;createdAt:string;updatedAt:string}>;
export type IntegrationDeliveryView=Readonly<{id:string;subscriptionId:string;eventId:string;eventType:IntegrationEventType;attemptNo:number;outcome:'delivered'|'retryable'|'dead_letter';httpStatus:number|null;errorCode:string|null;requestedAt:string;completedAt:string;nextAttemptAt:string|null}>;
export type IntegrationManagementSnapshot=Readonly<{workspaceId:string;accounts:readonly IntegrationAccountView[];subscriptions:readonly IntegrationWebhookView[];deliveries:readonly IntegrationDeliveryView[]}>;
export type OneTimeCredential=Readonly<{serviceAccountId:string;tokenPrefix:string;rawToken:string}>;
export type OneTimeWebhookSecret=Readonly<{subscriptionId:string;signingKeyPrefix:string;signingSecret:string}>;
export interface IntegrationManagementGateway{
  snapshot(workspaceId:string):Promise<IntegrationManagementSnapshot>;
  issueCredential(input:Readonly<{workspaceId:string;name:string;scopes:readonly IntegrationScope[];expiresAt?:string|null}>):Promise<OneTimeCredential>;
  revokeCredential(workspaceId:string,serviceAccountId:string):Promise<void>;
  registerWebhook(input:Readonly<{workspaceId:string;serviceAccountId:string;endpointUrl:string;eventTypes:readonly IntegrationEventType[]}>):Promise<OneTimeWebhookSecret>;
  disableWebhook(workspaceId:string,subscriptionId:string):Promise<void>;
}

type Rec=Record<string,unknown>;type Rpc={rpc(name:string,args?:Rec):PromiseLike<{data:unknown;error:{message?:string}|null}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bad=():never=>{throw Error('استجابة التكاملات غير صالحة.')},rec=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Rec:bad(),arr=(v:unknown)=>Array.isArray(v)?v:bad(),str=(v:unknown)=>typeof v==='string'?v:bad(),opt=(v:unknown)=>v==null?null:str(v),id=(v:unknown)=>{const s=str(v);return UUID.test(s)?s:bad()},num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:bad()};
const fail=(e:{message?:string}|null)=>{if(!e)return;const m=e.message?.trim()||'';throw Error(m==='ENJAZ_INTEGRATION_AUTH_REQUIRED'?'يلزم تسجيل الدخول.':m==='ENJAZ_INTEGRATION_OWNER_REQUIRED'?'إدارة التكاملات لمالك مساحة العمل فقط.':m.startsWith('ENJAZ_')?'تعذر التنفيذ بسبب الصلاحيات أو الحالة.':m||'تعذر الاتصال بخدمة التكاملات.')};
const scopes=(v:unknown)=>arr(v).map(str) as IntegrationScope[],events=(v:unknown)=>arr(v).map(str) as IntegrationEventType[];

function parseSnapshot(v:unknown):IntegrationManagementSnapshot{
  const x=rec(v);
  return Object.freeze({
    workspaceId:id(x.workspaceId),
    accounts:Object.freeze(arr(x.accounts).map(v=>{const r=rec(v);return Object.freeze({id:id(r.id),name:str(r.name),scopes:Object.freeze(scopes(r.scopes)),status:r.status==='revoked'?'revoked' as const:'active' as const,expiresAt:opt(r.expiresAt),revokedAt:opt(r.revokedAt),createdAt:str(r.createdAt)})})),
    subscriptions:Object.freeze(arr(x.subscriptions).map(v=>{const r=rec(v);return Object.freeze({id:id(r.id),serviceAccountId:id(r.serviceAccountId),endpointUrl:str(r.endpointUrl),eventTypes:Object.freeze(events(r.eventTypes)),signingKeyPrefix:str(r.signingKeyPrefix),status:r.status==='disabled'?'disabled' as const:'active' as const,disabledAt:opt(r.disabledAt),createdAt:str(r.createdAt),updatedAt:str(r.updatedAt)})})),
    deliveries:Object.freeze(arr(x.deliveries).map(v=>{const r=rec(v),o=r.outcome;return Object.freeze({id:id(r.id),subscriptionId:id(r.subscriptionId),eventId:id(r.eventId),eventType:str(r.eventType) as IntegrationEventType,attemptNo:num(r.attemptNo),outcome:o==='retryable'||o==='dead_letter'?o:'delivered',httpStatus:r.httpStatus==null?null:num(r.httpStatus),errorCode:opt(r.errorCode),requestedAt:str(r.requestedAt),completedAt:str(r.completedAt),nextAttemptAt:opt(r.nextAttemptAt)})}))
  });
}

export function createIntegrationManagementGateway(client:EnjazSupabaseClient):IntegrationManagementGateway{
  const rpc=client as unknown as Rpc,call=async(name:string,args:Rec)=>{const r=await Promise.resolve(rpc.rpc(name,args));fail(r.error);return r.data};
  return Object.freeze({
    snapshot:async workspaceId=>parseSnapshot(await call('integration_management_snapshot_v1',{p_workspace_id:id(workspaceId)})),
    issueCredential:async input=>{if(!input.name.trim()||!input.scopes.length)bad();const r=rec(await call('integration_issue_credential_owner_v1',{p_workspace_id:id(input.workspaceId),p_name:input.name.trim(),p_scopes:[...input.scopes],p_expires_at:input.expiresAt??null}));return Object.freeze({serviceAccountId:id(r.serviceAccountId),tokenPrefix:str(r.tokenPrefix),rawToken:str(r.rawToken)})},
    revokeCredential:async(workspaceId,serviceAccountId)=>{await call('integration_revoke_service_account_owner_v1',{p_workspace_id:id(workspaceId),p_service_account_id:id(serviceAccountId)})},
    registerWebhook:async input=>{const endpoint=input.endpointUrl.trim();if(!input.eventTypes.length||!endpoint.startsWith('https://'))bad();const r=rec(await call('integration_register_webhook_owner_v1',{p_workspace_id:id(input.workspaceId),p_service_account_id:id(input.serviceAccountId),p_endpoint_url:endpoint,p_event_types:[...input.eventTypes]}));return Object.freeze({subscriptionId:id(r.subscriptionId),signingKeyPrefix:str(r.signingKeyPrefix),signingSecret:str(r.signingSecret)})},
    disableWebhook:async(workspaceId,subscriptionId)=>{await call('integration_disable_webhook_owner_v1',{p_workspace_id:id(workspaceId),p_subscription_id:id(subscriptionId)})}
  });
}
