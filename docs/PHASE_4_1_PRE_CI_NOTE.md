# Phase 4.1 — Pre-CI integrity note

This branch intentionally keeps the governing Master Roadmap at the last officially merged state until Phase 4.1 proves green. The implementation branch README and Phase 4.1 document describe work-in-progress state; the Master Roadmap will advance to `4.1 ✅ / 4.2 NEXT` only during official closure after the feature PR and merged-main gate pass.

A real pre-CI regression was found and fixed: open follow-ups belonging to archived transactions could still enter Home pending/overdue metrics even though archived transactions were already excluded from priority candidates. The model now requires the parent transaction to be active for all Home follow-up metrics, and `tests/homeDashboard.test.ts` protects that rule.
