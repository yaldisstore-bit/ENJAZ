# Phase 14.1 A2 — linked J01–J09 evidence, 2026-09-21

Executable SHA `591d8740bda533e504503bc11ffb2c6e7a73d2e7` passed
[run 35561485351](https://github.com/yaldisstore-bit/ENJAZ/actions/runs/35561485351):
**86 hosted checks**, seven local cleanup-safety tests, evidence gate and artifact upload.
J09 archived and restored the same J01–J08 transaction, retained document/payment/follow-up
links, rejected stale archive and outsider mutations, and refused payment on an archived transaction.

Prior run 35538840184 passed J09 business assertions but failed cleanup; its swallowed
cleanup exceptions did not establish a precise database error. Marked recovery run
35539287981 later succeeded. Do not relabel that failed run as a complete certificate.

The new runner removes marked portal/upload leaf fixtures before workspace cascade,
rechecks the synthetic Auth identity and workspace owner, confirms the exact deleted row,
signs out marked sessions before deleting users, and preserves sanitized failure codes.
It never disables database constraints or broadens production privileges.

After this successful run, a separate read-only query of lab `nqhgaukutkyvfumbtbtg`
confirmed zero Auth users/sessions, workspaces, companies, transactions, storage objects,
portal authority events and upload sessions. No production writes occurred.

This is a hosted RPC/Data API test, not a browser/service-layer lifecycle certificate.
Remaining: J10/J11 linked cloud checks, complete role/expiry/adversarial matrix,
A3 authenticated browser/mobile/published portal, final exact-head and deployed-main checks.
PR #225 remains DRAFT; 14.1 IN_PROGRESS; 14.2 LOCKED.
