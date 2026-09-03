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

if failed:
    raise SystemExit(1)
print(f'PASS audit selftest {len(cases)}/{len(cases)}')
