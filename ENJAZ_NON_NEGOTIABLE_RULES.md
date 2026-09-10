# ENJAZ Non-Negotiable Product & Engineering Constitution

> **Status:** Highest governing product-quality contract for ENJAZ.
>
> **Authority:** This file is intentionally the first source of truth referenced by `docs/ENJAZ_MASTER_ROADMAP.md`. No phase, feature, optimization, refactor, delivery shortcut, or release decision may silently weaken it.
>
> **Product goal:** ENJAZ must be simultaneously a premium professional product, a complete operational platform, a maintainable engineering system, and a verified production application. Excellence in one dimension never compensates for failure in another.

```text
QUALITY_CONSTITUTION_VERSION=1
PHASE_CLOSURE_REQUIRES_ALL_FOUR_PASS=true
PRODUCT_COMPLETENESS_REQUIRED=true
PREMIUM_UI_UX_REQUIRED=true
ENGINEERING_QUALITY_REQUIRED=true
CERTIFICATION_REQUIRED=true
NO_FEATURE_CUT_FOR_BUNDLE_BUDGET=true
NO_LEGACY_DNA=true
NO_PATCHWORK_RELEASES=true
```

---

## 1. The four-track closure law

Every implementation phase must be evaluated through four mandatory tracks:

**PRODUCT → UI/UX → ENGINEERING → CERTIFICATION**

A phase may progress while these tracks are being built in parallel, but it may not be declared `CLOSED`, authorize its successor, or be described as production-complete unless **all four tracks are PASS**.

`PHASE_CLOSURE_REQUIRES_ALL_FOUR_PASS` is a hard law, not a reporting preference.

A green branch build, a successful database migration, an attractive screen, or a passing unit-test suite alone is never sufficient closure evidence.

---

## 2. Track A — Product completeness

ENJAZ is an integrated legal and administrative operating platform, not a collection of disconnected screens.

Mandatory rules:

1. Approved capabilities remain preserved unless an explicit governing product decision removes or replaces them.
2. Every shipped capability must work end-to-end through its real data, permission, failure, recovery, and navigation paths.
3. No demo-only state, decorative counter, fabricated business fact, fake save, placeholder workflow, or disconnected mock may stand in for an authoritative implementation.
4. Cross-domain experiences must compose the existing authoritative transaction, company/person, finance, workflow, automation, document, operations, risk, search, governance, communication, and reporting sources instead of duplicating them.
5. A phase cannot be considered complete while required routes, commands, states, permissions, exports, history, or recovery paths are knowingly absent.
6. Feature parity protects approved business capability, not obsolete legacy implementation.
7. Product depth must not be traded away merely to simplify UI work, reduce bundle size, shorten a milestone, or make a gate easier to pass.

**Required result:** a user must be able to complete the real business outcome, not merely view a representation of it.

---

## 3. Track B — Premium UI/UX

The UI must communicate the strength of the underlying product. ENJAZ is expected to reach premium modern application quality, using iOS-class fit-and-finish and Samsung-grade clarity/precision as quality benchmarks without copying another product's protected visual identity.

Mandatory rules:

1. One coherent ENJAZ visual language must cover the whole application: typography, spacing, hierarchy, depth, cards, surfaces, icons, motion, forms, tables/lists, dialogs, overlays, navigation and feedback states.
2. Arabic-first and RTL-first behavior is mandatory, including long Arabic strings, mixed Arabic/Latin/digit content, truncation, wrapping and alignment.
3. Mobile-first behavior is first-class. 430/390/360/320 widths, Android keyboard, browser back, safe areas, rotation where applicable, touch targets and sticky/fixed controls must be verified.
4. Loading, empty, error, offline/uncertain, destructive-confirmation, success, conflict and dense-data states require designed experiences; none may fall back to cheap placeholders or broken layout.
5. Information architecture must expose hierarchy and relationships clearly. Major title, context, status, primary action, secondary facts and supporting detail may not visually collapse into one flat undifferentiated page.
6. Motion must make the application feel alive and responsive while preserving performance, reduced-motion behavior and interaction clarity.
7. Accessibility, contrast, focus behavior, readable typography and keyboard semantics are release requirements, not post-release polish.
8. No legacy R4/R6/V7/V8 UI/runtime DNA may re-enter the production experience.
9. No screen may be accepted merely because it is functional if it visibly looks unfinished, inconsistent, cheap, patched, or below the established premium ENJAZ bar.
10. `NO_PATCHWORK_RELEASES` applies: when a surface needs structural redesign, the correct solution is a coherent component/layout refactor rather than stacking visual patches over obsolete structure.

**Required result:** every production surface must look and behave like it belongs to the same premium product.

---

## 4. Track C — Engineering and code quality

Professional UI and rich features must sit on professional code. ENJAZ engineering quality is part of the product.

Mandatory rules:

1. TypeScript remains strict and typed boundaries remain explicit. New/touched code may not introduce unbounded unsafe typing, silent coercion, or unchecked external data assumptions without a narrowly justified boundary.
2. Domain logic, presentation, data access, infrastructure and authorization responsibilities must remain separated. UI components may orchestrate interaction but may not become hidden business-rule or permission engines.
3. PostgreSQL/Supabase + RLS remains the authoritative persistent and permission boundary for durable business truth.
4. No shadow company, party, finance, workflow, governance, identity, or other competing truth store may be created to make a feature easier to render.
5. Sensitive writes use explicit command/RPC/service boundaries with authorization, validation, idempotency/replay protection, audit context and concurrency/stale-state handling where applicable.
6. Historical business truth must be append/history-safe where the domain requires history; current display state must not overwrite evidence needed for historical reconstruction.
7. Cross-workspace access and reference injection fail closed.
8. Code duplication, giant mixed-responsibility modules, dead code, abandoned experiments, stale feature flags, obsolete legacy CSS/JS, and copy-pasted business logic must be actively reduced rather than normalized.
9. Refactors must preserve observable approved behavior and receive regression coverage for real bugs and important recovered invariants.
10. Public APIs, domain contracts and migrations must be explicit, reviewable, deterministic and version-safe.
11. Errors must be normalized into safe user-facing behavior without leaking secrets or pretending an outcome is known when a network/write result is uncertain.
12. Performance work must optimize architecture before sacrificing product: code splitting, lazy loading, dependency control, deduplication, smaller boundaries and removal of genuinely unused code are preferred over feature removal.
13. `NO_FEATURE_CUT_FOR_BUNDLE_BUDGET` is mandatory. A JavaScript/performance budget is a quality guard, not permission to delete approved capability or degrade UX merely to pass a number.
14. Any increase to a hard performance/bundle ceiling requires a separate explicit governance decision with measured justification; it may not be hidden inside feature work.
15. Secrets, privileged credentials and service-role material must never be packaged into the browser runtime.

**Required result:** the codebase must remain understandable, testable, evolvable and safe as ENJAZ grows.

---

## 5. Track D — Certification and production reality

No feature is production-complete because it worked in a mock, local preview, isolated unit test, or branch-only environment.

Mandatory evidence, where applicable to the phase/system:

1. deterministic unit/domain/contract tests;
2. destructive and regression tests for failure, malformed input, duplicates, stale state, conflicting state and boundary conditions;
3. TypeScript/static/secret/architecture audits;
4. database migration, schema, index, RLS and permission verification;
5. authenticated Real Cloud positive and negative tests with zero probe residue;
6. full functional regression across previously closed capabilities;
7. Real Chromium journeys at 1280/430/390/360/320;
8. mobile keyboard/back/safe-area/deep-link/reload/long-Arabic/dense-state stress where relevant;
9. offline/network uncertainty and duplicate-submit recovery where relevant;
10. exact-head CI with zero unresolved Critical, High, or functional blocker defects;
11. exact merged SHA deployed to the real application;
12. published-live verification/attack of the actual deployed application;
13. post-merge recertification before successor authorization;
14. every real escaped defect receives a permanent regression guard and reopens the affected certification boundary until repaired.

**Required result:** production behavior, not preview confidence, is the closure authority.

---

## 6. Mandatory phase execution model

Every new phase plan and phase-state file must make the four tracks visible.

Minimum lifecycle:

1. **Product contract:** define required business outcome, integrations, authority and no-fabrication boundaries.
2. **UI/UX contract:** define real surfaces, states, hierarchy, RTL/mobile behavior, interaction and premium acceptance bar.
3. **Engineering contract:** define source of truth, module boundaries, types, persistence, commands, authorization, history, performance and failure semantics.
4. **Certification contract:** define deterministic tests, Real Cloud/Real Browser/live evidence, regression matrix and zero-defect closure criteria.
5. **Closure:** allowed only when Product=`PASS`, UI/UX=`PASS`, Engineering=`PASS`, Certification=`PASS`.

If one track is `PENDING`, `FAILED`, `LOCKED`, `PARTIAL`, or has an unresolved blocker, the phase remains open.

---

## 7. Bundle/performance budget law

ENJAZ keeps hard performance budgets because uncontrolled growth is a product defect. However:

- budget pressure must trigger architectural improvement first;
- approved features and premium UX may not be silently removed to recover bytes;
- no gate may be weakened merely because a new feature needs room;
- experimental size optimizations that increase bundle size, weaken tree-shaking, reduce maintainability, or add risk must be reverted;
- recovered headroom must be measured on both production root and the actual published base path before runtime expansion is considered safe;
- a budget change, if ever justified, must be explicit, separately governed, measured and documented.

The objective is **a complete premium application with disciplined performance**, not a small incomplete application.

---

## 8. Change-control law

This constitution may evolve only through an explicit governance change that:

1. states exactly what rule is changing and why;
2. demonstrates that product completeness, premium UX, engineering integrity and certification strength are not being silently reduced;
3. updates the automated constitution audit in the same governing change;
4. does not rewrite historical closure evidence to pretend the new rule always existed.

A feature branch may strengthen these rules. It may not silently weaken them.

---

## 9. ENJAZ 1.0 definition of done

`ENJAZ 1.0 — Delivered` means more than completing numbered phases. Delivery requires one integrated product in which:

- the approved major systems operate coherently rather than as isolated demos;
- every production surface satisfies the premium ENJAZ UI/UX bar;
- the codebase and database remain maintainable, typed, secure, auditable and performance-disciplined;
- production cloud, browser and deployed-live evidence prove the critical journeys;
- no known Critical, High, or functional blocker defect is being hidden behind a release label.

Anything less remains an in-progress product, regardless of how many phase labels are marked complete.
