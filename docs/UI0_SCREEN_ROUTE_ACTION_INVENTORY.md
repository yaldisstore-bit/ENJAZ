# UI-0 — Screen, Route & Action Inventory

Baseline: `cb217b460d433d221fcecbe2b2ff994a0c16916d`

Purpose: capture what ENJAZ currently exposes or reserves before the UI is rebuilt. This inventory separates **implemented product behavior**, **reserved route contracts**, and **temporary preview UI**.

## A. Current product route contract

| Route | Label / purpose | Contract state at baseline | UI/UX V2 rule |
|---|---|---:|---|
| `/app` | الرئيسية | implemented | Preserve Home business model/data; rebuild presentation |
| `/app/today` | اليوم / Daily Work | reserved | Preserve route; original roadmap 4.2 remains HOLD |
| `/app/transactions` | المعاملات | reserved | Preserve route and destination |
| `/app/companies` | الشركات | reserved | Preserve route and destination |
| `/app/people` | الأشخاص والمحامون | reserved | Preserve route and destination |
| `/app/finance` | المالية | reserved | Preserve route and destination |
| `/app/workflows` | سير العمل | reserved | Preserve route and destination |
| `/app/automation` | الأتمتة | reserved | Preserve route and destination |
| `/app/operations` | مركز العمليات | reserved | Preserve route and destination |
| `/app/command` | مركز القيادة | reserved | Preserve route and destination |
| `/app/risk` | المخاطر | reserved | Preserve route and destination |
| `/app/saved-views` | العروض المحفوظة | reserved | Preserve route and destination |
| `/app/intelligence` | الرؤى | reserved | Preserve route and destination |
| `/app/documents` | الوثائق | reserved | Preserve route and destination |
| `/app/reports` | التقارير | reserved | Preserve route and destination |
| `/app/notifications` | الإشعارات | reserved | Preserve route and destination |
| `/app/follow-ups` | المتابعات | reserved | Preserve route and destination |
| `/app/copilot` | مساعد إنجاز | reserved | Preserve route and destination |

Primary navigation contract also reserves: Home, Today, Transactions, Companies and More. Secondary navigation contains People, Finance, Workflow, Automation, Operations, Command, Risk, Saved Views, Intelligence, Documents, Reports, Notifications, Follow-ups and Copilot.

## B. Authentication route contract

The route registry preserves:

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/update-password`

Auth domain/services/state and route guards are KEEP. Their current visual screens are not design authority and may be rebuilt.

## C. Current mounted runtime surfaces

At baseline, `src/main.tsx` mounts `RebirthRoot`, which mounts `RebirthAppShell` using `REBIRTH_HOME_PREVIEW_STATE`.

### C1. App Shell — currently visible

Header:
- ENJAZ brand mark/name.
- Active section label.
- Search button.
- Notifications button with indicator.
- Account/avatar button.

Bottom navigation:
- الرئيسية.
- اليوم.
- المعاملات.
- المزيد.
- Center primary `+` action.

Quick action sheet:
- معاملة جديدة.
- متابعة جديدة.
- شركة جديدة.
- مستند جديد.
- Close action.
- Backdrop close.
- Escape close.
- Focus trap / focus restoration behavior.

Important: current quick-action buttons close the sheet but do not yet perform authoritative create flows. Preserve the **intended capabilities**, not this placeholder behavior.

### C2. Home — currently visible

States:
- Loading state.
- Error state with optional retry.
- Ready state.
- Clear/no-critical-priority state.

Ready-state information/actions:
- Active transaction count.
- Urgent transaction count.
- Open follow-up count.
- Overdue follow-up count.
- Critical blocker count.
- `افتح عمل اليوم` -> Today destination.
- Priority mosaic (up to 4) -> each priority destination.
- `كل المعاملات` -> Transactions destination.
- Finance summary: collected against active fees, total active fees, outstanding active, precision-safety state, collection percentage.
- Operational signal stack.
- `العمل اليومي` -> Today destination.

Product rule: these Home facts/calculations belong to the Home model/data layer and must survive. Current geometry/CSS/composition does not.

## D. Current runtime anomaly — must not become a preservation target

`RebirthConnectedHomeDashboard` exists and consumes the real `useHomeDashboard` hook, but it is not the component mounted by `RebirthRoot` at the baseline. `RebirthRoot` injects preview state directly.

Therefore UI/UX V2 must preserve/reconnect the connected data path and must **not** preserve preview-state wiring as production architecture.

## E. Foundation/demo routes

The route registry also contains `/foundation/*` identity/tokens/typography/components/motion/mobile/pattern/shell/navigation/interactions/destruction previews. These are development/design-system proof surfaces, not product-domain destinations.

During UI/UX V2 they may be replaced by a new V2 showcase or removed from production runtime, provided their useful test/design contracts are not silently lost.

## F. Inventory classification

### KEEP behavior
- Auth/session/security behavior.
- Supabase/data gateways and repositories.
- Route IDs and domain destination semantics.
- Home data model/calculations/load-state behavior.
- Accessibility behavior worth preserving: focus management, escape close, modal semantics, reduced-motion/mobile contracts where applicable.

### REBUILD presentation
- Header geometry.
- Dock/bottom-nav geometry.
- Center action geometry.
- Search/notification/avatar visuals.
- Quick-action sheet visuals and composition.
- Home hero, cards, mosaic, finance surface, signal stack and closing CTA composition.
- All CSS in the current visual generation.

### ADAPT integration
- Navigation adapter from new UI to `ROUTES` / navigation contract.
- Connected Home adapter to `useHomeDashboard`.
- Auth view adapters to existing auth state/services.
- Future domain-screen adapters as original roadmap implementations become available.
