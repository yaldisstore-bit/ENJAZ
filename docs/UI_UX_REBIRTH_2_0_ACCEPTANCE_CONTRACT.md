# ENJAZ UI/UX Rebirth 2.0 — Hard Acceptance Contract

Status: **GOVERNING / FAIL-CLOSED**

This contract exists to prevent UI/UX Rebirth 2.0 from becoming either:
- a beautiful but confusing interface, or
- a clear but visually cheap / generic interface.

Neither outcome is acceptable.

## 1. Dual non-negotiable success condition

Rebirth 2.0 passes only when **both** pillars pass independently:

### A. Beauty Gate
The interface must be visibly premium, distinctive, coherent, polished and pleasant to use.

### B. Professional UX / No-Maze Gate
The interface must be obvious, predictable, discoverable and fast to navigate without memorizing a product map.

**One pillar may never compensate for failure of the other.**

- Beautiful + confusing = FAIL.
- Clear + visually cheap = FAIL.
- Feature-rich + card-wall overload = FAIL.
- Premium + obvious + fast = PASS candidate.

## 2. Beauty Gate — real acceptance, not prose

Beauty cannot be honestly reduced to a fully automatic score. Therefore the Beauty Gate is deliberately split into objective evidence plus explicit human approval.

Before any broad domain propagation beyond the Golden Experience, all of the following are mandatory:

1. Golden Experience is implemented as a real interactive build, not a static mock.
2. Required specimen scope is complete:
   - Home,
   - More / Feature Hub,
   - Transaction List,
   - one real transaction journey,
   - Transaction 360°.
3. Real visual evidence exists for at least:
   - 1280px desktop,
   - 430px,
   - 390px,
   - 360px,
   - 320px.
4. Evidence includes real loading, empty, populated, long-text and interaction states where applicable.
5. Locked five-color palette is respected.
6. Typography, spacing, hierarchy, motion, depth and composition are reviewed as one system, not page-by-page decoration.
7. **Explicit user approval is recorded against a concrete commit/build.**

No stage after Golden Experience may begin while `goldenExperience.userApproved` is false.

A screenshot being technically correct is not Beauty approval. A test suite being green is not Beauty approval. The product owner must explicitly approve the actual Golden Experience.

## 3. Professional UX / No-Maze Gate

The new interface must satisfy all of these measurable rules:

- Every major capability is reachable from Home in **at most 3 deliberate actions**.
- Every capability has exactly **one canonical home**.
- Hidden primary navigation count = **0**.
- Duplicate canonical homes count = **0**.
- Back-path failures in the acceptance suite = **0**.
- The user always has a visible/understandable current location model inside nested work.
- Find Anything resolves both features and records.
- Search result activation navigates to the result; it may not merely close an overlay.
- No normal work screen exposes the complete product map merely because the capabilities exist.
- Major mobile controls remain at least 44px where interaction requires touch.
- No horizontal overflow at 320px.
- RTL and mixed Arabic/Latin content are first-class.
- A minimum of **15 real task scenarios** must pass without requiring prior knowledge of where a feature lives.

The No-Maze evidence must include at least these task families:
- open and inspect a transaction,
- edit a transaction,
- open 360°,
- lifecycle action discovery,
- create a transaction,
- find a company,
- find a lawyer/person,
- reach Finance,
- reach Documents,
- reach Workflow,
- reach Automation,
- reach Operations,
- reach Command Center,
- reach Today/follow-ups,
- discover a feature using Find Anything.

## 4. Feature Parity Gate — 100% or no cutover

Before the old presentation layer may be removed, the current application must be inventoried into a machine-readable parity matrix.

Every approved capability must have:
- stable capability id,
- old canonical entry point,
- new canonical home,
- data/service dependency,
- migration status,
- test status,
- notes for intentional UX restructuring.

Promotion requires:
- inventory complete = true,
- total capabilities > 0,
- migrated capabilities = total capabilities,
- tested capabilities = total capabilities,
- unresolved capabilities = 0.

No feature may disappear merely because its old UI is deleted.

## 5. Presentation isolation from day one

New presentation code lives under `src/ui-r2`.

`src/ui-r2` may consume shared business/data/service boundaries, but it may not import presentation code from:
- `src/ui-v2`,
- `src/ui-rebirth`.

Forbidden legacy DNA inside `src/ui-r2` includes old shell/navigation classes or concepts such as:
- the 12-domain rail,
- brand/logo as a hidden product explorer,
- legacy domain-explorer presentation primitives,
- old UI CSS imports.

This isolation is enforced before Golden Experience exists, not postponed until final cleanup.

## 6. Legacy-Zero Gate — actual deletion

Legacy Eradication is a required stage, not an optional cleanup.

Before canonical promotion:

1. `src/main.tsx` must boot only the Rebirth 2.0 runtime.
2. `src/main.tsx` must contain no `ui-v2` or `ui-rebirth` presentation/style imports.
3. `src/ui-v2` must be physically removed.
4. `src/ui-rebirth` must be physically removed.
5. New production code must have zero presentation imports from those deleted generations.
6. Production build and browser gates must pass after deletion.

Shared business logic, repositories, services and Data Layer code are preserved when used by the new interface; Legacy-Zero targets presentation DNA, not domain capability.

## 7. Golden Experience approval is a hard stage barrier

Golden Experience consists of:
- Home,
- More,
- Transactions,
- one complete transaction journey,
- 360°.

Broad migration is forbidden until:
- Golden scope is implemented,
- visual evidence is ready,
- required browser/mobile widths pass,
- user approval is recorded against the approved commit,
- Beauty Gate = PASS,
- Professional UX Gate for Golden scope = PASS.

If the user says "جميلة لكن ما زلت أضيع" → FAIL.
If the user says "واضحة لكن شكلها رخيص/ممل" → FAIL.

## 8. Palette contract

Rebirth 2.0 uses only:
- `#F2F3F4`
- `#DED1C6`
- `#A77693`
- `#174871`
- `#0F2D4D`

No sixth color is permitted in the new presentation layer. The existing palette audit remains authoritative.

## 9. Promotion lock

Canonical promotion is forbidden unless all are true:

- Phase 5.5 remains locked during Rebirth work.
- Golden Experience explicitly approved.
- Beauty Gate passed.
- No-Maze Gate passed.
- Feature parity = 100% migrated and tested.
- Legacy-Zero passed.
- Palette purity passed.
- TypeScript passed.
- production build passed.
- strict asset budget passed.
- real Chromium/mobile acceptance passed.
- cumulative business/data gates remain green.

## 10. Machine-enforced state

`docs/UI_UX_REBIRTH_2_0_STATE.json` is the machine-readable stage state.

`docs/UI_UX_REBIRTH_2_0_FEATURE_PARITY.json` is the machine-readable inventory/parity state.

The CI acceptance audit fails if a stage is advanced without satisfying the preceding hard gate, or if Rebirth 2.0 is promoted while any required acceptance condition is false.

## 11. Final definition of success

ENJAZ Rebirth 2.0 is accepted only when the product owner can truthfully say both:

> هذه واجهة جميلة وفخمة أحب النظر إليها.

and

> هذا تطبيق احترافي واضح أعرف أين أنا وكيف أصل لما أريد دون متاهة.

Both statements are required.