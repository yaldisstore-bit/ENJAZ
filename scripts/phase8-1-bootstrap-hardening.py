from pathlib import Path


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 literal match, got {count}")
    return text.replace(old, new, 1)


migration_path = Path("database/migrations/phase_8_1_workflow_government_procedure_os.sql")
sql = migration_path.read_text()

sql = once(sql, "official_fee numeric(18,2),", "official_fee numeric,", "official fee raw precision")
sql = once(
    sql,
    "add constraint workflow_template_stages_official_fee_exact check (official_fee is null or (official_fee >= 0 and official_fee = round(official_fee, 2))),",
    "add constraint workflow_template_stages_official_fee_exact check (official_fee is null or (official_fee >= 0 and official_fee <= 9999999999999999.99 and official_fee = trunc(official_fee, 2))),",
    "official fee fail-closed check",
)
sql = once(
    sql,
    "constraint workflow_template_transitions_key_unique unique (workspace_id, workflow_template_id, transition_key)",
    "constraint workflow_template_transitions_key_unique unique (workspace_id, workflow_template_id, from_stage_position, transition_key)",
    "stage scoped transition key",
)

cycle_trigger = """create trigger government_procedure_prerequisites_cycle_guard
before insert or update on public.government_procedure_prerequisites
for each row execute function private.guard_government_procedure_prerequisite_cycle();
"""
branch_guard = cycle_trigger + """

create or replace function private.guard_government_procedure_branch_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_procedure_entity uuid;
  v_branch_entity uuid;
begin
  select gp.government_entity_id into v_procedure_entity
  from public.government_procedures gp
  where gp.workspace_id = new.workspace_id and gp.id = new.procedure_id;
  select b.government_entity_id into v_branch_entity
  from public.government_entity_branches b
  where b.workspace_id = new.workspace_id and b.id = new.branch_id;
  if v_procedure_entity is not null and v_branch_entity is not null and v_procedure_entity <> v_branch_entity then
    raise check_violation using message = 'ENJAZ_PROCEDURE_BRANCH_ENTITY_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_government_procedure_branch_entity() from public;
create trigger government_procedure_branches_entity_guard
before insert or update on public.government_procedure_branches
for each row execute function private.guard_government_procedure_branch_entity();
"""
sql = once(sql, cycle_trigger, branch_guard, "branch entity guard")

branch_marker = "  if p_branch_id is not null and not exists (\n"
branch_required = """  if p_branch_id is null and exists (
    select 1 from public.government_procedure_branches pb
    where pb.workspace_id=p_workspace_id and pb.procedure_id=p_procedure_id and pb.active
  ) then raise invalid_parameter_value using message='ENJAZ_PROCEDURE_BRANCH_REQUIRED'; end if;
""" + branch_marker
sql = once(sql, branch_marker, branch_required, "branch required guard")

procedure_found = "  if not found then raise invalid_parameter_value using message='ENJAZ_PROCEDURE_UNAVAILABLE'; end if;\n"
prerequisite_guard = procedure_found + """  if exists (
    select 1
    from public.government_procedure_prerequisites pp
    where pp.workspace_id=p_workspace_id and pp.procedure_id=p_procedure_id and pp.required
      and not exists (
        select 1 from public.workflow_instances prior
        where prior.workspace_id=p_workspace_id
          and prior.transaction_id=p_transaction_id
          and prior.government_procedure_id=pp.prerequisite_procedure_id
          and prior.status='completed'
      )
  ) then raise check_violation using message='ENJAZ_PROCEDURE_PREREQUISITE_INCOMPLETE'; end if;
"""
sql = once(sql, procedure_found, prerequisite_guard, "prerequisite runtime enforcement")

sql = once(
    sql,
    "  v_template public.workflow_templates%rowtype; v_existing public.workflow_instances%rowtype;\n",
    "  v_template public.workflow_templates%rowtype; v_existing public.workflow_instances%rowtype; v_start_event public.workflow_transition_events%rowtype;\n",
    "start event declaration",
)

start_return = "      return jsonb_build_object('instanceId',v_existing.id,'transactionId',v_existing.transaction_id,'procedureId',v_existing.government_procedure_id,'branchId',v_existing.government_branch_id,'currentStagePosition',v_existing.current_stage_position,'status',v_existing.status,'templateSnapshot',v_existing.template_snapshot,'wasDuplicate',true);"
stable_start_return = """      select * into v_start_event from public.workflow_transition_events e
      where e.workspace_id=p_workspace_id and e.idempotency_key=p_idempotency_key and e.event_kind='start' limit 1;
      if not found or jsonb_typeof(v_start_event.snapshot->'result') <> 'object' then
        raise data_exception using message='ENJAZ_WORKFLOW_IDEMPOTENCY_EVIDENCE_MISSING';
      end if;
      return (v_start_event.snapshot->'result') || jsonb_build_object('wasDuplicate',true);"""
sql = once(sql, start_return, stable_start_return, "stable start replay")

start_event = "    values(p_workspace_id,v_instance.id,p_idempotency_key,'start','start',null,v_first_stage,v_actor,jsonb_build_object('procedureId',p_procedure_id,'transactionId',p_transaction_id,'branchId',p_branch_id,'workflowTemplateId',v_template.id,'templateVersion',v_template.version));"
start_event_hardened = """    values(p_workspace_id,v_instance.id,p_idempotency_key,'start','start',null,v_first_stage,v_actor,jsonb_build_object(
      'procedureId',p_procedure_id,'transactionId',p_transaction_id,'branchId',p_branch_id,'workflowTemplateId',v_template.id,'templateVersion',v_template.version,
      'result',jsonb_build_object('instanceId',v_instance.id,'transactionId',v_instance.transaction_id,'procedureId',v_instance.government_procedure_id,
        'branchId',v_instance.government_branch_id,'currentStagePosition',v_first_stage,'status','active','templateSnapshot',v_snapshot)
    ));"""
sql = once(sql, start_event, start_event_hardened, "immutable start result evidence")

sql = once(
    sql,
    "    if v_existing_event.workflow_instance_id=p_workflow_instance_id and v_existing_event.transition_key=p_transition_key then",
    "    if v_existing_event.workflow_instance_id=p_workflow_instance_id and v_existing_event.transition_key=p_transition_key and v_existing_event.from_stage_position=p_expected_stage_position and v_existing_event.reason is not distinct from v_reason then",
    "transition idempotency payload guard",
)
sql = once(
    sql,
    "      return jsonb_build_object('instanceId',v_instance.id,'transitionEventId',v_existing_event.id,'transitionKey',v_existing_event.transition_key,'eventKind',v_existing_event.event_kind,'fromStagePosition',v_existing_event.from_stage_position,'toStagePosition',v_existing_event.to_stage_position,'currentStagePosition',v_instance.current_stage_position,'status',v_instance.status,'wasDuplicate',true);",
    "      return jsonb_build_object('instanceId',v_instance.id,'transitionEventId',v_existing_event.id,'transitionKey',v_existing_event.transition_key,'eventKind',v_existing_event.event_kind,'fromStagePosition',v_existing_event.from_stage_position,'toStagePosition',v_existing_event.to_stage_position,'currentStagePosition',(v_existing_event.snapshot->>'resultStagePosition')::integer,'status',v_existing_event.snapshot->>'resultStatus','wasDuplicate',true);",
    "stable transition replay",
)

sql = once(
    sql,
    "  if not found or v_instance.status<>'active' then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_INSTANCE_NOT_ACTIVE'; end if;",
    "  if not found or v_instance.status not in ('active','completed') then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_INSTANCE_NOT_TRANSITIONABLE'; end if;",
    "completed reopen eligibility",
)
transition_found = "  if not found then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_TRANSITION_NOT_ALLOWED'; end if;\n"
reopen_guards = transition_found + """  if v_instance.status='completed' and v_transition.transition_kind<>'reopen' then raise invalid_parameter_value using message='ENJAZ_WORKFLOW_COMPLETED_REOPEN_ONLY'; end if;
  if v_transition.transition_kind='reopen' and exists (
    select 1 from public.workflow_instances other
    where other.workspace_id=p_workspace_id and other.transaction_id=v_instance.transaction_id
      and other.status='active' and other.id<>v_instance.id
  ) then raise unique_violation using message='ENJAZ_WORKFLOW_REOPEN_ACTIVE_CONFLICT'; end if;
"""
sql = once(sql, transition_found, reopen_guards, "reopen safety guards")
migration_path.write_text(sql)

audit_path = Path("scripts/phase8-1-workflow-government-procedure-audit.mjs")
audit = audit_path.read_text()
audit_marker = "  'ENJAZ_PROCEDURE_PREREQUISITE_CYCLE',\n"
audit = once(
    audit,
    audit_marker,
    audit_marker
    + "  'ENJAZ_PROCEDURE_PREREQUISITE_INCOMPLETE',\n"
    + "  'ENJAZ_PROCEDURE_BRANCH_ENTITY_MISMATCH',\n"
    + "  'ENJAZ_PROCEDURE_BRANCH_REQUIRED',\n"
    + "  'ENJAZ_WORKFLOW_REOPEN_ACTIVE_CONFLICT',\n"
    + "  'trunc(official_fee, 2)',\n",
    "audit hardening",
)
audit_path.write_text(audit)

package_path = Path("package.json")
package = package_path.read_text()
package = once(
    package,
    "tests/financeDestructionGate.test.ts tests/unhandled.test.ts",
    "tests/financeDestructionGate.test.ts tests/workflowGovernmentProcedure.test.ts tests/unhandled.test.ts",
    "functional integration",
)
package = once(
    package,
    '    "test:phase7-5": "node --experimental-strip-types --test tests/financeCommands.test.ts tests/financeService.test.ts tests/financeModel.test.ts tests/financeIntelligence.test.ts tests/financeReports.test.ts tests/financeDestructionGate.test.ts",',
    '    "test:phase7-5": "node --experimental-strip-types --test tests/financeCommands.test.ts tests/financeService.test.ts tests/financeModel.test.ts tests/financeIntelligence.test.ts tests/financeReports.test.ts tests/financeDestructionGate.test.ts",\n    "test:phase8-1": "node --experimental-strip-types --test tests/workflowGovernmentProcedure.test.ts",',
    "phase81 test script",
)
package = once(
    package,
    '    "audit:phase7-5:finance-destruction": "node scripts/phase7-5-finance-destruction-audit.mjs",',
    '    "audit:phase7-5:finance-destruction": "node scripts/phase7-5-finance-destruction-audit.mjs",\n    "audit:phase8-1:workflow-government-procedure": "node scripts/phase8-1-workflow-government-procedure-audit.mjs",',
    "phase81 audit script",
)
package = once(
    package,
    "npm run audit:phase7-5:finance-destruction && npm run test:phase5-2",
    "npm run audit:phase7-5:finance-destruction && npm run audit:phase8-1:workflow-government-procedure && npm run test:phase5-2",
    "extreme audit integration",
)
package = once(
    package,
    "npm run test:phase7-5 && npm run test:functional",
    "npm run test:phase7-5 && npm run test:phase8-1 && npm run test:functional",
    "extreme test integration",
)
package_path.write_text(package)

Path(".github/workflows/phase8-1-workflow-government-procedure.yml").write_text("""name: ENJAZ Phase 8.1 — Workflow Engine & Government Procedure OS — M1

on:
  push:
    branches:
      - main
      - 'phase8-1-*'
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  phase8-1-workflow-government-procedure:
    name: Canonical workflow / M1 government procedure gate
    runs-on: ubuntu-latest
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: npm
          cache-dependency-path: package-lock.json
      - uses: actions/setup-python@v7
        with:
          python-version: '3.12'
      - run: npm ci --no-audit --no-fund
      - name: Preserve closed Phase 7.5
        run: npm run audit:phase7-5:finance-destruction && npm run test:phase7-5
      - name: Enforce Phase 8.1 contract
        run: npm run audit:phase8-1:workflow-government-procedure
      - name: Phase 8.1 command tests
        run: npm run test:phase8-1
      - name: Full functional regression
        run: npm run test:functional
      - name: Database and roadmap integrity
        run: npm run db:audit && npm run db:audit:selftest && npm run audit:roadmap
      - name: Secrets and TypeScript
        run: npm run audit:secrets && npm run typecheck
      - name: Production build and hard budget
        run: npm run build -- --base=/ && npm run audit:dist:budget
""")

for temporary in [
    ".github/workflows/phase8-1-bootstrap-patcher.yml",
    ".github/workflows/phase8-1-bootstrap-patcher-v2.yml",
    ".github/workflows/phase8-1-bootstrap-patcher-v3.yml",
    ".github/workflows/phase8-1-bootstrap-patcher-v4.yml",
    "scripts/phase8-1-bootstrap-hardening.py",
]:
    path = Path(temporary)
    if path.exists():
        path.unlink()
