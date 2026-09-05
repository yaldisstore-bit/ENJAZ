# ENJAZ UI/UX Rebirth 2.0 — Master Plan

Status: **ACTIVE CHANGE-CONTROL DIRECTIVE / HARD-GATED**

Canonical governance base: `main` after Phase 5.4 closure, Phase 5.5 freeze, and official five-color palette lock.

Authoritative companion contracts:
- `docs/UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md`
- `docs/UI_UX_REBIRTH_2_0_PALETTE_CONTRACT.md`
- `docs/UI_UX_REBIRTH_2_0_STATE.json`
- `docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json`

## 1. Immediate governance decision

**Phase 5.5 — Transaction Destruction Gate is PAUSED / LOCKED and must not start while UI/UX Rebirth 2.0 is active.**

This does not reopen Phase 5.1–5.4 business logic. Supabase, RLS, typed Data Layer, repositories/services, transaction list/create-edit/360/lifecycle semantics, security and data-integrity contracts remain preserved.

No Phase 5.5 implementation branch, kickoff document, workflow, runtime phase marker or feature work may be introduced while this directive is active.

## 2. What is being rebuilt from zero

Rebuild from zero:
- visual language,
- design system,
- application shell,
- navigation architecture,
- information architecture,
- Home composition,
- domain entry points,
- page hierarchy,
- search/discovery experience,
- contextual actions,
- mobile and desktop composition,
- motion language,
- screen grammar and visual rhythm.

Preserve:
- Supabase schema and RLS,
- typed Data Layer,
- repositories/services,
- approved business logic,
- approved field/domain facts,
- transaction semantics already closed through Phase 5.4,
- security/integrity contracts,
- functional/destructive test knowledge.

The current presentation layer is **not** to be patched into the new one. Rebirth 2.0 is built in parallel under `src/ui-r2` and receives canonical runtime ownership only after final promotion.

## 3. Design philosophy

### ENJAZ Workspace — Clear, Spatial, Contextual

The new interface is designed independently from prior reference screenshots and independently from the current UI structure.

It must be:
- visually beautiful and premium,
- professionally organized,
- obvious before memorized,
- spatially understandable,
- context-aware,
- powerful without exposing all power at once,
- alive without decorative noise.

The product must use progressive disclosure: show what matters now; keep deeper capability close and discoverable without making every screen a product map.

## 4. Dual non-negotiable acceptance

Rebirth 2.0 has two equal pillars:

### Beauty Gate
The interface must be beautiful, premium, distinctive, polished and visually coherent.

### Professional UX / No-Maze Gate
The interface must be clear, discoverable, predictable and fast to navigate.

**Neither pillar may compensate for failure of the other.**

- beautiful + confusing = FAIL
- clear + cheap/generic = FAIL
- feature-rich + card-wall overload = FAIL
- premium + obvious + fast = PASS candidate

The hard mechanics live in `UI_UX_REBIRTH_2_0_ACCEPTANCE_CONTRACT.md` and are enforced by CI.

## 5. Locked palette

Only these five colors may exist in Rebirth 2.0 presentation code:
- `#F2F3F4`
- `#DED1C6`
- `#A77693`
- `#174871`
- `#0F2D4D`

No sixth color may be introduced for branding, status, charts, errors, success, warnings, hover states, shadows, overlays or decoration.

Semantic role:
- `#F2F3F4` dominant canvas/light surface,
- `#DED1C6` warm secondary surface,
- `#A77693` restrained identity accent,
- `#174871` primary interactive color,
- `#0F2D4D` deepest structural/text color.

Color is not the design. Composition, hierarchy, whitespace, typography, depth and motion must carry the product quality.

## 6. Navigation thesis

Primary mobile navigation is limited to five persistent destinations:

1. **الرئيسية** — priorities and current context.
2. **المعاملات** — primary operational record domain.
3. **＋ جديد** — global create.
4. **اليوم** — current work and follow-ups.
5. **المزيد** — explicit system map.

The logo is branding, not hidden navigation.

`المزيد` groups capability by user intent:

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

Every capability has exactly one canonical home. Other surfaces may link to that home but may not create competing implementations.

## 7. Find Anything

Global discovery is a real navigation surface, not static demo results.

It must resolve:
- transactions,
- companies,
- people/lawyers,
- documents,
- screens,
- features,
- actions.

Aliases must work, for example:
- `خزنة` → الوثائق
- `دفعة` → المالية
- `أرشفة` → transaction lifecycle context
- `محامي` → الأشخاص والمحامون
- `قيادة` → مركز القيادة
- `أتمتة` → الأتمتة

Selecting a result navigates to the canonical destination.

## 8. Location model

The user must always understand where they are inside nested work.

A compact location model may resemble:
`الرئيسية ← المعاملات ← #1042 ← 360°`

The exact visual form is decided by the new Design System; the requirement is cognitive clarity, not a specific breadcrumb component.

The old 12-domain rail does not exist in normal Rebirth 2.0 work.

## 9. Screen grammar

### Home
- one strong priority zone,
- work that needs attention now,
- Today/work queue,
- recent work,
- concise financial/attention signals only when actionable,
- no decorative metric wall,
- no repeated equal-weight card grid.

### Transactions
- clear segmentation and search/filter layer,
- strong record identity,
- one obvious primary action,
- contextual secondary actions,
- no competing global navigation inside the domain.

### Transaction 360°
- contextual workspace, not a stack of equal-weight cards,
- strong identity header,
- clear internal information regions,
- real timeline/activity treatment,
- related documents/follow-ups/finance shown contextually,
- read-only context remains distinct from edit/lifecycle mutation.

### Companies / People
- entity-first layouts,
- relationships and recent activity,
- related records grouped by importance.

### Finance
- ledger/workspace grammar,
- numeric hierarchy,
- due items and movement prioritized over decorative widgets.

### Operations / Workflow / Automation
- flow/state/ownership grammar,
- causality and next action visible,
- not forced into the same layout as transaction pages.

One visual identity, multiple task-appropriate compositions.

## 10. Non-negotiable UX rules

- Every major capability reachable from Home in at most **3 deliberate actions**.
- Every feature has exactly **one canonical home**.
- Hidden primary navigation = **0**.
- Duplicate canonical feature homes = **0**.
- Back returns to the logically previous level.
- Search locates records and features.
- No normal screen exposes unrelated product domains merely because they exist.
- Mobile user must not need to memorize where a feature lives.
- 320px is a hard acceptance width.
- RTL and mixed Arabic/Latin content are first-class.
- Touch geometry remains production-grade.
- Rebirth 2.0 uses only the locked five-color palette.
- No `src/ui-r2` presentation import from `src/ui-v2` or `src/ui-rebirth`.

## 11. Delivery sequence — hard-gated

### R2.0-0 — Feature & UX Extraction

No visual screen construction yet.

- inventory every current approved capability and meaningful action,
- record old entry point,
- identify authoritative data/service dependency,
- assign exactly one future canonical home,
- identify duplicates/overlaps,
- build the machine-readable Feature Parity matrix.

**Exit gate:** feature inventory complete, non-empty, unique ids, canonical home for every capability.

### R2.0-1 — Information Architecture from zero

- final product map,
- five-door primary navigation,
- More/Feature Hub architecture,
- route/deep-link model,
- back behavior,
- canonical home registry,
- Find Anything contract,
- contextual-action rules.

**Exit gate:** every inventoried capability has a reachable canonical path; no duplicate home; no hidden primary navigation.

### R2.0-2 — New Design System

Build Rebirth 2.0 presentation primitives under `src/ui-r2`:
- typography,
- spacing,
- radii,
- elevation/depth,
- icon rules,
- buttons,
- fields,
- sheets/dialogs,
- lists/tables,
- headers,
- navigation,
- feedback/loading/empty/error states,
- motion,
- responsive composition primitives.

No copying of old presentation components.

**Exit gate:** Design System manifest is frozen; palette purity and presentation isolation pass.

### R2.0-3 — New Application Shell

Build the parallel shell:
- Home / Transactions / New / Today / More,
- context/location layer,
- Find Anything entry,
- overlay/sheet ownership,
- mobile and desktop shell behavior,
- deep-link/back foundations.

The current canonical app still remains live; this shell is parallel.

**Exit gate:** real interactive parallel `UiR2Root` exists and shell acceptance passes.

### R2.0-4 — Golden Experience

Build only the approval specimen:
- Home,
- More,
- Transactions,
- one complete transaction journey,
- 360°.

Do not propagate the design across all domains yet.

Required Golden acceptance:
- Beauty Gate evidence,
- Professional UX evidence,
- 1280 / 430 / 390 / 360 / 320 real-browser evidence,
- interactive—not static—build,
- explicit user approval pinned to a concrete commit.

**Hard barrier:** no R2.0-5 work may begin while Golden user approval is false.

### R2.0-5 — Core Work Migration

After Golden approval only:
- transactions fully,
- Today,
- follow-ups,
- related documents,
- create/edit,
- lifecycle presentation.

Preserve authoritative business/data semantics.

### R2.0-6 — Records & Relationships

Migrate:
- companies,
- people/lawyers,
- documents/reports.

Use entity-first composition, not a universal card template.

### R2.0-7 — Operational Intelligence

Migrate:
- Finance,
- Operations,
- Workflow,
- Automation,
- Command Center,
- Risk/Insights,
- Copilot.

Each domain receives a task-appropriate workspace grammar inside the same Design System.

### R2.0-8 — Find Anything & Zero-Lost UX

Complete discovery across features and authoritative records.

Prove:
- feature aliases,
- record discovery,
- canonical destination navigation,
- <=3 action reachability,
- no hidden doors,
- no duplicate homes.

### R2.0-9 — Destruction & Reality QA

Real Chromium and mobile destruction across:
- 1280,
- 430,
- 390,
- 360,
- 320.

Required stress:
- keyboard,
- RTL,
- mixed Arabic/Latin,
- long names,
- large datasets,
- empty states,
- failures,
- permissions,
- back stack,
- deep links,
- overlays,
- orientation,
- reduced motion,
- 44px touch geometry,
- horizontal-overflow attacks.

No-Maze requires at least **15 real task scenarios**, all passing.

### R2.0-10 — Legacy Eradication

After new UI passes parity and No-Maze proof:
- delete old shell,
- delete old navigation,
- delete old search presentation,
- delete old CSS/presentation components/assets no longer used,
- physically remove `src/ui-v2`,
- physically remove `src/ui-rebirth`,
- preserve shared business/services/Data Layer used by Rebirth 2.0.

Legacy Eradication is mandatory, not optional cleanup.

### R2.0-11 — Canonical Promotion

Only now may `src/main.tsx` boot Rebirth 2.0.

Promotion requires simultaneously:
- explicit Golden approval,
- Beauty Gate PASS,
- Professional UX / No-Maze PASS,
- Feature Parity = 100% migrated,
- Feature Parity = 100% tested,
- unresolved capabilities = 0,
- Legacy-Zero PASS,
- palette purity PASS,
- TypeScript PASS,
- production build PASS,
- strict asset budget PASS,
- real Browser Acceptance PASS,
- cumulative business/data gates PASS.

Then and only then:
- Rebirth 2.0 becomes canonical UI,
- canonical `main` is re-certified,
- Pages/Live External is re-certified,
- project governance may explicitly decide whether Phase 5.5 can resume.

## 12. Machine enforcement

The following are not documentation-only:

- `scripts/ui-rebirth-2-freeze-audit.mjs` keeps 5.5 locked.
- `scripts/ui-rebirth-2-palette-audit.mjs` rejects foreign colors.
- `scripts/ui-rebirth-2-acceptance-audit.mjs` blocks illegal stage advancement, old-presentation imports, early Golden propagation, early runtime cutover, incomplete parity and promotion without Legacy-Zero/No-Maze/Beauty approval.

`docs/UI_UX_REBIRTH_2_0_STATE.json` records the current machine-readable stage.

The project must fail closed when these contracts are violated.

## 13. Final success criterion

Rebirth 2.0 is not accepted merely because it works, and not accepted merely because it looks good.

It is accepted only when both are true:

> **واجهة جميلة وفخمة أحب النظر إليها.**

and

> **تطبيق احترافي واضح أعرف أين أنا وكيف أصل لما أريد دون متاهة.**

Both are mandatory.