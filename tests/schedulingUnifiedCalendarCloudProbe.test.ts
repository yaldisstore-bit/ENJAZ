import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const probe=fs.readFileSync(new URL('../database/migrations/phase_11_5_live_unified_calendar_read_probe.sql',import.meta.url),'utf8');

test('D cloud probe exercises authenticated unified sources and outbound-only export boundary',()=>{
  for(const marker of [
    'set local role authenticated',
    'public.get_scheduling_calendar_v1',
    'P115D_UNIFIED_SOURCE_COUNT_FAIL',
    'P115D_UNIFIED_SOURCE_KIND_FAIL',
    "x->>'sourceKind'='appointment'",
    "x->>'sourceKind'='workflow_deadline'",
    "x->>'sourceKind'='renewal_occurrence'",
    'P115D_EXPORT_BOUNDARY_FAIL',
    "'outbound_projection_only'",
    'P115D_STAFF_SCOPE_INFERENCE_FAIL',
    'P115D_COMPANY_SCOPE_FAIL',
    'P115D_AUTHORITY_SCOPE_FAIL',
  ]) assert.ok(probe.includes(marker),`missing authenticated cloud-probe marker: ${marker}`);
});

test('D cloud probe fails closed for workspace, cross-workspace staff, oversized windows and anon execution',()=>{
  for(const marker of [
    'P115D_CROSS_WORKSPACE_STAFF_ACCEPTED',
    'ENJAZ_SCHEDULING_CALENDAR_STAFF_OUT_OF_SCOPE',
    'P115D_NON_MEMBER_WORKSPACE_ACCEPTED',
    'ENJAZ_SCHEDULING_WORKSPACE_FORBIDDEN',
    'P115D_OVERSIZED_WINDOW_ACCEPTED',
    'ENJAZ_SCHEDULING_CALENDAR_WINDOW_INVALID',
    'set local role anon',
    'P115D_ANON_EXECUTE_ACCEPTED',
  ]) assert.ok(probe.includes(marker),`missing fail-closed cloud-probe marker: ${marker}`);
});

test('D cloud probe cleans every canonical fixture family it creates',()=>{
  for(const marker of [
    'delete from public.renewal_occurrences',
    'delete from public.renewals',
    'delete from public.workflow_deadline_evidence',
    'delete from public.workflow_stage_states',
    'delete from public.workflow_instances',
    'delete from public.calendar_event_staff_assignments',
    'delete from public.calendar_events',
    'delete from public.organization_members',
    'delete from public.transactions',
    'delete from public.companies',
    'delete from public.workspace_memberships',
    'delete from public.workspaces',
    'P115D_ZERO_RESIDUE_FAIL',
  ]) assert.ok(probe.includes(marker),`missing zero-residue marker: ${marker}`);
});
