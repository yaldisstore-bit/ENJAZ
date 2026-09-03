#!/usr/bin/env python3
from __future__ import annotations
import re, sys, json, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = Path(os.environ.get('ENJAZ_SCHEMA_PATH', ROOT / 'database' / 'baseline' / 'phase1_2_schema.sql'))
sql = SCHEMA.read_text(encoding='utf-8')

errors=[]
checks=[]

def ok(name, cond, detail=''):
    checks.append({'name':name,'passed':bool(cond),'detail':detail})
    if not cond:
        errors.append(f'{name}: {detail}')

# Strip SQL line comments and quoted strings for structural scans.
struct = re.sub(r'--[^\n]*', '', sql)
struct_no_strings = re.sub(r"'(?:''|[^'])*'", "''", struct)

tables = re.findall(r'(?im)^create\s+table\s+public\.([a-z0-9_]+)\s*\(', sql)
EXPECTED_TABLES = {
'profiles','workspaces','workspace_memberships','workspace_settings','contacts','companies','company_contacts','entity_lifecycle_events',
'transactions','transaction_routes','transaction_notes','transaction_followups','transaction_activity','transaction_blockers','transaction_dependencies',
'payments','payment_reversals','fee_changes','financial_ledger_entries','cashbox_accounts','documents','document_versions','document_analysis',
'document_templates','document_drafts','correspondence_registry','pdf_jobs','workflow_templates','workflow_template_stages','workflow_template_items',
'workflow_instances','workflow_stage_states','workflow_item_states','calendar_events','renewals','communications','saved_views','automation_rules',
'automation_runs','intelligence_snapshots','notification_preferences','notification_deliveries','audit_events','sync_devices','import_jobs'
}
rls = set(re.findall(r'(?im)^alter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security\s*;', sql))
policies = re.findall(r'(?im)^create\s+policy\s+([a-z0-9_]+)\s+on\s+public\.([a-z0-9_]+)', sql)
indexes = re.findall(r'(?im)^create\s+(?:unique\s+)?index\s+([a-z0-9_]+)', sql)

ok('table_count_45', len(tables)==45, f'found={len(tables)}')
ok('unique_table_names', len(set(tables))==len(tables), f'unique={len(set(tables))}')
ok('exact_table_contract', set(tables)==EXPECTED_TABLES, f'missing={sorted(EXPECTED_TABLES-set(tables))}, extra={sorted(set(tables)-EXPECTED_TABLES)}')
ok('rls_all_public_tables', set(tables)==rls, f'missing={sorted(set(tables)-rls)}, extra={sorted(rls-set(tables))}')
ok('no_money_type', not re.search(r'(?i)\bmoney\b', struct_no_strings), 'money type must not be used')
ok('numeric_finance', 'numeric(18,2)' in sql, 'expected exact numeric financial columns')
ok('no_service_role', 'service_role' not in sql.lower(), 'service_role must not appear in baseline')
ok('no_public_security_definer', not re.search(r'(?is)create\s+(?:or\s+replace\s+)?function\s+public\..*?security\s+definer', sql), 'no SECURITY DEFINER in public schema')
ok('no_broad_public_revoke', 'revoke all on all tables in schema public' not in sql.lower(), 'must not affect unrelated public tables')
ok('no_delete_grant_authenticated', not re.search(r'(?i)grant\s+[^;]*\bdelete\b[^;]*\bto\s+authenticated\b', sql), 'authenticated must not receive DELETE')
ok('no_delete_policies', not re.search(r'(?i)create\s+policy\s+\w+\s+on\s+public\.\w+\s+for\s+delete', sql), 'Phase 1.2 has no browser hard-delete policies')
ok('no_composite_set_null', not re.search(r'(?is)foreign\s+key\s*\([^)]*,[^)]*\).*?references\s+public\.\w+\s*\([^)]*,[^)]*\)\s+on\s+delete\s+set\s+null', sql), 'composite FK SET NULL is unsafe with workspace_id NOT NULL')
ok('private_helper_not_definer', 'security definer' not in sql.lower(), 'baseline helper should remain invoker')
malformed_named_constraints = re.findall(r'(?i)\bconstraint\s+[a-z0-9_]+\s*\(', struct_no_strings)
ok('named_constraints_have_type', not malformed_named_constraints, f'malformed={len(malformed_named_constraints)}')
ok('transaction_fee_positive', 'current_fee numeric(18,2) not null check (current_fee > 0)' in sql, 'transaction fee guard missing')
ok('payment_amount_positive', 'amount numeric(18,2) not null check (amount > 0)' in sql, 'payment amount guard missing')
ok('payment_receipt_unique', 'payments_receipt_unique unique (workspace_id, receipt_ref)' in sql, 'receipt uniqueness missing')
ok('payment_reversal_unique', 'payment_reversals_one_per_payment unique (workspace_id, payment_id)' in sql, 'one reversal per payment missing')
ok('one_active_workflow_index', 'workflow_one_active_per_transaction_idx' in indexes, 'active workflow uniqueness missing')
ok('automation_receipt_idempotency', 'automation_runs_receipt_unique_idx' in indexes, 'automation idempotency index missing')
ok('notification_dedupe', 'notification_dedupe_unique_idx' in indexes, 'notification dedupe index missing')
ok('workspace_membership_index', 'workspace_memberships_user_idx' in indexes, 'RLS membership lookup index missing')
ok('payment_insert_posted_only', "payments.status = 'posted'" in sql, 'payment insert policy must reject forged reversed rows')
ok('ledger_insert_posted_only', "financial_ledger_entries.status = 'posted'" in sql and 'financial_ledger_entries.reversed_at is null' in sql, 'ledger insert policy must reject forged reversals')
for tbl,field in [('entity_lifecycle_events','actor_user_id'),('transaction_activity','actor_user_id'),('payment_reversals','actor_user_id'),('fee_changes','actor_user_id'),('transaction_routes','created_by'),('transaction_notes','created_by')]:
    ok(f'{tbl}_{field}_bound_to_auth', f'{tbl}.{field} = (select auth.uid())' in sql, f'{tbl}.{field} must be bound to auth.uid() in browser insert policy')


# Every business table except identity/bootstrap tables must have workspace_id in its CREATE body.
identity={'profiles','workspaces','workspace_memberships'}
for i,t in enumerate(tables):
    if t in identity:
        continue
    # body is safe enough because table definitions do not nest parentheses beyond constraints;
    # use next create table boundary rather than balancing SQL.
    start=sql.lower().find(f'create table public.{t}')
    next_starts=[sql.lower().find(f'create table public.{x}', start+1) for x in tables if sql.lower().find(f'create table public.{x}', start+1)>=0]
    end=min(next_starts) if next_starts else len(sql)
    body=sql[start:end]
    if not (re.search(r'(?im)^\s*workspace_id\s+uuid\s+not\s+null\b', body) or re.search(r'(?im)^\s*workspace_id\s+uuid\s+primary\s+key\b', body)):
        errors.append(f'{t}: missing workspace_id uuid not null')
        checks.append({'name':f'{t}_workspace_id','passed':False,'detail':'missing workspace_id uuid not null'})

# Auth UID in policies should be explicit and wrapped as select for optimizer + clarity.
policy_blocks=re.findall(r'(?is)(create\s+policy\s+.*?;)', sql)
bad_uid=[]
for block in policy_blocks:
    scrub=block.replace('(select auth.uid())','')
    if 'auth.uid()' in scrub:
        bad_uid.append(block.split()[2])
ok('auth_uid_wrapped', not bad_uid, f'bad={bad_uid}')

# Every policy must specify TO authenticated.
bad_to=[name for name,table in policies if not re.search(rf'(?is)create\s+policy\s+{re.escape(name)}\s+on\s+public\.{re.escape(table)}.*?\bto\s+authenticated\b', sql)]
ok('policies_target_authenticated', not bad_to, f'bad={bad_to}')

# Parentheses structural sanity after comments/strings removal.
balance=0; min_balance=0
for ch in struct_no_strings:
    if ch=='(': balance+=1
    elif ch==')':
        balance-=1; min_balance=min(min_balance,balance)
ok('parentheses_balanced', balance==0 and min_balance>=0, f'balance={balance}, min={min_balance}')

# Foreign-key creation order: referenced public table must exist earlier, except self-reference.
positions={t: sql.lower().find(f'create table public.{t}') for t in tables}
bad_fk_order=[]
for m in re.finditer(r'(?is)references\s+public\.([a-z0-9_]+)\s*\(', sql):
    target=m.group(1)
    # Find current table by nearest preceding CREATE TABLE.
    current=None; current_pos=-1
    for t,pos in positions.items():
        if pos <= m.start() and pos > current_pos:
            current=t; current_pos=pos
    if target != current and target in positions and positions[target] > current_pos:
        bad_fk_order.append((current,target))
ok('foreign_key_creation_order', not bad_fk_order, f'bad={bad_fk_order}')

ok('transaction_wrapped', re.search(r'(?im)^begin\s*;', sql) is not None and re.search(r'(?im)^commit\s*;', sql) is not None, 'baseline must be transactional')

result={'passed':not errors,'tables':len(tables),'policies':len(policies),'indexes':len(indexes),'checks':checks,'errors':errors}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(0 if not errors else 1)
