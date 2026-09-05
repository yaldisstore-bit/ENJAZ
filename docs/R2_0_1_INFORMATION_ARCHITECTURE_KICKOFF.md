# ENJAZ Rebirth 2.0 — R2.0-1 Information Architecture

Status: **ACTIVE / NOT CLOSED**

Canonical base: `62048d134a9ce87928fa51a6653447c4c583ae6b`

Phase 5.5 remains **PAUSED / LOCKED**. This stage changes navigation/information architecture only. It does not reopen or modify Phase 5.1–5.4 business/data semantics and it does not promote `ui-r2` to the canonical runtime.

## R2.0-0 prerequisite closure

Before advancing the machine state to R2.0-1, the current product was inventoried from the governing roadmap, typed Data Layer, current shell/domain composition and closed Phase 4/5 feature implementations.

The authoritative machine-readable inventory is:

`docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json`

The inventory explicitly distinguishes:
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

R2.0-1 exists to remove these causes before any new visual shell is built.

## Frozen first-level model under review

The only persistent first-level doors are:

**الرئيسية | المعاملات | + جديد | اليوم | المزيد**

The brand is branding only. It is not a secret launcher.

`المزيد` is the explicit system map:

- **السجلات:** الشركات، الأشخاص والمحامون، الوثائق والتقارير
- **التشغيل:** مركز العمليات، سير العمل، الأتمتة، المتابعات والإشعارات
- **الإدارة:** المالية، مركز القيادة، المخاطر والرؤى
- **الذكاء:** مساعد إنجاز

Every capability has exactly one canonical home. Contextual shortcuts may point to that home but may not create a second implementation.

## Route and location direction

R2 Shell must use real route identity rather than a final architecture based only on `useState`.

Required properties:
- deep-link safe,
- refresh safe,
- entity identity in the route,
- predictable browser/Android Back,
- exact originating list/search state restored when history exists,
- canonical-parent fallback for direct deep links,
- overlay ownership: Back closes the top overlay before changing route.

The exact router implementation is intentionally not selected in this kickoff. R2.0-1 freezes behavior and route ownership first; R2.0-3 implements it.

## Search contract

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

## Truthfulness contract

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

## R2.0-1 hard exit gate

R2.0-1 is **not complete yet**. It may close only when all of the following are true:

- feature inventory remains complete and non-empty,
- every capability resolves to one known canonical home,
- five first-level doors remain exact,
- hidden primary navigation = 0,
- duplicate canonical homes = 0,
- every major capability remains within the 3-action budget,
- More exposes every secondary domain explicitly,
- route/deep-link/back rules are frozen,
- Find Anything contract is frozen,
- global-create truthfulness contract is frozen,
- future domains cannot masquerade as live,
- R2.0-1 CI audit passes,
- cumulative Quality and Browser gates remain green.

Only after closure may state advance to **R2.0-2 — New Design System**.
