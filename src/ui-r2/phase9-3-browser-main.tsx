import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../data/createDataLayer.ts';
import type { RowOf } from '../data/contracts/dataTypes.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { GovernanceCommandProvider } from '../features/governance/GovernanceCommandContext.tsx';
import type { GovernanceCommandGateway, GovernanceContext } from '../features/governance/governanceCommands.ts';
import { CurrentUserIdProvider } from '../shared/session/CurrentUserIdContext.tsx';
import { ConnectedCompanies } from './records/ConnectedCompanies.tsx';
import './design-system/design-system.css';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './core-work/core-work.css';
import './records/records.css';
import './records/companies.css';
import './runtime/accessibility-hardening.css';

const W='11111111-1111-4111-8111-111111111111';
const U='44444444-4444-4444-8444-444444444444';
const C='22222222-2222-4222-8222-222222222222';
const P1='33333333-3333-4333-8333-333333333331';
const P2='33333333-3333-4333-8333-333333333332';

const company:RowOf<'companies'>={id:C,workspace_id:W,legal_name:'شركة إنجاز للاختبار القانوني محدودة المسؤولية',display_name:'إنجاز القانونية',capital:150000000,address:'بغداد — المنصور',activities:'التجارة العامة والخدمات القانونية',registration_number:'ENJ-93-2026',legal_status:'محدودة المسؤولية',primary_contact_id:P1,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-01-10T08:00:00.000Z',updated_at:'2026-09-10T08:00:00.000Z',deleted_at:null};
const contacts:readonly RowOf<'contacts'>[]=[
  {id:P1,workspace_id:W,display_name:'محمد حيدر محسن',contact_type:'person',phone:null,email:null,notes:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-01-10T08:00:00.000Z',updated_at:'2026-09-10T08:00:00.000Z',deleted_at:null},
  {id:P2,workspace_id:W,display_name:'مصطفى فيصل عبود',contact_type:'person',phone:null,email:null,notes:null,status:'active',merged_into_id:null,legacy_id:null,legacy_source:null,created_at:'2026-01-10T08:00:00.000Z',updated_at:'2026-09-10T08:00:00.000Z',deleted_at:null},
];
const relations:readonly RowOf<'company_contacts'>[]=[
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',workspace_id:W,company_id:C,contact_id:P1,relation_type:'manager',valid_from:'2026-01-10',valid_to:null,created_at:'2026-01-10T08:00:00.000Z'},
  {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',workspace_id:W,company_id:C,contact_id:P2,relation_type:'authorized_person',valid_from:'2026-01-10',valid_to:null,created_at:'2026-01-10T08:00:00.000Z'},
];
const page=<T,>(items:readonly T[])=>Object.freeze({items,offset:0,limit:100,total:items.length,hasMore:false});
const empty=page<never>([]);
const companiesRepo={async list(){return page([company])},async getById(id:string){return id===C?company:null},async create(){throw new Error('Phase 9.3 browser harness blocks company writes')},async update(){throw new Error('Phase 9.3 browser harness blocks company writes')},async softDelete(){throw new Error('Phase 9.3 browser harness blocks company writes')}};
const contactsRepo={async list(){return page(contacts)},async getById(id:string){return contacts.find(x=>x.id===id)??null},async create(){throw new Error('Phase 9.3 browser harness blocks contact writes')},async update(){throw new Error('Phase 9.3 browser harness blocks contact writes')},async softDelete(){throw new Error('Phase 9.3 browser harness blocks contact writes')}};
const relationsRepo={async list(){return page(relations)},async getById(id:string){return relations.find(x=>x.id===id)??null}};
const readEmpty={async list(){return empty},async getById(){return null}};
const appendEmpty={...readEmpty,async append(){throw new Error('Phase 9.3 browser harness blocks source writes')}};
const mutableEmpty={...readEmpty,async insert(){throw new Error('Phase 9.3 browser harness blocks source writes')},async update(){throw new Error('Phase 9.3 browser harness blocks source writes')},async softDelete(){throw new Error('Phase 9.3 browser harness blocks source writes')}};
const layer={scope:Object.freeze({workspaceId:W}),contacts:contactsRepo,companies:companiesRepo,companyContacts:relationsRepo,transactions:mutableEmpty,followups:mutableEmpty,blockers:mutableEmpty,documents:mutableEmpty,cashboxes:mutableEmpty,calendar:mutableEmpty,renewals:mutableEmpty,workflowItemStates:mutableEmpty,transactionRoutes:appendEmpty,transactionNotes:appendEmpty,workflowInstances:readEmpty,lifecycleEvents:appendEmpty,transactionActivity:appendEmpty,payments:appendEmpty,paymentReversals:appendEmpty,feeChanges:appendEmpty,ledger:appendEmpty,automationRuns:readEmpty,intelligenceSnapshots:readEmpty,notificationDeliveries:readEmpty,auditEvents:readEmpty,importJobs:readEmpty} as unknown as EnjazWorkspaceDataLayer;
const dataFactory:EnjazDataLayerFactory={async resolveWorkspaceId(userId:string){return userId===U?W:null},forWorkspace(workspaceId:string){if(workspaceId!==W)throw new Error('Phase 9.3 browser workspace mismatch');return layer}};

const baseContext:GovernanceContext={
  companyId:C,asOf:'2026-09-11',canMutate:true,
  versions:{ownership:3,beneficialOwners:2,authority:4,resolutions:5,capital:2},
  ownership:{configured:true,totalPercentage:'100',stakes:[
    {id:'55555555-5555-4555-8555-555555555551',holderKind:'person',holderId:P1,role:'partner',percentage:'60',effectiveFrom:'2026-01-10',effectiveTo:null},
    {id:'55555555-5555-4555-8555-555555555552',holderKind:'person',holderId:P2,role:'partner',percentage:'40',effectiveFrom:'2026-01-10',effectiveTo:null},
  ]},
  beneficialOwners:[{id:'77777777-7777-4777-8777-777777777771',contactId:P1,displayName:'محمد حيدر محسن',basis:'ownership',percentage:'60',effectiveFrom:'2026-01-10',effectiveTo:null}],
  authorities:[{id:'66666666-6666-4666-8666-666666666661',contactId:P1,displayName:'محمد حيدر محسن',role:'manager',scope:'full',powers:['التوقيع','التمثيل أمام الجهات الرسمية'],effectiveFrom:'2026-01-10',effectiveTo:null,endReason:null}],
  resolutions:[{id:'88888888-8888-4888-8888-888888888881',number:'1/2026',title:'اعتماد هيكل الإدارة والتخويل',type:'appointment',effectiveOn:'2026-01-10',notes:'قرار تأسيسي معتمد'}],
  capital:{known:true,amount:'150000000',source:'governance_history',effectiveOn:'2026-06-01',version:2},
  timeline:[
    {id:'99999999-9999-4999-8999-999999999991',type:'capital.change',effectiveOn:'2026-06-01',version:2,occurredAt:'2026-06-01T09:00:00.000Z',details:{}},
    {id:'99999999-9999-4999-8999-999999999992',type:'resolution.record',effectiveOn:'2026-01-10',version:5,occurredAt:'2026-01-10T10:00:00.000Z',details:{}},
    {id:'99999999-9999-4999-8999-999999999993',type:'authority.grant',effectiveOn:'2026-01-10',version:4,occurredAt:'2026-01-10T09:30:00.000Z',details:{}},
    {id:'99999999-9999-4999-8999-999999999994',type:'beneficial_owner.snapshot',effectiveOn:'2026-01-10',version:2,occurredAt:'2026-01-10T09:20:00.000Z',details:{}},
    {id:'99999999-9999-4999-8999-999999999995',type:'ownership.snapshot',effectiveOn:'2026-01-10',version:3,occurredAt:'2026-01-10T09:10:00.000Z',details:{}},
  ],
  risks:[],
};

const browserState={loads:[] as string[],mutations:[] as string[]};
const governanceCommands:GovernanceCommandGateway={
  async loadContext(workspaceId,companyId,asOf=null){if(workspaceId!==W||companyId!==C)throw new Error('Phase 9.3 governance scope mismatch');browserState.loads.push(asOf??'current');return {...baseContext,asOf:asOf??baseContext.asOf}},
  async replaceOwnership(){browserState.mutations.push('ownership')},
  async replaceBeneficialOwners(){browserState.mutations.push('beneficial')},
  async grantAuthority(){browserState.mutations.push('authority.grant')},
  async revokeAuthority(){browserState.mutations.push('authority.revoke')},
  async recordResolution(){browserState.mutations.push('resolution')},
  async recordCapital(){browserState.mutations.push('capital')},
};

declare global{interface Window{__ENJAZ_PHASE93_BROWSER__?:typeof browserState}}
window.__ENJAZ_PHASE93_BROWSER__=browserState;
const root=document.getElementById('phase93-browser-root');
if(!root)throw new Error('Phase 9.3 browser root missing');
createRoot(root).render(<StrictMode><DataLayerProvider factory={dataFactory}><GovernanceCommandProvider gateway={governanceCommands}><CurrentUserIdProvider userId={U}><main className="ez-r2-root" style={{minHeight:'100vh',padding:'clamp(12px,3vw,32px)'}}><ConnectedCompanies/></main></CurrentUserIdProvider></GovernanceCommandProvider></DataLayerProvider></StrictMode>);
