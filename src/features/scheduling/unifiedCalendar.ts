import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';

export type UnifiedCalendarView='day'|'week'|'month'|'agenda';
export type UnifiedCalendarAuthority='all'|'appointment'|'renewal'|'workflow_deadline';
export type UnifiedCalendarSource=Exclude<UnifiedCalendarAuthority,'all'>;
export type UnifiedCalendarAttentionState='upcoming'|'due_today'|'overdue'|'terminal';
export type UnifiedCalendarItem=Readonly<{id:string;source:UnifiedCalendarSource;authority:string;title:string;startsAt:string|null;endsAt:string|null;dueDate:string|null;status:string;attentionState:UnifiedCalendarAttentionState;transactionId:string|null;companyId:string|null;companyLabel:string|null;staffMemberIds:readonly string[];confirmationStatus:string|null;attendanceOutcome:string|null}>;
export type UnifiedCalendarSnapshot=Readonly<{workspaceTimezone:string;view:UnifiedCalendarView;anchorDate:string;businessToday:string;businessStartDate:string;businessEndDate:string;generatedAt:string;items:readonly UnifiedCalendarItem[]}>;
export type UnifiedCalendarQuery=Readonly<{workspaceId:string;anchorDate?:string|null;view:UnifiedCalendarView;authority?:UnifiedCalendarAuthority;staffMemberId?:string|null;companyId?:string|null;transactionId?:string|null;limit?:number}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,DATE=/^\d{4}-\d{2}-\d{2}$/,VIEWS:readonly UnifiedCalendarView[]=['day','week','month','agenda'],SOURCES:readonly UnifiedCalendarSource[]=['appointment','renewal','workflow_deadline'],ATTENTION:readonly UnifiedCalendarAttentionState[]=['upcoming','due_today','overdue','terminal'];
type Rec=Readonly<Record<string,unknown>>;
const fail=():never=>{throw Error('Invalid unified calendar response')};
function record(v:unknown):Rec{return !v||typeof v!=='object'||Array.isArray(v)?fail():v as Rec}
function text(v:unknown,max=4000){return typeof v==='string'&&!!v.trim()&&v.length<=max?v:fail()}
function maybeText(v:unknown,max=4000){return v==null?null:text(v,max)}
function id(v:unknown){const x=text(v,80);return UUID.test(x)?x:fail()}
function maybeId(v:unknown){return v==null?null:id(v)}
function day(v:unknown){const x=text(v,10);return DATE.test(x)?x:fail()}
function maybeDay(v:unknown){return v==null?null:day(v)}
function instant(v:unknown){const x=text(v,80);return Number.isFinite(Date.parse(x))?x:fail()}
function maybeInstant(v:unknown){return v==null?null:instant(v)}
function one<T extends string>(v:unknown,a:readonly T[]):T{const x=text(v,80) as T;return a.includes(x)?x:fail()}
function parseItem(value:unknown):UnifiedCalendarItem{const r=record(value),staff=r.staffMemberIds;if(!Array.isArray(staff))fail();id(r.id);one(r.source,SOURCES);text(r.authority,80);text(r.title,320);maybeInstant(r.startsAt);maybeInstant(r.endsAt);maybeDay(r.dueDate);text(r.status,80);one(r.attentionState,ATTENTION);maybeId(r.transactionId);maybeId(r.companyId);maybeText(r.companyLabel,320);staff.forEach(id);maybeText(r.confirmationStatus,80);maybeText(r.attendanceOutcome,80);Object.freeze(staff);return Object.freeze(r) as unknown as UnifiedCalendarItem}

export function parseUnifiedCalendarSnapshot(value:unknown):UnifiedCalendarSnapshot{const r=record(value);if(r.schema!=='enjaz.unified-calendar.v2'||!Array.isArray(r.items))fail();text(r.workspaceTimezone,120);one(r.view,VIEWS);day(r.anchorDate);day(r.businessToday);day(r.businessStartDate);day(r.businessEndDate);instant(r.generatedAt);return Object.freeze({...r,items:Object.freeze(r.items.map(parseItem))}) as unknown as UnifiedCalendarSnapshot}

export async function loadUnifiedCalendar(factory:EnjazDataLayerFactory,input:UnifiedCalendarQuery):Promise<UnifiedCalendarSnapshot>{if(!factory.rpc)fail();const result=await factory.rpc('list_unified_calendar_v2',{p_workspace_id:input.workspaceId,p_anchor_date:input.anchorDate??null,p_view:input.view,p_authority:input.authority??'all',p_staff_member_id:input.staffMemberId??null,p_company_id:input.companyId??null,p_transaction_id:input.transactionId??null,p_limit:input.limit??500});if(result.error)fail();return parseUnifiedCalendarSnapshot(result.data)}

function shiftDay(value:string,delta:number){if(!DATE.test(value))fail();const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
export function shiftUnifiedCalendarAnchor(anchor:string,view:UnifiedCalendarView,direction:-1|1):string{if(view!=='month')return shiftDay(anchor,(view==='day'?1:view==='week'?7:90)*direction);if(!DATE.test(anchor))fail();const d=new Date(`${anchor.slice(0,7)}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,10)}
const esc=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'),stamp=(v:string)=>`${new Date(v).toISOString().replace(/\D/g,'').slice(0,14)}Z`;
export function buildUnifiedCalendarIcs(snapshot:UnifiedCalendarSnapshot):string{const out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ENJAZ//Unified Calendar Export//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-TIMEZONE:${esc(snapshot.workspaceTimezone)}`],generated=stamp(snapshot.generatedAt);for(const item of snapshot.items){out.push('BEGIN:VEVENT',`UID:${item.source}-${item.id}@enjaz.local`,`DTSTAMP:${generated}`,`SUMMARY:${esc(item.title)}`,`X-ENJAZ-AUTHORITY:${item.authority}`);if(item.startsAt){out.push(`DTSTART:${stamp(item.startsAt)}`);if(item.endsAt)out.push(`DTEND:${stamp(item.endsAt)}`)}else if(item.dueDate)out.push(`DTSTART;VALUE=DATE:${item.dueDate.replaceAll('-','')}`,`DTEND;VALUE=DATE:${shiftDay(item.dueDate,1).replaceAll('-','')}`);if(item.companyLabel)out.push(`DESCRIPTION:${esc(item.companyLabel)}`);out.push('END:VEVENT')}out.push('END:VCALENDAR');return `${out.join('\r\n')}\r\n`}
