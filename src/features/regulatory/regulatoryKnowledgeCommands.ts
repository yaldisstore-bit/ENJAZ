import type { EnjazSupabaseClient } from '../../core/supabase/client.ts';
import type { RegulatorySourceKind, RegulatorySourceScope } from './regulatoryKnowledgeContract.ts';

export type RegulatoryKnowledgeSearchItem = Readonly<{
  sourceId: string;
  scope: RegulatorySourceScope;
  workspaceId: string | null;
  kind: RegulatorySourceKind;
  jurisdiction: string;
  issuer: string;
  referenceCode: string;
  asOf: string;
  versionId: string;
  revision: number;
  titleAr: string;
  publicationDate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceLocator: string;
  publisher: string;
  sourceUrl: string;
  retrievedOn: string;
  sourceHash: string;
  authoritative: true;
  excerpt: string;
}>;

export type RegulatoryDerivedArtifactView = Readonly<{
  artifactId: string;
  kind: 'editorial_interpretation' | 'ai_summary';
  sourceId: string;
  sourceVersionId: string;
  body: string;
  authoritative: false;
  createdAt: string;
}>;

export type RegulatoryKnowledgeEntry = Readonly<{
  sourceId: string;
  workspaceId: string;
  asOf: string;
  configured: boolean;
  official: null | Readonly<{
    scope: RegulatorySourceScope;
    sourceWorkspaceId: string | null;
    kind: RegulatorySourceKind;
    jurisdiction: string;
    issuer: string;
    referenceCode: string;
    versionId: string;
    revision: number;
    titleAr: string;
    publicationDate: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    supersedesVersionId: string | null;
    sourceLocator: string;
    publisher: string;
    sourceUrl: string;
    retrievedOn: string;
    sourceHash: string;
    officialText: string;
    authoritative: true;
  }>;
  derivedArtifacts: readonly RegulatoryDerivedArtifactView[];
}>;

export interface RegulatoryKnowledgeGateway {
  search(input: Readonly<{
    workspaceId: string;
    query?: string;
    kind?: RegulatorySourceKind | null;
    scope?: RegulatorySourceScope | null;
    asOf?: string | null;
    limit?: number;
  }>): Promise<readonly RegulatoryKnowledgeSearchItem[]>;
  getEntry(input: Readonly<{ workspaceId: string; sourceId: string; asOf?: string | null }>): Promise<RegulatoryKnowledgeEntry>;
}

type RpcResponse = Readonly<{ data: unknown; error: null | Readonly<{ message?: string; code?: string }> }>;
type RpcClient = Readonly<{ rpc(name: string, args?: Readonly<Record<string, unknown>>): PromiseLike<RpcResponse> }>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const KINDS=new Set<RegulatorySourceKind>(['law','regulation','instruction','circular','official_notice','procedure']);
const SCOPES=new Set<RegulatorySourceScope>(['official_global','workspace_curated']);

function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('REGULATORY_RUNTIME_RESPONSE_INVALID');return value as Record<string,unknown>}
function text(value:unknown,label:string){if(typeof value!=='string'||!value.trim())throw new Error(`REGULATORY_${label}_INVALID`);return value}
function nullableText(value:unknown,label:string){return value===null?null:text(value,label)}
function uuid(value:unknown,label:string){const v=text(value,label);if(!UUID.test(v))throw new Error(`REGULATORY_${label}_INVALID`);return v}
function date(value:unknown,label:string){const v=text(value,label);if(!DATE.test(v))throw new Error(`REGULATORY_${label}_INVALID`);return v}
function scope(value:unknown){if(!SCOPES.has(value as RegulatorySourceScope))throw new Error('REGULATORY_SCOPE_INVALID');return value as RegulatorySourceScope}
function kind(value:unknown){if(!KINDS.has(value as RegulatorySourceKind))throw new Error('REGULATORY_KIND_INVALID');return value as RegulatorySourceKind}
function revision(value:unknown){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)return (()=>{throw new Error('REGULATORY_REVISION_INVALID')})();return value}
function rpcError(response:RpcResponse){if(response.error)throw new Error(response.error.code?`${response.error.code}: ${response.error.message??'Regulatory request failed'}`:response.error.message??'Regulatory request failed')}

function parseSearchItem(value:unknown):RegulatoryKnowledgeSearchItem{
  const r=record(value);if(r.schema!=='enjaz.regulatory-knowledge.search.v1'||r.authoritative!==true)throw new Error('REGULATORY_SEARCH_AUTHORITY_INVALID');
  return Object.freeze({
    sourceId:uuid(r.sourceId,'SOURCE_ID'),scope:scope(r.scope),workspaceId:r.workspaceId===null?null:uuid(r.workspaceId,'WORKSPACE_ID'),kind:kind(r.kind),
    jurisdiction:text(r.jurisdiction,'JURISDICTION'),issuer:text(r.issuer,'ISSUER'),referenceCode:text(r.referenceCode,'REFERENCE_CODE'),asOf:date(r.asOf,'AS_OF'),
    versionId:uuid(r.versionId,'VERSION_ID'),revision:revision(r.revision),titleAr:text(r.titleAr,'TITLE'),publicationDate:date(r.publicationDate,'PUBLICATION_DATE'),
    effectiveFrom:date(r.effectiveFrom,'EFFECTIVE_FROM'),effectiveTo:r.effectiveTo===null?null:date(r.effectiveTo,'EFFECTIVE_TO'),sourceLocator:text(r.sourceLocator,'LOCATOR'),
    publisher:text(r.publisher,'PUBLISHER'),sourceUrl:text(r.sourceUrl,'SOURCE_URL'),retrievedOn:date(r.retrievedOn,'RETRIEVED_ON'),sourceHash:text(r.sourceHash,'SOURCE_HASH'),
    authoritative:true,excerpt:typeof r.excerpt==='string'?r.excerpt:'',
  });
}

function parseArtifact(value:unknown):RegulatoryDerivedArtifactView{
  const r=record(value);if(r.authoritative!==false||(r.kind!=='editorial_interpretation'&&r.kind!=='ai_summary'))throw new Error('REGULATORY_DERIVED_AUTHORITY_INVALID');
  return Object.freeze({artifactId:uuid(r.artifactId,'ARTIFACT_ID'),kind:r.kind,sourceId:uuid(r.sourceId,'SOURCE_ID'),sourceVersionId:uuid(r.sourceVersionId,'VERSION_ID'),body:text(r.body,'DERIVED_BODY'),authoritative:false,createdAt:text(r.createdAt,'CREATED_AT')});
}

function parseEntry(value:unknown):RegulatoryKnowledgeEntry{
  const r=record(value);if(r.schema!=='enjaz.regulatory-knowledge.entry.v1'||typeof r.configured!=='boolean'||!Array.isArray(r.derivedArtifacts))throw new Error('REGULATORY_ENTRY_INVALID');
  const sourceId=uuid(r.sourceId,'SOURCE_ID'),workspaceId=uuid(r.workspaceId,'WORKSPACE_ID'),asOf=date(r.asOf,'AS_OF');
  if(!r.configured)return Object.freeze({sourceId,workspaceId,asOf,configured:false,official:null,derivedArtifacts:Object.freeze([])});
  const o=record(r.official);if(o.authoritative!==true)throw new Error('REGULATORY_OFFICIAL_AUTHORITY_INVALID');
  const official=Object.freeze({scope:scope(o.scope),sourceWorkspaceId:o.sourceWorkspaceId===null?null:uuid(o.sourceWorkspaceId,'SOURCE_WORKSPACE_ID'),kind:kind(o.kind),jurisdiction:text(o.jurisdiction,'JURISDICTION'),issuer:text(o.issuer,'ISSUER'),referenceCode:text(o.referenceCode,'REFERENCE_CODE'),versionId:uuid(o.versionId,'VERSION_ID'),revision:revision(o.revision),titleAr:text(o.titleAr,'TITLE'),publicationDate:date(o.publicationDate,'PUBLICATION_DATE'),effectiveFrom:date(o.effectiveFrom,'EFFECTIVE_FROM'),effectiveTo:o.effectiveTo===null?null:date(o.effectiveTo,'EFFECTIVE_TO'),supersedesVersionId:o.supersedesVersionId===null?null:uuid(o.supersedesVersionId,'SUPERSEDES_VERSION_ID'),sourceLocator:text(o.sourceLocator,'LOCATOR'),publisher:text(o.publisher,'PUBLISHER'),sourceUrl:text(o.sourceUrl,'SOURCE_URL'),retrievedOn:date(o.retrievedOn,'RETRIEVED_ON'),sourceHash:text(o.sourceHash,'SOURCE_HASH'),officialText:text(o.officialText,'OFFICIAL_TEXT'),authoritative:true as const});
  return Object.freeze({sourceId,workspaceId,asOf,configured:true,official,derivedArtifacts:Object.freeze(r.derivedArtifacts.map(parseArtifact))});
}

export function createRegulatoryKnowledgeGateway(client:EnjazSupabaseClient):RegulatoryKnowledgeGateway{
  const rpc=client as unknown as RpcClient;
  return Object.freeze({
    async search(input){
      if(!UUID.test(input.workspaceId))throw new Error('Invalid workspace id');
      const query=(input.query??'').normalize('NFKC').trim();if(query.length>160)throw new Error('Search query is too long');
      const limit=input.limit??30;if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new Error('Invalid search limit');
      const response=await rpc.rpc('search_regulatory_knowledge_v1',{p_workspace_id:input.workspaceId,p_query:query||null,p_kind:input.kind??null,p_scope:input.scope??null,p_as_of:input.asOf??null,p_limit:limit});rpcError(response);
      const root=record(response.data);if(root.schema!=='enjaz.regulatory-knowledge.search.v1'||!Array.isArray(root.items))throw new Error('REGULATORY_SEARCH_RESPONSE_INVALID');
      return Object.freeze(root.items.map(parseSearchItem));
    },
    async getEntry(input){
      if(!UUID.test(input.workspaceId)||!UUID.test(input.sourceId))throw new Error('Invalid regulatory identity');
      const response=await rpc.rpc('get_regulatory_knowledge_entry_v1',{p_workspace_id:input.workspaceId,p_source_id:input.sourceId,p_as_of:input.asOf??null});rpcError(response);return parseEntry(response.data);
    },
  });
}
