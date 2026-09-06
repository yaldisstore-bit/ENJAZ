import type { RowOf } from '../../data/contracts/dataTypes.ts';

export type ContactListFilter = 'all'|'active'|'inactive'|'lawyers';
export type ContactListSort = 'activity-desc'|'name-asc';
export const CONTACT_LIST_PAGE_SIZE = 20;
export const CONTACT_LIST_MAX_PAGE_SIZE = 50;
export const CONTACT_SEARCH_MAX_LENGTH = 160;
export interface ContactListRequest { readonly filter: ContactListFilter; readonly search: string; readonly sort: ContactListSort; readonly page: number; readonly pageSize: number; }
export interface ContactListSource { readonly contacts: readonly RowOf<'contacts'>[]; }
export interface ContactListItem { readonly id:string; readonly displayName:string; readonly contactType:string; readonly merged:boolean; }
export interface ContactListSnapshot { readonly items:readonly ContactListItem[]; readonly counts:Readonly<{all:number;active:number;lawyers:number}>; readonly filteredTotal:number; readonly page:number; readonly pageCount:number; readonly hasPrevious:boolean; readonly hasMore:boolean; }
export interface ContactDraft { readonly displayName:string; readonly contactType:string; readonly phone:string; readonly email:string; readonly notes:string; readonly status:'active'|'inactive'; }
export type ContactDraftField=keyof ContactDraft;
export type ContactDraftErrors=Readonly<Partial<Record<ContactDraftField|'form',string>>>;
export interface ValidatedContactDraft { readonly displayName:string; readonly contactType:string; readonly phone:string|null; readonly email:string|null; readonly notes:string|null; readonly status:'active'|'inactive'; }

const norm=(v:string)=>v.normalize('NFKD').replace(/\p{M}/gu,'').replace(/ى/g,'ي').toLowerCase().replace(/\s+/g,' ').trim();
export const normalizeContactSearch=(v:string)=>norm(v).slice(0,CONTACT_SEARCH_MAX_LENGTH);
export const isLawyerContactType=(v:string)=>/(lawyer|attorney|محام)/.test(norm(v));
const active=(r:RowOf<'contacts'>)=>r.merged_into_id===null&&r.status.trim().toLowerCase()==='active';
const stamp=(v:string)=>{const n=Date.parse(v);return Number.isFinite(n)?n:0};
export function normalizeContactListRequest(x:Partial<ContactListRequest>={}):ContactListRequest { const page=Number.isSafeInteger(x.page)&&(x.page??0)>=0?x.page!:0, size=Number.isSafeInteger(x.pageSize)?Number(x.pageSize):CONTACT_LIST_PAGE_SIZE; return {filter:x.filter==='active'||x.filter==='inactive'||x.filter==='lawyers'?x.filter:'all',search:normalizeContactSearch(x.search??''),sort:x.sort==='name-asc'?'name-asc':'activity-desc',page,pageSize:Math.min(CONTACT_LIST_MAX_PAGE_SIZE,Math.max(1,size))}; }
export function buildContactListSnapshot(source:ContactListSource,input:Partial<ContactListRequest>={}):ContactListSnapshot {
 const q=normalizeContactListRequest(input), rows=source.contacts.filter(r=>r.deleted_at===null), activeCount=rows.filter(active).length, lawyers=rows.filter(r=>isLawyerContactType(r.contact_type)).length;
 const filtered=rows.filter(r=>q.filter==='all'||q.filter==='active'&&active(r)||q.filter==='inactive'&&!active(r)||q.filter==='lawyers'&&isLawyerContactType(r.contact_type)).filter(r=>!q.search||q.search.split(' ').every(t=>norm(`${r.id} ${r.legacy_id??''} ${r.display_name} ${r.contact_type} ${r.phone??''} ${r.email??''} ${r.notes??''} ${r.status}`).includes(t))).sort((a,b)=>q.sort==='name-asc'?a.display_name.localeCompare(b.display_name,'ar')||a.id.localeCompare(b.id):stamp(b.updated_at)-stamp(a.updated_at)||a.id.localeCompare(b.id));
 const pageCount=Math.max(1,Math.ceil(filtered.length/q.pageSize)),page=Math.min(q.page,pageCount-1),items=filtered.slice(page*q.pageSize,(page+1)*q.pageSize).map(r=>({id:r.id,displayName:r.display_name.trim()||'جهة بلا اسم',contactType:r.contact_type,merged:r.merged_into_id!==null}));
 return {items,counts:{all:rows.length,active:activeCount,lawyers},filteredTotal:filtered.length,page,pageCount,hasPrevious:page>0,hasMore:page+1<pageCount};
}
const text=(v:string)=>v.trim()||null;
export const createContactDraft=(r?:RowOf<'contacts'>|null):ContactDraft=>({displayName:r?.display_name??'',contactType:r?.contact_type??'contact',phone:r?.phone??'',email:r?.email??'',notes:r?.notes??'',status:r?.status.trim().toLowerCase()==='inactive'?'inactive':'active'});
export const updateContactDraft=(d:ContactDraft,f:ContactDraftField,v:string):ContactDraft=>({...d,[f]:f==='status'&&v!=='inactive'?'active':v} as ContactDraft);
export function validateContactDraft(d:ContactDraft):Readonly<{value:ValidatedContactDraft|null;errors:ContactDraftErrors}>{const errors:Partial<Record<ContactDraftField|'form',string>>={},displayName=d.displayName.trim(),contactType=d.contactType.trim(),email=d.email.trim();if(!displayName||displayName.length>200)errors.displayName='اسم غير صالح.';if(!contactType||contactType.length>100)errors.contactType='صفة غير صالحة.';if(d.phone.trim().length>80)errors.phone='الهاتف طويل.';if(email.length>254||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email='البريد غير صالح.';if(d.notes.trim().length>2000)errors.notes='الملاحظات طويلة.';return Object.keys(errors).length?{value:null,errors}:{value:{displayName,contactType,phone:text(d.phone),email:text(d.email),notes:text(d.notes),status:d.status},errors};}
