# Phase 13.2 — A3 Destruction & Closure Readiness

**Status:** IN PROGRESS  
**A2 certified head:** f049451551ea5f4b4c7a8a626654011c91db7980  
**A2 Gate:** #6 / 35399419189 — PASS

A3 adds no mapping capability. It attacks the certified A1/A2 preview contract before implementation PR readiness.

Destruction dimensions:
- unsafe numeric precision and ambiguous decimal syntax;
- hidden control fields at every mapping-plan level;
- mapping-order determinism and replay determinism;
- duplicate source/target relationship ambiguity;
- dangling target behavior;
- undeclared relationship kinds;
- missing source fields and default synthesis attempts;
- repeated replay mutation traps;
- attempts to produce IDs, foreign keys, write plans or ordered-import authority.

The strict_number rule is now limited to exact cent-safe numbers representable inside the JavaScript safe-integer scaled boundary. Values that could silently round are rejected.

Phase 13.3 remains LOCKED.
