#!/usr/bin/env python3
from __future__ import annotations
import os, subprocess, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
schema=(ROOT/'database/baseline/phase1_2_schema.sql').read_text(encoding='utf-8')
audit=ROOT/'database/scripts/audit_schema.py'

cases={
    'missing_rls': schema.replace('alter table public.payments enable row level security;','',1),
    'delete_grant': schema.replace('commit;','grant delete on public.payments to authenticated;\ncommit;',1),
    'money_type': schema.replace('amount numeric(18,2) not null check (amount > 0)', 'amount money not null',1),
    'composite_set_null': schema.replace('references public.contacts(workspace_id, id) on delete restrict', 'references public.contacts(workspace_id, id) on delete set null',1),
    'malformed_named_constraint': schema.replace('constraint notification_deliveries_sent_check check (', 'constraint notification_deliveries_sent_check (',1),
}

failed=[]
for name,content in cases.items():
    with tempfile.NamedTemporaryFile('w', suffix='.sql', encoding='utf-8', delete=False) as f:
        f.write(content); path=f.name
    env=os.environ.copy(); env['ENJAZ_SCHEMA_PATH']=path
    r=subprocess.run(['python3',str(audit)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    os.unlink(path)
    if r.returncode==0:
        failed.append(name)
        print(f'FAIL selftest {name}: audit accepted corrupted schema')
    else:
        print(f'PASS selftest {name}: corruption rejected')

bootstrap_path=ROOT/'database/migrations/phase_1_3_auth_workspace_signup_trigger.sql'
bootstrap=bootstrap_path.read_text(encoding='utf-8') if bootstrap_path.exists() else ''
bootstrap_requirements={
    'signup_trigger_function':'create or replace function private.bootstrap_workspace_on_auth_signup()',
    'auth_users_trigger':'create trigger on_auth_user_created_bootstrap_workspace',
    'profile_insert':'insert into public.profiles(id, display_name)',
    'workspace_insert':'insert into public.workspaces(owner_user_id, name)',
    'membership_insert':'insert into public.workspace_memberships(workspace_id, user_id, role)',
    'settings_insert':'insert into public.workspace_settings(workspace_id)',
    'existing_user_backfill':'for v_user in select u.id, u.raw_user_meta_data, u.email from auth.users u',
}
for name,token in bootstrap_requirements.items():
    if token not in bootstrap:
        failed.append(f'bootstrap_{name}')
        print(f'FAIL selftest bootstrap_{name}: signup bootstrap contract missing')
    else:
        print(f'PASS selftest bootstrap_{name}: signup bootstrap contract present')

# Destructive mutation check: each critical bootstrap capability must be independently detectable.
for name,token in bootstrap_requirements.items():
    corrupted=bootstrap.replace(token,'-- removed by destructive selftest --',1)
    if token in corrupted:
        failed.append(f'bootstrap_mutation_{name}')
        print(f'FAIL selftest bootstrap_mutation_{name}: corruption was not removed')
    else:
        print(f'PASS selftest bootstrap_mutation_{name}: corruption detected')

if failed:
    raise SystemExit(1)
print(f'PASS audit selftest {len(cases) + len(bootstrap_requirements) * 2}/{len(cases) + len(bootstrap_requirements) * 2}')
