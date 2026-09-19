-- Phase 13.4 formal deployment metadata normalization.
-- No data mutation and no authority change: comments only.
begin;

comment on function public.read_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb) is
  'Phase 13.4 A2 production-certified: RLS/owner-scoped one-statement readback bound to the Phase 13.3 import_jobs payload hash. NULL means no authorized matching ledger; never attests reconciliation or repairs records.';

comment on function public.compare_legacy_import_reconciliation_v1(uuid,uuid,text,jsonb) is
  'Phase 13.4 A3 production-certified: owner/RLS-bound A2 evidence and original hash-bound manifest compared inside one read-only statement; snapshot equality never authorizes closure or repair.';

commit;
