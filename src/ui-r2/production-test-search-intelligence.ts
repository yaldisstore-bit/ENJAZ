import type {
  GlobalSearchResultReference,
  SaveSavedViewInput,
  SavedViewRecord,
  SearchIntelligenceGateway,
} from '../features/searchIntelligence/searchIntelligenceCommands.ts';

const WORKSPACE_ID='00000000-0000-4000-8000-000000000001';
const USER_ID='00000000-0000-4000-8000-000000000010';
const TRANSACTION_ID='92000000-0000-4000-8000-000000000004';
const COMPANY_ID='92000000-0000-4000-8000-000000000002';
const PERSON_ID='92000000-0000-4000-8000-000000000003';
const PROCEDURE_ID='92000000-0000-4000-8000-000000000008';
const DOCUMENT_ID='92000000-0000-4000-8000-000000000005';
const NOW='2026-09-10T10:00:00.000Z';

export const phase92BrowserState={lists:0,saves:0,renames:0,deletes:0,searches:0};
let savedViews:SavedViewRecord[]=[];
let nextId=30;

function assertWorkspace(workspaceId:string){if(workspaceId!==WORKSPACE_ID)throw new Error('Phase 9.2 browser harness workspace drift');}
function freezeView(view:SavedViewRecord):SavedViewRecord{return Object.freeze({...view,definition:Object.freeze({...view.definition,filters:Object.freeze({...view.definition.filters}),dateRange:Object.freeze({...view.definition.dateRange})})});}

const searchResults:readonly GlobalSearchResultReference[]=Object.freeze([
  Object.freeze({schema:'enjaz.global-search-result.v1',domain:'transactions',entityId:TRANSACTION_ID,title:'P92 Browser Transaction',subtitle:'شركة الاختبار · active',destination:`/app/transactions/${TRANSACTION_ID}`}),
  Object.freeze({schema:'enjaz.global-search-result.v1',domain:'companies',entityId:COMPANY_ID,title:'P92 Browser Company',subtitle:'شركة موثوقة',destination:`/app/companies?entity=${COMPANY_ID}`}),
  Object.freeze({schema:'enjaz.global-search-result.v1',domain:'people',entityId:PERSON_ID,title:'P92 Browser Person',subtitle:'جهة اتصال موثوقة',destination:`/app/people?entity=${PERSON_ID}`}),
  Object.freeze({schema:'enjaz.global-search-result.v1',domain:'procedures',entityId:PROCEDURE_ID,title:'P92 Browser Procedure',subtitle:'إجراء حكومي موثوق',destination:`/app/workflow?procedure=${PROCEDURE_ID}`}),
  Object.freeze({schema:'enjaz.global-search-result.v1',domain:'documents',entityId:DOCUMENT_ID,title:'P92 Browser Document',subtitle:'وثيقة موثوقة',destination:`/app/documents?entity=${DOCUMENT_ID}`}),
]);

export const phase92SearchIntelligence:SearchIntelligenceGateway=Object.freeze({
  async listSavedViews(workspaceId:string){
    assertWorkspace(workspaceId);phase92BrowserState.lists+=1;return Object.freeze(savedViews.map(freezeView));
  },
  async saveSavedView(input:SaveSavedViewInput){
    assertWorkspace(input.workspaceId);phase92BrowserState.saves+=1;
    if(input.savedViewId===null){
      const id=`92000000-0000-4000-8000-${String(nextId++).padStart(12,'0')}`;
      savedViews=[freezeView({id,workspaceId:WORKSPACE_ID,ownerUserId:USER_ID,name:input.name,domain:input.definition.domain,visibility:input.visibility??'personal',teamId:input.teamId??null,definition:input.definition,version:1,createdAt:NOW,updatedAt:NOW}),...savedViews];
      return Object.freeze({savedViewId:id,version:1,replayed:false,wasCreated:true});
    }
    const index=savedViews.findIndex(item=>item.id===input.savedViewId);
    if(index<0)throw new Error('Saved view not found in Phase 9.2 browser harness');
    const current=savedViews[index]!;
    if(input.expectedVersion!==current.version)throw new Error('ENJAZ_SAVED_VIEW_STALE');
    phase92BrowserState.renames+=1;
    const updated=freezeView({...current,name:input.name,definition:input.definition,visibility:input.visibility??current.visibility,teamId:input.teamId??null,version:current.version+1,updatedAt:NOW});
    savedViews=[...savedViews.slice(0,index),updated,...savedViews.slice(index+1)];
    return Object.freeze({savedViewId:updated.id,version:updated.version,replayed:false,wasCreated:false});
  },
  async deleteSavedView(workspaceId:string,savedViewId:string,expectedVersion:number,_operationId:string){
    assertWorkspace(workspaceId);const current=savedViews.find(item=>item.id===savedViewId);if(!current)throw new Error('Saved view not found in Phase 9.2 browser harness');if(current.version!==expectedVersion)throw new Error('ENJAZ_SAVED_VIEW_STALE');phase92BrowserState.deletes+=1;savedViews=savedViews.filter(item=>item.id!==savedViewId);return Object.freeze({savedViewId,version:expectedVersion+1,replayed:false,deleted:true});
  },
  async globalSearch(workspaceId:string,query:string,_limitPerDomain=8){
    assertWorkspace(workspaceId);phase92BrowserState.searches+=1;return query.trim().length>=2?searchResults:Object.freeze([]);
  },
});
