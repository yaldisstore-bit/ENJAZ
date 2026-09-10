import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { EnjazDataLayerFactory, EnjazWorkspaceDataLayer } from '../data/createDataLayer.ts';
import { DataLayerProvider } from '../data/react/DataLayerContext.tsx';
import { CurrentUserIdProvider } from '../shared/session/CurrentUserIdContext.tsx';
import { phase92BrowserState, phase92SearchIntelligence } from './production-test-search-intelligence.ts';
import { UiR2LiveRoot } from './runtime/UiR2LiveRoot.tsx';
import './runtime/shell-base.css';
import './runtime/shell.css';
import './golden/golden.css';
import './golden/golden-journey.css';
import './golden/golden-mobile-hardening.css';
import './core-work/core-work.css';
import './records/records.css';
import './operational-intelligence/operational-intelligence.css';
import './automation/automation.css';
import './field-operations/field-operations.css';
import './command/command-center.css';
import './home/home-connected.css';
import './auth/auth.css';
import './workflow/workflow.css';
import './search-intelligence/search-intelligence.css';
import './runtime/accessibility-hardening.css';

const W='00000000-0000-4000-8000-000000000001';
const U='00000000-0000-4000-8000-000000000010';
const emptyPage=Object.freeze({items:Object.freeze([]),hasMore:false});
const readRepository=Object.freeze({async list(){return emptyPage},async getById(){return null}});
const mutableRepository=Object.freeze({...readRepository,async insert(){throw new Error('Phase 9.2 browser harness blocks source writes')},async update(){throw new Error('Phase 9.2 browser harness blocks source writes')},async softDelete(){throw new Error('Phase 9.2 browser harness blocks source writes')}});
const appendOnlyRepository=Object.freeze({...readRepository,async append(){throw new Error('Phase 9.2 browser harness blocks source writes')}});
const layer=Object.freeze({
  scope:Object.freeze({workspaceId:W}),contacts:mutableRepository,companies:mutableRepository,companyContacts:readRepository,transactions:mutableRepository,followups:mutableRepository,blockers:mutableRepository,documents:mutableRepository,cashboxes:mutableRepository,calendar:mutableRepository,renewals:mutableRepository,workflowItemStates:mutableRepository,transactionRoutes:appendOnlyRepository,transactionNotes:appendOnlyRepository,workflowInstances:readRepository,lifecycleEvents:appendOnlyRepository,transactionActivity:appendOnlyRepository,payments:appendOnlyRepository,paymentReversals:appendOnlyRepository,feeChanges:appendOnlyRepository,ledger:appendOnlyRepository,automationRuns:readRepository,intelligenceSnapshots:readRepository,notificationDeliveries:readRepository,auditEvents:readRepository,importJobs:readRepository,
}) as unknown as EnjazWorkspaceDataLayer;
const dataFactory:EnjazDataLayerFactory=Object.freeze({async resolveWorkspaceId(userId:string){return userId===U?W:null},forWorkspace(workspaceId:string){if(workspaceId!==W)throw new Error('Phase 9.2 browser workspace mismatch');return layer}});

declare global {interface Window{__ENJAZ_PHASE92_BROWSER__?:typeof phase92BrowserState}}
window.__ENJAZ_PHASE92_BROWSER__=phase92BrowserState;

const root=document.getElementById('phase92-browser-root');
if(!root)throw new Error('Phase 9.2 browser root missing');
createRoot(root).render(<StrictMode><DataLayerProvider factory={dataFactory}><CurrentUserIdProvider userId={U}><UiR2LiveRoot searchIntelligence={phase92SearchIntelligence} searchWorkspace={Promise.resolve(W)} searchUserId={U}/></CurrentUserIdProvider></DataLayerProvider></StrictMode>);
