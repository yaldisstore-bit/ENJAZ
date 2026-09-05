# ENJAZ Rebirth 2.0 — R2.0-1 Information Architecture

Status: **CLOSED / HARD-GATED**

Canonical start base: `62048d134a9ce87928fa51a6653447c4c583ae6b`

Phase 5.5 remains **PAUSED / LOCKED**. This stage changes navigation/information architecture only. It does not reopen or modify Phase 5.1–5.4 business/data semantics and it does not promote `ui-r2` to the canonical runtime.

## R2.0-0 prerequisite closure

Before advancing the machine state to R2.0-1, the current product was inventoried from the governing roadmap, typed Data Layer, current shell/domain composition and closed Phase 4/5 feature implementations.

The authoritative machine-readable inventory is:

`docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json`

It contains **35 inventoried capabilities** and explicitly distinguishes:
- authoritative live functionality,
- integration contracts,
- review-only/non-persistent presentation,
- presentation-domain contracts whose authoritative implementation belongs to later roadmap phases.

This distinction is mandatory: Rebirth 2.0 must not turn a current visual placeholder into fake live functionality merely to claim parity.

## Problem statement

The current interface has a real discoverability/maze defect even where the visual polish is acceptable.

Verified structural causes include:
- major domains hidden behind an interactive brand/logo affordance,
- a 12-domain rail exposed inside domain work,
- Operations duplicated between shell and domain,
- Finance duplicated between shell and domain,
- Command duplicated between Operations command mode and a separate domain,
- global search backed by hard-coded demo results whose click only closes the overlay,
- quick-create paths for follow-up/company-person/payment that validate and review but do not persist,
- navigation identity held primarily in local component state rather than a deep-link/refresh-safe route model.

R2.0-1 closes these architectural causes before any new visual shell is built.

## Frozen first-level model

The only persistent first-level doors are:

**الرئيسية | المعاملات | + جديد | اليوم | المزيد**

The brand is branding only. It is not a secret launcher.

`المزيد` is the explicit system map:

- **السجلات:** الشركات، الأشخاص والمحامون، الوثائق والتقارير
- **التشغيل:** مركز العمليات، سير العمل، الأتمتة، المتابعات والإشعارات
- **الإدارة:** المالية، مركز القيادة، المخاطر والرؤى
- **الذكاء:** مساعد إنجاز

Every capability has exactly one canonical home. Contextual shortcuts may point to that home but may not create a second implementation.

The runtime-facing source registry is frozen at:

`src/ui-r2/architecture/navigation-contract.ts`

## Frozen route and location model

R2 Shell must use real route identity rather than a final architecture based only on `useState`.

Required properties:
- deep-link safe,
- refresh safe,
- entity identity in the route,
- predictable browser/Android Back,
- exact originating list/search state restored when history exists,
- canonical-parent fallback for direct deep links,
- overlay ownership: Back closes the top overlay before changing route.

Transaction create/edit were deliberately separated before closure:
- create: `/app/transactions/new`
- edit: `/app/transactions/:transactionId/edit`

The conceptual editor destination remains one task-space, but creation never requires a transaction id and edit always owns the target transaction identity.

The exact router library/implementation remains an R2.0-3 implementation concern; R2.0-1 freezes behavior and ownership.

## Frozen Search contract

Find Anything becomes a real discovery/navigation surface.

It must search features/actions immediately and authoritative records only when their source is actually available. Static demo records are forbidden.

Required aliases include at minimum:
- خزنة → الوثائق
- دفعة → المالية
- أرشفة → دورة حياة المعاملة
- محامي → الأشخاص والمحامون
- قيادة → مركز القيادة
- أتمتة → الأتمتة

Selecting a result must navigate to the canonical destination.

## Frozen create truthfulness contract

The global `جديد` entry is a discoverable create hub.

At R2.0-1 closure:
- transaction creation is authoritative,
- current follow-up/company-person/payment quick-create paths are review-only and non-persistent,
- review-only paths may never look or read as if data was saved.

Later roadmap phases may replace these review-only contracts with authoritative mutations only when their domain authority is implemented.

## Truthfulness contract for future domains

A later-roadmap domain may be discoverable without pretending to be fully implemented.

Examples:
- Company CRUD/details remain Phase 6 authority.
- Full Finance remains Phase 7 authority.
- Workflow/Automation/Operations/Command remain Phase 8 authority.
- Risk/Insights remain Phase 9 authority.
- Vault/Reports remain Phase 10 authority.
- Notifications/Follow-ups center remains Phase 11 authority.
- Copilot remains Phase 12 authority.

Existing authoritative context already delivered in Home/Daily Work/Transactions remains available according to its frozen contracts.

## R2.0-1 exit gate — CLOSED

The following conditions are now frozen as the R2.0-1 closure contract:

- feature inventory complete and non-empty: **PASS**,
- every capability resolves to one known canonical home: **PASS**,
- five first-level doors exact: **PASS**,
- hidden primary navigation = **0**,
- duplicate canonical homes = **0**,
- every major capability within the **3-action** budget,
- More exposes every secondary domain explicitly,
- route/deep-link/back rules frozen,
- Find Anything contract frozen,
- global-create truthfulness contract frozen,
- future domains cannot masquerade as live,
- canonical TypeScript navigation registry created,
- CI audit rejects drift between governance IA and the source registry.

R2.0-1 is not considered canonically closed until its closure PR and the cumulative Governance, Quality and Real Browser gates pass on `main`.

After that verification, the next legal stage is **R2.0-2 — New Design System**. It does not start automatically.
