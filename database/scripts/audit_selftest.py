#!/usr/bin/env python3
from __future__ import annotations
import os, re, subprocess, tempfile
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
    'signup_trigger_function':r'create\s+or\s+replace\s+function\s+private\.bootstrap_auth_user\s*\(\s*\)\s*returns\s+trigger',
    'security_definer':r'function\s+private\.bootstrap_auth_user[\s\S]*?security\s+definer',
    'auth_users_trigger':r'create\s+trigger\s+enjaz_bootstrap_auth_user\s+after\s+insert\s+on\s+auth\.users',
    'profile_insert':r'insert\s+into\s+public\.profiles\s*\(\s*id\s*,\s*display_name\s*\)',
    'workspace_insert':r'insert\s+into\s+public\.workspaces\s*\(\s*owner_user_id\s*,\s*name\s*\)',
    'membership_insert':r'insert\s+into\s+public\.workspace_memberships\s*\(\s*workspace_id\s*,\s*user_id\s*,\s*role\s*\)',
    'settings_insert':r'insert\s+into\s+public\.workspace_settings\s*\(\s*workspace_id\s*\)',
    'existing_user_backfill':r'from\s+auth\.users\s+u',
    'idempotent_profile':r'on\s+conflict\s*\(\s*id\s*\)\s+do\s+nothing',
    'idempotent_membership':r'on\s+conflict\s*\(\s*workspace_id\s*,\s*user_id\s*\)\s+do\s+nothing',
}
flags=re.IGNORECASE
for name,pattern in bootstrap_requirements.items():
    count=len(list(re.finditer(pattern, bootstrap, flags=flags)))
    if count == 0:
        failed.append(f'bootstrap_{name}')
        print(f'FAIL selftest bootstrap_{name}: signup bootstrap contract missing')
    else:
        print(f'PASS selftest bootstrap_{name}: signup bootstrap contract present ({count} match(es))')

# Destructive contract proof: remove one concrete occurrence and require the
# semantic match count to fall. Capabilities intentionally shared by trigger and
# backfill may still have another valid occurrence after the mutation.
for name,pattern in bootstrap_requirements.items():
    matches=list(re.finditer(pattern, bootstrap, flags=flags))
    if not matches:
        continue
    match=matches[0]
    corrupted=bootstrap[:match.start()]+'-- removed by destructive selftest --'+bootstrap[match.end():]
    remaining=len(list(re.finditer(pattern, corrupted, flags=flags)))
    if remaining != len(matches)-1:
        failed.append(f'bootstrap_mutation_{name}')
        print(f'FAIL selftest bootstrap_mutation_{name}: match count did not fall exactly once ({len(matches)} -> {remaining})')
    else:
        print(f'PASS selftest bootstrap_mutation_{name}: corruption reduced capability count ({len(matches)} -> {remaining})')

if failed:
    raise SystemExit(1)
print(f'PASS audit selftest {len(cases) + len(bootstrap_requirements) * 2}/{len(cases) + len(bootstrap_requirements) * 2}')
