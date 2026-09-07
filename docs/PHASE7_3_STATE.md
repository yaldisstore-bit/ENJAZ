# ENJAZ Phase 7.3 — Financial Intelligence State

- Phase: `7.3`
- Status: `IN_PROGRESS`
- Closure: `OPEN`
- Successor: `7.4 LOCKED`
- M13 finance forecasting/BI anchor: `IN_PROGRESS`
- M13 overall system: `PLANNED / NOT CLOSED`
- Authoritative sources: transactions, companies, payments, payment_reversals, financial_ledger_entries, cashbox_accounts
- Money boundary: exact `bigint` cents inherited from Phase 7.1/7.2
- Receivables aging basis: `transaction.created_at` until a distinct authoritative due-date model exists
- Legal due date inference: `PROHIBITED`
- Financial intelligence persistence: `NONE` in 7.3; indicators are derived read models only
- Phase 7.2 payment/reversal/cashbox/M16 finance commands: `PRESERVED`
- Real Chromium: `PENDING`
- Full regression: `PENDING`
- PR-wide gates: `PENDING`
- Merge: `PENDING`
- Deployed-live verification: `PENDING`
- Post-merge recertification: `PENDING`

Phase 7.3 implements explainable receivables aging, collection attention, company financial health, six-month collection/cash trends, directional run-rate inputs and deterministic financial signals. It must not fabricate contractual/legal due dates, persist a second money store, or mark the overall M13 system closed.

Phase 7.4 remains locked until Phase 7.3 has exact-head CI, Real Chromium, merge, deployed-live validation and post-merge recertification evidence.
