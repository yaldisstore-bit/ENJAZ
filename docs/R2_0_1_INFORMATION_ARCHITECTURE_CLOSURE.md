# ENJAZ Rebirth 2.0 — R2.0-1 Information Architecture Closure

Status: **CLOSURE CANDIDATE — requires green PR + post-merge main recertification**

## Scope closed

R2.0-1 freezes the information architecture that the new Rebirth 2.0 presentation must implement. It does not implement the visual Design System or the new Shell and it does not change the canonical runtime.

Phase 5.5 remains **PAUSED / LOCKED**.

## Preserved product truth

R2.0-0 produced a 35-capability inventory. R2.0-1 assigns every inventoried capability to a known canonical destination while preserving the distinction between:
- live authoritative behavior,
- bounded integration contracts,
- review-only/non-persistent presentation,
- later-roadmap domain presentation contracts.

No later-roadmap domain may be made to look live merely to fill a navigation destination.

## Canonical navigation

Exactly five persistent first-level doors:

**الرئيسية | المعاملات | + جديد | اليوم | المزيد**

The brand is branding only.

`المزيد` is the explicit map of all secondary product domains, grouped by user intent.

## Canonical source registry

Runtime-facing navigation truth is defined in:

`src/ui-r2/architecture/navigation-contract.ts`

The R2.0-1 CI audit verifies that its destination ids/routes remain synchronized with:

`docs/UI_UX_REBIRTH_2_0_INFORMATION_ARCHITECTURE.json`

and rejects old presentation imports or known legacy maze DNA.

## Frozen routing rules

- deep-link safe,
- refresh safe,
- entity identity belongs in entity routes,
- final R2 navigation may not be only local component state,
- Back closes the top owned overlay before changing location,
- list/search origin is restored when in-app history exists,
- direct deep links fall back to canonical parents,
- Search returns to query/results on Back,
- global create cancellation returns to invoking context.

Transaction editor route ambiguity was removed before closure:
- create: `/app/transactions/new`
- edit: `/app/transactions/:transactionId/edit`

## Frozen Find Anything rules

- static demo results are forbidden,
- selecting a result must navigate,
- features/actions are searchable,
- records are searchable only from authoritative sources,
- future/locked destinations show truthful availability instead of fabricated behavior,
- aliases such as خزنة، دفعة، أرشفة، محامي، قيادة، أتمتة resolve to their canonical destinations.

## Frozen create truthfulness rules

- transaction create is authoritative,
- current follow-up/company-person/payment quick-create paths remain review-only until their authoritative roadmap domains exist,
- a review-only flow may never claim or visually imply successful persistence.

## Legacy maze defects dispositioned

R2.0-1 explicitly rejects the current causes of navigation confusion:
- logo as hidden domain launcher,
- all-12-domain rail,
- duplicate Operations home,
- duplicate Finance home,
- duplicate Command home,
- static non-navigating global search,
- review-only quick-create masquerading risk,
- state-only navigation as the final architecture.

## Hard closure metrics

- inventoried capabilities: **35**
- persistent first-level doors: **5**
- hidden primary navigation: **0**
- duplicate canonical homes: **0**
- unresolved capability homes: **0**
- maximum major-capability reachability budget: **3 deliberate actions**
- canonical navigation registry: **present**
- route/back/search/create contracts: **frozen**

## Promotion boundary

R2.0-1 closure does **not** start R2.0-2 automatically.

The next legal stage after green closure recertification is:

**R2.0-2 — New Design System**

The runtime remains `ui-v2`, Golden Experience remains unapproved/unimplemented, old UI remains present until R2.0-10, and Phase 5.5 remains locked.
