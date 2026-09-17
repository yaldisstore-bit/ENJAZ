import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';

export type UnifiedCalendarView='day'|'week'|'month'|'agenda';
export type UnifiedCalendarAuthority='all'|'appointment'|'renewal'|'workflow_deadline';
export type UnifiedCalendarSource=Exclude<UnifiedCalendarAuthority,'all'>;
export type UnifiedCalendarAttentionState='upcoming'|'due_today'|'overdue'|'terminal';
export type UnifiedCalendarItem=Readonly<{
 id:string;source:UnifiedCalendarSource;authority:string;title:string;startsAt:string|null;endsAt:string|null;dueDate:string|null;status:string;attentionState:UnifiedCalendarAttentionState;
 transactionId:string|null;companyId:string|null;companyLabel:string|null;staffMemberIds:readonly string[];confirmationStatus:string|null;attendanceOutcome:string|null;
}>;
export type UnifiedCalendarSnapshot=Readonly<{
 workspaceTimezone:string;view:UnifiedCalendarView;anchorDate:string;businessToday:string;businessStartDate:string;businessEndDate:string;generatedAt:string;items:readonly UnifiedCalendarItem[];
}>;
export type UnifiedCalendarQuery=Readonly<{workspaceId:string;anchorDate?:string|null;view:UnifiedCalendarView;authority?:UnifiedCalendarAuthority;staffMemberId?:string|null;companyId?:string|null;transactionId?:string|null;limit?:number}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,DATE=/^\d{4}-\d{2}-\d{2}$/;
const VIEWS:readonly UnifiedCalendarView[]=['day','week','month','agenda'],SOURCES:readonly UnifiedCalendarSource[]=['appointment','renewal','workflow_deadline'],ATTENTION:readonly UnifiedCalendarAttentionState[]=['upcoming','due_today','overdue','terminal'];
type Rec=Readonly<Record<string,unknown>>;
function record(value:unknown):Rec{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid unified calendar response');return value as Rec}
function text(value:unknown,max=4000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid unified calendar response');return value}
function maybeText(value:unknown,max=4000){return value==null?null:text(value,max)}
function id(value:unknown){const v=text(value,80);if(!UUID.test(v))throw new Error('Invalid unified calendar response');return v.toLowerCase()}
function maybeId(value:unknown){return value==null?null:id(value)}
function day(value:unknown){const v=text(value,10);if(!DATE.test(v))throw new Error('Invalid unified calendar response');return v}
function maybeDay(value:unknown){return value==null?null:day(value)}
function instant(value:unknown){const v=text(value,80);if(!Number.isFinite(Date.parse(v)))throw new Error('Invalid unified calendar response');return v}
function maybeInstant(value:unknown){return value==null?null:instant(value)}
function one<T extends string>(value:unknown,allowed:readonly T[]):T{const v=text(value,80) as T;if(!allowed.includes(v))throw new Error('Invalid unified calendar response');return v}
function parseItem(value:unknown):UnifiedCalendarItem{const r=record(value);if(!Array.isArray(r.staffMemberIds))throw new Error('Invalid unified calendar response');return Object.freeze({
 id:id(r.id),source:one(r.source,SOURCES),authority:text(r.authority,80),title:text(r.title,320),startsAt:maybeInstant(r.startsAt),endsAt:maybeInstant(r.endsAt),dueDate:maybeDay(r.dueDate),status:text(r.status,80),attentionState:one(r.attentionState,ATTENTION),
 transactionId:maybeId(r.transactionId),companyId:maybeId(r.companyId),companyLabel:maybeText(r.companyLabel,320),staffMemberIds:Object.freeze(r.staffMemberIds.map(id)),confirmationStatus:maybeText(r.confirmationStatus,80),attendanceOutcome:maybeText(r.attendanceOutcome,80),
})}

export function parseUnifiedCalendarSnapshot(value:unknown):UnifiedCalendarSnapshot{const r=record(value);if(r.schema!=='enjaz.unified-calendar.v2'||!Array.isArray(r.items))throw new Error('Invalid unified calendar schema');return Object.freeze({
 workspaceTimezone:text(r.workspaceTimezone,120),view:one(r.view,VIEWS),anchorDate:day(r.anchorDate),businessToday:day(r.businessToday),businessStartDate:day(r.businessStartDate),businessEndDate:day(r.businessEndDate),generatedAt:instant(r.generatedAt),items:Object.freeze(r.items.map(parseItem)),
})}

export async function loadUnifiedCalendar(factory:EnjazDataLayerFactory,input:UnifiedCalendarQuery):Promise<UnifiedCalendarSnapshot>{if(!factory.rpc)throw new Error('Unified calendar RPC is unavailable');const result=await factory.rpc('list_unified_calendar_v2',{
 p_workspace_id:input.workspaceId,p_anchor_date:input.anchorDate??null,p_view:input.view,p_authority:input.authority??'all',p_staff_member_id:input.staffMemberId??null,p_company_id:input.companyId??null,p_transaction_id:input.transactionId??null,p_limit:input.limit??500,
});if(result.error)throw new Error('تعذر تحميل التقويم الموحد');return parseUnifiedCalendarSnapshot(result.data)}

function shiftDay(value:string,delta:number){if(!DATE.test(value))throw new Error('Invalid calendar date');const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)}
export function shiftUnifiedCalendarAnchor(anchor:string,view:UnifiedCalendarView,direction:-1|1):string{if(view==='day')return shiftDay(anchor,direction);if(view==='week')return shiftDay(anchor,7*direction);if(view==='agenda')return shiftDay(anchor,90*direction);if(!DATE.test(anchor))throw new Error('Invalid calendar date');const d=new Date(`${anchor.slice(0,7)}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,10)}
function esc(value:string){return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')}
function stamp(value:string){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
export function buildUnifiedCalendarIcs(snapshot:UnifiedCalendarSnapshot):string{const out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ENJAZ//Unified Calendar Export//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-TIMEZONE:${esc(snapshot.workspaceTimezone)}`];for(const item of snapshot.items){out.push('BEGIN:VEVENT',`UID:${item.source}-${item.id}@enjaz.local`,`DTSTAMP:${stamp(snapshot.generatedAt)}`,`SUMMARY:${esc(item.title)}`,`X-ENJAZ-AUTHORITY:${item.authority}`);if(item.startsAt){out.push(`DTSTART:${stamp(item.startsAt)}`);if(item.endsAt)out.push(`DTEND:${stamp(item.endsAt)}`)}else if(item.dueDate)out.push(`DTSTART;VALUE=DATE:${item.dueDate.replaceAll('-','')}`,`DTEND;VALUE=DATE:${shiftDay(item.dueDate,1).replaceAll('-','')}`);if(item.companyLabel)out.push(`DESCRIPTION:${esc(item.companyLabel)}`);out.push('END:VEVENT')}out.push('END:VCALENDAR');return `${out.join('\r\n')}\r\n`}
