# ENJAZ UI/UX Rebirth 2.0 — Master Plan

Status: **ACTIVE CHANGE-CONTROL DIRECTIVE**

Canonical base: `main` at `c2955971e32964b2671936fd1858e59ebb3a6cf2` after Phase 5.4 was merged and re-certified.

## Immediate governance decision

**Phase 5.5 — Transaction Destruction Gate is PAUSED / LOCKED and must not start while UI/UX Rebirth 2.0 is active.**

This directive intentionally interrupts the previous next-step pointer after Phase 5.4. It does not reopen Phase 5.1–5.4 business logic. It freezes new product-phase expansion until the new UI/UX shell, navigation architecture and visual direction are approved and re-certified.

No Phase 5.5 implementation branch, kickoff document, workflow, runtime phase marker, or feature work may be introduced while this directive is active.

## What is being rebuilt

Rebuild from zero:
- visual language,
- shell,
- navigation architecture,
- information architecture,
- home composition,
- domain entry points,
- page hierarchy,
- search/discovery experience,
- contextual actions,
- mobile navigation,
- screen composition and visual rhythm.

Preserve:
- Supabase schema and RLS,
- typed Data Layer,
- repositories/services,
- business logic,
- transaction list/create-edit/360/lifecycle semantics,
- existing domain facts,
- security and data-integrity contracts,
- functional/destructive test knowledge.

The current UI is not to be patched into the new one. Rebirth 2.0 must be built as a parallel presentation layer and promoted only after explicit acceptance.

## Design thesis

**Calm Command Interface** — a premium Arabic-first productivity interface that feels obvious before it feels impressive.

The new UI must prioritize:
1. location clarity,
2. feature discoverability,
3. one obvious primary action per context,
4. strong information hierarchy,
5. calm visual density,
6. premium typography and spacing,
7. contextual depth instead of card overload,
8. predictable back/navigation behavior.

## New primary navigation

Mobile bottom navigation is limited to five persistent destinations:

1. **الرئيسية** — priorities and current context.
2. **المعاملات** — the primary operational record domain.
3. **＋ جديد** — global create.
4. **اليوم** — current work and follow-ups.
5. **المزيد** — explicit feature hub.

The application logo is no longer a hidden gateway to product domains.

## Feature Hub / المزيد

`المزيد` is the explicit map of the system, grouped by user intent rather than technical architecture:

### السجلات
- الشركات
- الأشخاص والمحامون
- الوثائق والتقارير

### التشغيل
- مركز العمليات
- سير العمل
- الأتمتة
- المتابعات والإشعارات

### الإدارة
- المالية
- مركز القيادة
- المخاطر والرؤى

### الذكاء
- مساعد إنجاز

Every capability has one canonical home. Other surfaces may link to it, but must not create competing homes or alternate implementations.

## Global discovery

Replace the current static-result search with a real **Find Anything** surface that can resolve:
- transactions,
- companies,
- people/lawyers,
- documents,
- screens,
- features,
- actions.

Feature aliases must work. Examples:
- `خزنة` → الوثائق
- `دفعة` → المالية
- `أرشفة` → transaction lifecycle context
- `محامي` → people/lawyers
- `قيادة` → command center
- `أتمتة` → automation

Selecting a result must navigate to the destination, not merely close the search.

## Location model

The user must always understand where they are.

Use a compact location trail such as:
`الرئيسية ← المعاملات ← #1042 ← 360°`

Do not show all product domains inside every domain screen. The existing 12-domain rail is removed from the new presentation layer.

## Screen grammar

### Home
- one strong priority zone,
- today/work queue,
- recent work,
- concise financial/attention signals only when actionable,
- no decorative metric wall,
- no repeated card grids.

### Transactions
- clear current/stalled/closed segmentation,
- obvious search and filter layer,
- rows/cards with a strong identity line and one primary action,
- secondary actions in a contextual menu,
- no competing navigation rail.

### Transaction 360°
- full contextual workspace rather than a stack of equal-weight cards,
- sticky identity header,
- compact section index,
- timeline/details grouped into visually distinct regions,
- read-only context remains distinct from lifecycle/edit actions.

### Companies / People
- profile-first layouts with relationships and recent activity,
- strong entity identity,
- related records grouped by importance rather than equal cards.

### Finance
- ledger-first, calm and numeric,
- clear hierarchy between balance, due items and movement,
- no decorative financial widgets.

### Operations / Workflow / Automation
- operational canvases with lanes, state and ownership,
- fewer boxes, stronger flow and causality.

## Visual direction

The current yellow/black identity is **not frozen** for Rebirth 2.0.

Initial direction:
- warm neutral canvas rather than bright white,
- deep graphite text and structural surfaces,
- one restrained premium accent family instead of yellow everywhere,
- accent color reserved for action/state, not decoration,
- generous negative space,
- stronger Arabic typography hierarchy,
- fewer borders,
- deeper but softer elevation,
- larger radii only where structural,
- motion limited to navigation, state change and hierarchy reinforcement.

The first visual prototype will determine the final palette before propagation.

## Non-negotiable UX rules

- Every major capability reachable from Home in at most 3 deliberate actions.
- Every feature has exactly one canonical home.
- Back always returns to the logically previous level.
- Search can locate both records and features.
- No hidden primary navigation behind branding.
- No 12-domain rail in normal domain work.
- No screen may expose unrelated global features merely because they exist.
- On mobile, the user must never need to remember where a feature lives.
- 320px remains a hard acceptance width.
- RTL and mixed Arabic/Latin content remain first-class.

## Delivery sequence

### R2.0-0 — Freeze & extraction
Freeze Phase 5.5, inventory current capabilities and map every feature to one canonical home.

### R2.0-1 — Information architecture
Build the final product map, navigation model, feature registry and Find Anything contract before visual styling.

### R2.0-2 — New shell prototype
Build a parallel shell with Home / Transactions / New / Today / More and compact location trail.

### R2.0-3 — Visual identity prototype
Create Home + More + one transaction flow as the approval specimen. No broad propagation before explicit acceptance.

### R2.0-4 — Core domain migration
Migrate Transactions, Companies/People, Finance and operational domains into the approved grammar while preserving existing services/business rules.

### R2.0-5 — Discovery & navigation destruction
Test findability, 3-action reachability, back behavior, deep links, mobile, keyboard, overflow, feature aliases and canonical-home uniqueness.

### R2.0-6 — Promotion
Only after visual approval and destructive gates pass, promote Rebirth 2.0 as the canonical UI and retire the current presentation layer.

After promotion and re-certification, project governance will explicitly decide when Phase 5.5 may resume.

## Success criterion

A user who does not remember where a feature lives must still reach it quickly and confidently. The new interface is accepted only when ENJAZ stops feeling like a collection of powerful screens and starts feeling like one coherent product.
