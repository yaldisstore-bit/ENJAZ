# Phase 13.2 — A2 Explicit Relationship Preview

**Status:** IN PROGRESS  
**A1 certified head:** e7cb5d573e4ef679bf64eab257f49d46bea38383  
**A1 gate:** #2 / 35398804690 — PASS

## Purpose

Add relationship mapping to the in-memory mapping preview without assigning a foreign key, generating an ID, persisting data, or authorizing ordered import.

## Allowed relationship preview authorities

Only these exact target relationships are permitted:

1. transactions.company_id → companies
2. transactions.primary_contact_id → contacts
3. companies.primary_contact_id → contacts

The caller must declare exact legacy source type, link kind, legacy target type, and target field. No aliases, case-folding, fuzzy relation names, target inference, or relationship synthesis are allowed.

## Fail-closed outcomes

- undeclared link → unmappedRelationshipLinks + review required
- dangling target → QUARANTINED_DANGLING_TARGET
- duplicate source key → QUARANTINED_DUPLICATE_SOURCE
- duplicate target key → QUARANTINED_DUPLICATE_TARGET
- invalid target relation → plan rejection

Even RESOLVED_RELATIONSHIP_PREVIEW has:
- foreignKeyAssigned=false
- generatedTargetId=null
- writeAllowed=false

Phase 13.3 remains LOCKED.
