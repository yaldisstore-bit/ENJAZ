import type { EnjazDataLayerFactory } from '../../data/createDataLayer.ts';

export type UnifiedCalendarView = 'day' | 'week' | 'month' | 'agenda';
export type UnifiedCalendarAuthority = 'all' | 'appointment' | 'renewal' | 'workflow_deadline';
export type UnifiedCalendarSource = Exclude<UnifiedCalendarAuthority, 'all'>;
export type UnifiedCalendarAttentionState = 'upcoming' | 'due_today' | 'overdue' | 'terminal';

export type UnifiedCalendarItem = Readonly<{
  id: string;
  source: UnifiedCalendarSource;
  authority: 'calendar_events' | 'renewals' | 'workflow_deadline_evidence';
  title: string;
  eventType: string;
  startsAt: string | null;
  endsAt: string | null;
  dueDate: string | null;
  status: string;
  attentionState: UnifiedCalendarAttentionState;
  transactionId: string | null;
  companyId: string | null;
  companyLabel: string | null;
  workflowInstanceId: string | null;
  staffMemberIds: readonly string[];
  confirmationStatus: string | null;
  attendanceOutcome: string | null;
  version: number | null;
  recurrenceRule: string | null;
  deadlineStageName: string | null;
  deadlineSourceFingerprint: string | null;
}>;

export type UnifiedCalendarSnapshot = Readonly<{
  workspaceId: string;
  workspaceTimezone: string;
  view: UnifiedCalendarView;
  anchorDate: string;
  businessToday: string;
  businessStartDate: string;
  businessEndDate: string;
  generatedAt: string;
  authority: UnifiedCalendarAuthority;
  staffMemberId: string | null;
  companyId: string | null;
  transactionId: string | null;
  items: readonly UnifiedCalendarItem[];
}>;

export type UnifiedCalendarQuery = Readonly<{
  workspaceId: string;
  anchorDate?: string | null;
  view: UnifiedCalendarView;
  authority?: UnifiedCalendarAuthority;
  staffMemberId?: string | null;
  companyId?: string | null;
  transactionId?: string | null;
  limit?: number;
}>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const VIEWS:readonly UnifiedCalendarView[]=['day','week','month','agenda'];
const AUTHORITIES:readonly UnifiedCalendarAuthority[]=['all','appointment','renewal','workflow_deadline'];
const SOURCES:readonly UnifiedCalendarSource[]=['appointment','renewal','workflow_deadline'];
const ATTENTION:readonly UnifiedCalendarAttentionState[]=['upcoming','due_today','overdue','terminal'];
const ITEM_AUTHORITIES=['calendar_events','renewals','workflow_deadline_evidence'] as const;

type Rec=Readonly<Record<string,unknown>>;
function rec(value:unknown):Rec{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid unified calendar response');return value as Rec}
function str(value:unknown,max=4000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Invalid unified calendar response');return value}
function nullableStr(value:unknown,max=4000){return value==null?null:str(value,max)}
function uuid(value:unknown){const v=str(value,80);if(!UUID.test(v))throw new Error('Invalid unified calendar response');return v.toLowerCase()}
function nullableUuid(value:unknown){return value==null?null:uuid(value)}
function date(value:unknown){const v=str(value,10);if(!DATE.test(v))throw new Error('Invalid unified calendar response');return v}
function nullableDate(value:unknown){return value==null?null:date(value)}
function instant(value:unknown){const v=str(value,80);if(!Number.isFinite(Date.parse(v)))throw new Error('Invalid unified calendar response');return v}
function nullableInstant(value:unknown){return value==null?null:instant(value)}
function oneOf<T extends string>(value:unknown,allowed:readonly T[]):T{const v=str(value,80) as T;if(!allowed.includes(v))throw new Error('Invalid unified calendar response');return v}
function nullableVersion(value:unknown){if(value==null)return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)throw new Error('Invalid unified calendar response');return value}
function uuidList(value:unknown){if(!Array.isArray(value))throw new Error('Invalid unified calendar response');return Object.freeze(value.map(uuid))}

function parseItem(value:unknown):UnifiedCalendarItem{
  const r=rec(value);
  return Object.freeze({
    id:uuid(r.id),source:oneOf(r.source,SOURCES),authority:oneOf(r.authority,ITEM_AUTHORITIES),title:str(r.title,320),eventType:str(r.eventType,120),
    startsAt:nullableInstant(r.startsAt),endsAt:nullableInstant(r.endsAt),dueDate:nullableDate(r.dueDate),status:str(r.status,80),
    attentionState:oneOf(r.attentionState,ATTENTION),transactionId:nullableUuid(r.transactionId),companyId:nullableUuid(r.companyId),companyLabel:nullableStr(r.companyLabel,320),
    workflowInstanceId:nullableUuid(r.workflowInstanceId),staffMemberIds:uuidList(r.staffMemberIds),confirmationStatus:nullableStr(r.confirmationStatus,80),
    attendanceOutcome:nullableStr(r.attendanceOutcome,80),version:nullableVersion(r.version),recurrenceRule:nullableStr(r.recurrenceRule,160),
    deadlineStageName:nullableStr(r.deadlineStageName,320),deadlineSourceFingerprint:nullableStr(r.deadlineSourceFingerprint,512),
  });
}

export function parseUnifiedCalendarSnapshot(value:unknown):UnifiedCalendarSnapshot{
  const r=rec(value);
  if(r.schema!=='enjaz.unified-calendar.v2')throw new Error('Invalid unified calendar schema');
  if(!Array.isArray(r.items))throw new Error('Invalid unified calendar response');
  return Object.freeze({
    workspaceId:uuid(r.workspaceId),workspaceTimezone:str(r.workspaceTimezone,120),view:oneOf(r.view,VIEWS),anchorDate:date(r.anchorDate),businessToday:date(r.businessToday),
    businessStartDate:date(r.businessStartDate),businessEndDate:date(r.businessEndDate),generatedAt:instant(r.generatedAt),authority:oneOf(r.authority,AUTHORITIES),
    staffMemberId:nullableUuid(r.staffMemberId),companyId:nullableUuid(r.companyId),transactionId:nullableUuid(r.transactionId),items:Object.freeze(r.items.map(parseItem)),
  });
}

export async function loadUnifiedCalendar(factory:EnjazDataLayerFactory,input:UnifiedCalendarQuery):Promise<UnifiedCalendarSnapshot>{
  if(!factory.rpc)throw new Error('Unified calendar RPC is unavailable');
  const result=await factory.rpc('list_unified_calendar_v2',{
    p_workspace_id:input.workspaceId,
    p_anchor_date:input.anchorDate??null,
    p_view:input.view,
    p_authority:input.authority??'all',
    p_staff_member_id:input.staffMemberId??null,
    p_company_id:input.companyId??null,
    p_transaction_id:input.transactionId??null,
    p_limit:input.limit??500,
  });
  if(result.error)throw new Error('تعذر تحميل التقويم الموحد');
  return parseUnifiedCalendarSnapshot(result.data);
}

function dateParts(value:string){const [y,m,d]=value.split('-').map(Number);if(!y||!m||!d)throw new Error('Invalid calendar date');return{y,m,d}}
function formatDate(y:number,m:number,d:number){return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function plusDays(value:string,days:number){const p=dateParts(value),dt=new Date(Date.UTC(p.y,p.m-1,p.d+days));return formatDate(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate())}
export function shiftUnifiedCalendarAnchor(anchor:string,view:UnifiedCalendarView,direction:-1|1):string{
  if(!DATE.test(anchor))throw new Error('Invalid calendar date');
  if(view==='day')return plusDays(anchor,direction);
  if(view==='week')return plusDays(anchor,7*direction);
  if(view==='agenda')return plusDays(anchor,90*direction);
  const p=dateParts(anchor),dt=new Date(Date.UTC(p.y,p.m-1+direction,1));return formatDate(dt.getUTCFullYear(),dt.getUTCMonth()+1,1);
}

function icsEscape(value:string){return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')}
function icsInstant(value:string){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
function allDayEnd(dateValue:string){return plusDays(dateValue,1).replace(/-/g,'')}
export function buildUnifiedCalendarIcs(snapshot:UnifiedCalendarSnapshot):string{
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ENJAZ//Unified Calendar Export//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-TIMEZONE:${icsEscape(snapshot.workspaceTimezone)}`];
  for(const item of snapshot.items){
    lines.push('BEGIN:VEVENT',`UID:${item.source}-${item.id}@enjaz.local`,`DTSTAMP:${icsInstant(snapshot.generatedAt)}`,`SUMMARY:${icsEscape(item.title)}`,`X-ENJAZ-AUTHORITY:${item.authority}`);
    if(item.startsAt){lines.push(`DTSTART:${icsInstant(item.startsAt)}`);if(item.endsAt)lines.push(`DTEND:${icsInstant(item.endsAt)}`)}
    else if(item.dueDate){lines.push(`DTSTART;VALUE=DATE:${item.dueDate.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${allDayEnd(item.dueDate)}`)}
    if(item.companyLabel)lines.push(`DESCRIPTION:${icsEscape(item.companyLabel)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
