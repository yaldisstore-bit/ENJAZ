import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';

export type IntegrationScope =
  | 'companies:read'
  | 'transactions:read'
  | 'webhooks:read'
  | 'webhooks:manage'
  | 'imports:dry-run'
  | 'imports:execute';

export type IntegrationEventType =
  | 'company.updated'
  | 'transaction.updated'
  | 'followup.due'
  | 'payment.recorded'
  | 'document.ready';

export interface IntegrationAccountView {
  readonly id:string;
  readonly name:string;
  readonly scopes:readonly IntegrationScope[];
  readonly status:'active'|'revoked';
  readonly expiresAt:string|null;
  readonly revokedAt:string|null;
  readonly createdAt:string;
}
export interface IntegrationWebhookView {
  readonly id:string;
  readonly serviceAccountId:string;
  readonly endpointUrl:string;
  readonly eventTypes:readonly IntegrationEventType[];
  readonly signingKeyPrefix:string;
  readonly status:'active'|'disabled';
  readonly disabledAt:string|null;
  readonly createdAt:string;
  readonly updatedAt:string;
}
export interface IntegrationDeliveryView {
  readonly id:string;
  readonly subscriptionId:string;
  readonly eventId:string;
  readonly eventType:IntegrationEventType;
  readonly attemptNo:number;
  readonly outcome:'delivered'|'retryable'|'dead_letter';
  readonly httpStatus:number|null;
  readonly errorCode:string|null;
  readonly requestedAt:string;
  readonly completedAt:string;
  readonly nextAttemptAt:string|null;
}
export interface IntegrationManagementSnapshot {
  readonly workspaceId:string;
  readonly accounts:readonly IntegrationAccountView[];
  readonly subscriptions:readonly IntegrationWebhookView[];
  readonly deliveries:readonly IntegrationDeliveryView[];
}
export interface OneTimeCredential {
  readonly serviceAccountId:string;
  readonly tokenPrefix:string;
  readonly rawToken:string;
}
export interface OneTimeWebhookSecret {
  readonly subscriptionId:string;
  readonly signingKeyPrefix:string;
  readonly signingSecret:string;
}
export interface IntegrationManagementGateway {
  snapshot(workspaceId:string):Promise<IntegrationManagementSnapshot>;
  issueCredential(input:Readonly<{workspaceId:string;name:string;scopes:readonly IntegrationScope[];expiresAt?:string|null}>):Promise<OneTimeCredential>;
  revokeCredential(workspaceId:string,serviceAccountId:string):Promise<void>;
  registerWebhook(input:Readonly<{workspaceId:string;serviceAccountId:string;endpointUrl:string;eventTypes:readonly IntegrationEventType[]}>):Promise<OneTimeWebhookSecret>;
  disableWebhook(workspaceId:string,subscriptionId:string):Promise<void>;
}

type RpcFailure={readonly message?:string};
type RpcResult={readonly data:unknown;readonly error:RpcFailure|null};
type RpcLike={rpc(name:string,args?:Record<string,unknown>):PromiseLike<RpcResult>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('استجابة التكاملات غير صالحة.');return v as Record<string,unknown>};
const array=(v:unknown)=>Array.isArray(v)?v:[];
const text=(v:unknown)=>typeof v==='string'?v:'';
const nullable=(v:unknown)=>typeof v==='string'?v:null;
const uuid=(v:string,label:string)=>{const x=v.trim();if(!UUID.test(x))throw new Error(label+' غير صالح.');return x};
const fail=(error:RpcFailure|null)=>{if(!error)return;const raw=(error.message??'').trim();const known:Record<string,string>={
  ENJAZ_INTEGRATION_AUTH_REQUIRED:'يلزم تسجيل الدخول.',
  ENJAZ_INTEGRATION_OWNER_REQUIRED:'إدارة التكاملات متاحة لمالك مساحة العمل فقط.',
  ENJAZ_INTEGRATION_ACCOUNT_NOT_ACTIVE:'اعتماد الوصول لم يعد فعالًا.',
  ENJAZ_INTEGRATION_WEBHOOK_NOT_ACTIVE:'اشتراك Webhook لم يعد فعالًا.',
};throw new Error(known[raw]??(raw.startsWith('ENJAZ_')?'تعذر تنفيذ العملية لأن الصلاحيات أو الحالة تغيّرت.':raw||'تعذر الاتصال بخدمة التكاملات.'))};

function parseSnapshot(value:unknown):IntegrationManagementSnapshot{
  const root=object(value);
  const accounts=array(root.accounts).map(v=>{const r=object(v);return Object.freeze({
    id:uuid(text(r.id),'معرّف الاعتماد'),name:text(r.name),
    scopes:Object.freeze(array(r.scopes).filter((x):x is IntegrationScope=>typeof x==='string')) as readonly IntegrationScope[],
    status:r.status==='revoked'?'revoked' as const:'active' as const,
    expiresAt:nullable(r.expiresAt),revokedAt:nullable(r.revokedAt),createdAt:text(r.createdAt),
  })});
  const subscriptions=array(root.subscriptions).map(v=>{const r=object(v);return Object.freeze({
    id:uuid(text(r.id),'معرّف الاشتراك'),serviceAccountId:uuid(text(r.serviceAccountId),'معرّف الاعتماد'),
    endpointUrl:text(r.endpointUrl),eventTypes:Object.freeze(array(r.eventTypes).filter((x):x is IntegrationEventType=>typeof x==='string')) as readonly IntegrationEventType[],
    signingKeyPrefix:text(r.signingKeyPrefix),status:r.status==='disabled'?'disabled' as const:'active' as const,
    disabledAt:nullable(r.disabledAt),createdAt:text(r.createdAt),updatedAt:text(r.updatedAt),
  })});
  const deliveries=array(root.deliveries).map(v=>{const r=object(v);return Object.freeze({
    id:uuid(text(r.id),'معرّف المحاولة'),subscriptionId:uuid(text(r.subscriptionId),'معرّف الاشتراك'),
    eventId:uuid(text(r.eventId),'معرّف الحدث'),eventType:text(r.eventType) as IntegrationEventType,
    attemptNo:Number(r.attemptNo)||0,outcome:(r.outcome==='retryable'||r.outcome==='dead_letter'?r.outcome:'delivered') as IntegrationDeliveryView['outcome'],
    httpStatus:r.httpStatus===null?null:(Number.isInteger(Number(r.httpStatus))?Number(r.httpStatus):null),errorCode:nullable(r.errorCode),
    requestedAt:text(r.requestedAt),completedAt:text(r.completedAt),nextAttemptAt:nullable(r.nextAttemptAt),
  })});
  return Object.freeze({workspaceId:uuid(text(root.workspaceId),'معرّف مساحة العمل'),accounts:Object.freeze(accounts),subscriptions:Object.freeze(subscriptions),deliveries:Object.freeze(deliveries)});
}

export function createIntegrationManagementGateway(client:EnjazSupabaseClient):IntegrationManagementGateway{
  const rpc=client as unknown as RpcLike;
  const call=async(name:string,args:Record<string,unknown>)=>{const result=await Promise.resolve(rpc.rpc(name,args));fail(result.error);return result.data};
  const gateway:IntegrationManagementGateway={
    async snapshot(workspaceId:string){return parseSnapshot(await call('integration_management_snapshot_v1',{p_workspace_id:uuid(workspaceId,'معرّف مساحة العمل')}));},
    async issueCredential(input:Parameters<IntegrationManagementGateway['issueCredential']>[0]){
      if(!input.name.trim())throw new Error('اسم الاعتماد مطلوب.');
      if(!input.scopes.length)throw new Error('اختر صلاحية واحدة على الأقل.');
      const r=object(await call('integration_issue_credential_owner_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_name:input.name.trim(),p_scopes:[...input.scopes],p_expires_at:input.expiresAt??null}));
      return Object.freeze({serviceAccountId:uuid(text(r.serviceAccountId),'معرّف الاعتماد'),tokenPrefix:text(r.tokenPrefix),rawToken:text(r.rawToken)});
    },
    async revokeCredential(workspaceId:string,serviceAccountId:string){await call('integration_revoke_service_account_owner_v1',{p_workspace_id:uuid(workspaceId,'معرّف مساحة العمل'),p_service_account_id:uuid(serviceAccountId,'معرّف الاعتماد')});},
    async registerWebhook(input:Parameters<IntegrationManagementGateway['registerWebhook']>[0]){
      if(!input.eventTypes.length)throw new Error('اختر حدثًا واحدًا على الأقل.');
      const endpoint=input.endpointUrl.trim();if(!endpoint.startsWith('https://'))throw new Error('نقطة Webhook يجب أن تستخدم HTTPS.');
      const r=object(await call('integration_register_webhook_owner_v1',{p_workspace_id:uuid(input.workspaceId,'معرّف مساحة العمل'),p_service_account_id:uuid(input.serviceAccountId,'معرّف الاعتماد'),p_endpoint_url:endpoint,p_event_types:[...input.eventTypes]}));
      return Object.freeze({subscriptionId:uuid(text(r.subscriptionId),'معرّف الاشتراك'),signingKeyPrefix:text(r.signingKeyPrefix),signingSecret:text(r.signingSecret)});
    },
    async disableWebhook(workspaceId:string,subscriptionId:string){await call('integration_disable_webhook_owner_v1',{p_workspace_id:uuid(workspaceId,'معرّف مساحة العمل'),p_subscription_id:uuid(subscriptionId,'معرّف الاشتراك')});},
  };
  return Object.freeze(gateway);
}
