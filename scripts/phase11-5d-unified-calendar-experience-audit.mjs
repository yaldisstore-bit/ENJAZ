import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=(path)=>fs.readFileSync(new URL(path,root),'utf8');
const errors=[];
const req=(value,message)=>{if(!value)errors.push(message)};
const has=(source,marker,label)=>req(source.includes(marker),`${label} missing marker: ${marker}`);

const readModel=read('database/migrations/phase_11_5_unified_calendar_read_model.sql');
const boundary=read('database/migrations/phase_11_5_unified_calendar_business_date_boundary.sql');
const gateway=read('src/features/scheduling/unifiedCalendar.ts');
const commands=read('src/features/scheduling/schedulingCommands.ts');
const time=read('src/features/scheduling/calendarTime.ts');
const ui=read('src/ui-r2/calendar/LiveUnifiedCalendarExperience.tsx');
const portal=read('src/ui-r2/calendar/LiveUnifiedCalendarProductionPortal.tsx');
const nav=read('src/ui-r2/architecture/navigation-contract.ts');
const lazy=read('src/ui-r2/runtime/LazyLiveProductionPortals.tsx');
const tests=read('tests/unifiedCalendar.test.ts');

for(const marker of [
  'private.list_unified_calendar_v1_impl',
  "'source', 'appointment'",
  "'source', 'renewal'",
  "'source', 'workflow_deadline'",
  'calendar_event_staff_assignments',
  'workflow_deadline_evidence',
  'private.require_scheduling_workspace_member_v1',
])has(readModel,marker,'unified read model');
req(!/create\s+table/i.test(readModel),'11.5-D read model must not create a shadow table');

for(const marker of [
  'private.list_unified_calendar_v2_impl',
  "v_today := (now() at time zone v_timezone)::date",
  "v_view='day'",
  "v_view='week'",
  "v_view='month'",
  "v_view='agenda'",
  'security invoker',
  'drop function public.list_unified_calendar_v1',
])has(boundary,marker,'workspace-timezone boundary');
req(!/create\s+table/i.test(boundary),'11.5-D timezone boundary must not create a shadow table');

for(const marker of [
  "factory.rpc('list_unified_calendar_v2'",
  "UnifiedCalendarView='day'|'week'|'month'|'agenda'",
  'buildUnifiedCalendarIcs',
  "'METHOD:PUBLISH'",
  'X-ENJAZ-AUTHORITY',
])has(gateway,marker,'calendar runtime gateway');
req(!/METHOD:REQUEST|METHOD:REPLY/.test(gateway),'calendar export must remain one-way publish boundary');
for(const marker of ['recordCalendarEventAttendance','checkCalendarEventStaffConflicts','rescheduleCalendarEvent'])has(commands,marker,'governed M10 write boundary');
for(const marker of ['workspaceLocalDateTimeToInstant','businessDateForInstant','Intl.DateTimeFormat','timeZone'])has(time,marker,'workspace-timezone helper');

for(const marker of [
  "['day','يوم']","['week','أسبوع']","['month','شهر']","['agenda','أجندة']",
  'navigator.onLine','data-calendar-offline="true"','buildUnifiedCalendarIcs',
  'confirmationStatus','attendanceOutcome','data-calendar-export-boundary="outbound_projection_only"',
])has(ui,marker,'unified calendar UX');
for(const forbidden of ['useSchedulingCommandGateway','recordCalendarEventAttendance','checkCalendarEventStaffConflicts','rescheduleCalendarEvent'])req(!ui.includes(forbidden),`projection-only D calendar must not duplicate governed write boundary: ${forbidden}`);
req(!ui.includes("import './calendar.css'"),'calendar must reuse frozen R2 surfaces instead of adding calendar-only CSS');
for(const marker of ["useLiveRecordsPortal('calendar'",'LiveUnifiedCalendarExperience'])has(portal,marker,'calendar production portal');
for(const marker of ["| 'calendar'","['calendar', 'التقويم والمواعيد'","['operations', 'calendar'","تقويم: 'calendar'","مواعيد: 'calendar'"])has(nav,marker,'calendar navigation');
for(const marker of ["import('../calendar/LiveUnifiedCalendarProductionPortal.tsx')","value === 'calendar'","destination === 'calendar'"])has(lazy,marker,'lazy calendar portal');
for(const marker of ['workspace local appointment time uses workspace timezone','calendar export is one-way ICS evidence','rejects malformed or downgraded calendar schemas'])has(tests,marker,'unified calendar tests');

if(errors.length){console.error(`ENJAZ PHASE 11.5-D UNIFIED CALENDAR IMPLEMENTATION FAIL (${errors.length})`);for(const error of errors)console.error(`- ${error}`);process.exitCode=1}
else console.log('ENJAZ PHASE 11.5-D UNIFIED CALENDAR IMPLEMENTATION PASS — canonical read projection, workspace-timezone boundaries, four views, governed M10 writes preserved outside D, offline state, lean browser contract, R2 surface reuse and one-way calendar export are wired.');
