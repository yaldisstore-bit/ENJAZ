# UI-6 — Core Screens Rebirth

Status: closure evidence for the independent `ENJAZ UI/UX REBIRTH V2` roadmap.

## Purpose

UI-6 promotes UI V2 from design/composition proof surfaces into the default user-facing core runtime. It rebuilds the core experience while keeping the original Master Roadmap frozen at Phase 4.2 and without changing domain/data/Supabase contracts.

The normal UI V2 runtime is now `CoreApp`. UI-3 Component Gallery and UI-5 Composition Atlas remain available only as regression harnesses through explicit query switches, so previous-stage visual contracts remain testable without leaking proof/developer surfaces to normal users.

## Core surfaces delivered

### Home
- asymmetric gold priority focal zone;
- dark executive signal zone;
- compact operational metrics;
- dense current-work queue;
- critical `فتح المعاملة` action remains above the fixed dock on target phones.

### Daily Work
- date strip;
- next-task focal zone;
- operational timeline;
- remaining-work rows;
- `متابعة جديدة` enters Quick Create with Follow-up already selected;
- `بدء المهمة` remains above the fixed dock on target phones.

### Operations / Command
- operations pulse, ownership and near schedule;
- dedicated Command Center mode rather than a generic list or recolored Home screen;
- dark executive focal composition with cross-domain intervention modules;
- explicit transition `فتح مركز القيادة` / `العودة للعمليات`.

### Finance entry
- cobalt/deep-blue focal surface;
- collected/outstanding money hierarchy;
- financial trend visualization;
- compact ledger rows.

## Global interaction surfaces promoted to product surfaces

`AppShell` now provides:

- **Global Search** with mixed transaction/company/lawyer results and real typing interaction;
- **Notifications / Attention** with priority hierarchy;
- **Quick Create** with transaction, follow-up, party, payment and more choices plus selected-state feedback;
- **Account / Workspace** entry with workspace identity and account actions.

The previous user-facing preview wording such as “test”, “proof” or “experimental results” is removed from the default core runtime.

## Runtime separation

`UiV2Root` now behaves as follows:

- normal route → `CoreApp`;
- `?ui3-gallery=1` → UI-3 component regression harness;
- `?ui5-atlas=1` → UI-5 composition regression harness.

This keeps older stage gates cumulative instead of disabling them when the product runtime advances.

## Real browser Reality Gate

`scripts/ui6-reality-test.mjs` runs against a real Vite runtime and Chromium at:

- 1280×900
- 430×932
- 390×844
- 360×740
- 320×700

The browser journey executes:

1. Home rendering and hierarchy;
2. critical Home CTA dock-clearance on phones;
3. Bottom Dock navigation to Today;
4. critical Today CTA dock-clearance on phones;
5. `متابعة جديدة` → Quick Create with Follow-up selected;
6. Operations → Command Center → Operations;
7. Global Search with Arabic input and mixed results;
8. Notifications sheet;
9. Account / Workspace sheet;
10. central Quick Create and payment selection;
11. Finance entry;
12. persistent Bottom Dock, 44px mobile targets, zero horizontal overflow, and zero console/page errors.

Screenshots are captured for Home, Today, Command, Search and Finance at all five target sizes.

## Defects caught during UI-6

### 1. First Chromium journey failed on ambiguous Sheet close targeting

The first UI-6 browser run reached the real interaction stage but failed because a Sheet contained two legitimate controls named `إغلاق`: the header close affordance and a secondary text button. The test used a page-global role lookup and Playwright strict mode correctly rejected the ambiguity.

**Fix:** the browser gate now scopes Sheet closure to the active dialog header (`dialog.getByLabel('إغلاق')`). This improves test precision without weakening user interaction coverage.

### 2. Previous-stage gates had to remain cumulative after runtime promotion

Moving the default runtime from Composition Atlas to `CoreApp` could have made UI-4/UI-5 tests obsolete.

**Fix:** UI-4 structural audit now recognizes AppShell-backed `CoreApp`, while UI-5 Reality Gate explicitly opens `?ui5-atlas=1`. UI-3 remains available through `?ui3-gallery=1`.

## Closure evidence

Implementation head reviewed manually: `9a4bb4a8fe5816a85d8ae784e7f5a1675081d910`.

On that head:

- UI-1 Boundary Gate: PASS — run `33881818950`
- UI-3 Component Reality Gate: PASS — run `33881818960`
- UI-4 App Shell Reality Gate: PASS — run `33881818973`
- UI-5 Composition Reality Gate: PASS — run `33881818975`
- UI-6 Core Screens Reality Gate: PASS — run `33881819087`
- 46 functional regression tests: PASS
- TypeScript: PASS
- production build: PASS
- real Chromium core journey at all five target sizes: PASS

The second UI-6 Chromium run explicitly reported:

`UI-6 Reality Gate PASS: desktop-1280, phone-430, phone-390, phone-360, phone-320`

## Manual visual evidence review

The final screenshots were manually reviewed after the green browser run.

Verified:

- Home preserves asymmetric gold/charcoal hierarchy and critical CTA clearance;
- Today keeps time/task hierarchy and visible `بدء المهمة` action;
- Command Center is visually distinct, dark and executive rather than a generic stacked list;
- Search is readable and viewport-safe at narrow widths with Arabic mixed results;
- Finance preserves its cobalt identity and dense ledger treatment;
- no obvious legacy UI DNA, clipping or cheap equal-card wall was accepted in the reviewed core surfaces.

## Exit

UI-6 is eligible to close only after the documentation/roadmap closure head passes the same cumulative UI-1, UI-3, UI-4, UI-5 and UI-6 gates together.

After merge, the next independent stage is **UI-7 — Domain-by-Domain Rebuild**. The original `ENJAZ_MASTER_ROADMAP.md` remains untouched and **Phase 4.2 stays on HOLD** until UI/UX Rebirth V2 is fully frozen.
