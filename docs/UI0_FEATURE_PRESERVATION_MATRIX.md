# UI-0 — Feature Preservation Matrix

Baseline: `cb217b460d433d221fcecbe2b2ff994a0c16916d`

This matrix is the anti-loss contract for UI/UX Rebirth V2. A row may move visually, but it may not disappear or change business meaning merely because the UI is rebuilt.

| Capability / contract | Authoritative source | Baseline status | Preservation class | UI/UX V2 destination | Acceptance proof |
|---|---|---|---|---|---|
| Supabase client/config | `src/core/supabase/`, `src/core/config/` | implemented | KEEP | consumed by adapters, never restyled/duplicated | same environment/client contracts |
| Database schema/migrations/RLS direction | `database/` | implemented | KEEP | outside visual layer | no UI stage modifies schema/RLS unintentionally |
| Data contracts/ports/repositories | `src/data/` | implemented | KEEP | data adapters into V2 screens | same typed contracts and repository behavior |
| Auth domain/services/state | `src/features/auth/`, `src/core/auth/` | implemented | KEEP | new V2 auth screens | login/signup/recovery/update use existing contracts |
| Session behavior | `src/shared/session/` | implemented | KEEP | V2 root/session gate | same session semantics and recovery |
| Route registry | `src/core/routing/routes.ts` | implemented | KEEP | V2 router/navigation adapter | every product route remains addressable/reserved |
| Navigation semantics/access/back behavior | `src/core/routing/navigationContract.ts` | implemented | KEEP | V2 navigation adapter | active state/back/access semantics preserved |
| Home model and calculations | `src/features/home/homeDashboardModel.ts` | implemented | KEEP | V2 Home | same facts, counts, finance math and signals |
| Home connected loading | `src/features/home/useHomeDashboard.ts` | implemented | KEEP | V2 connected Home adapter | no production preview-state substitution |
| Home loading state | Home load-state contract | implemented | KEEP behavior / REBUILD visuals | V2 Home loading | loading remains truthful and accessible |
| Home error + retry | Home load-state contract | implemented | KEEP behavior / REBUILD visuals | V2 Home error surface | retry still invokes authoritative reload |
| Home ready state | Home model | implemented | KEEP behavior / REBUILD visuals | V2 Home composition | all approved facts remain visible/reachable |
| Home -> Today CTA | `ROUTES.appToday` | destination reserved | KEEP intent | V2 Home | CTA reaches Today route/surface |
| Home -> Transactions CTA | `ROUTES.appTransactions` | destination reserved | KEEP intent | V2 Home | CTA reaches Transactions route/surface |
| Priority item destination | Home priority model | implemented | KEEP | V2 priority composition | each item keeps its destination semantics |
| Finance snapshot on Home | Home finance model | implemented | KEEP data / REBUILD visuals | V2 Home finance module | collected/fees/outstanding/precision preserved |
| Operational signals on Home | Home signal model | implemented | KEEP data / REBUILD visuals | V2 Home signal pattern | label/detail/value/tone preserved |
| Primary nav: Home | navigation contract | implemented | KEEP intent / REBUILD visuals | V2 dock | Home reachable |
| Primary nav: Today | navigation contract | reserved | KEEP | V2 dock | Today route retained while Phase 4.2 is HOLD |
| Primary nav: Transactions | navigation contract | reserved | KEEP | V2 dock | Transactions route retained |
| Primary nav: Companies | navigation contract | reserved | KEEP | V2 dock or mapped primary composition | Companies route retained |
| Primary nav: More | navigation contract | implemented as grouping contract | KEEP grouping semantics / REBUILD visuals | V2 secondary navigation | all secondary routes reachable |
| People/Lawyers destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Finance destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Workflows destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Automation destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Operations Center destination | navigation contract | reserved | KEEP | V2 secondary/global entry | route preserved |
| Command Center destination | navigation contract | reserved | KEEP | V2 secondary/global entry | route preserved |
| Risk destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Saved Views destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Intelligence destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Documents destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Reports destination | navigation contract | reserved | KEEP | V2 secondary navigation | route preserved |
| Notifications destination | navigation contract | reserved | KEEP | V2 header/global surface | route preserved |
| Follow-ups destination | navigation contract | reserved | KEEP | V2 global/secondary surface | route preserved |
| Copilot destination | navigation contract | reserved | KEEP | V2 secondary/global surface | route preserved |
| Search entry point | current shell intent + Phase 3 contract | visually present, behavior incomplete | KEEP intent / REBUILD implementation | V2 global search | search entry cannot disappear |
| Notification entry point | current shell intent + Phase 3 contract | visually present, behavior incomplete | KEEP intent / REBUILD implementation | V2 global notification surface | entry cannot disappear |
| Account/profile entry | current shell intent | visually present | KEEP intent / REBUILD implementation | V2 account/workspace surface | account access remains available |
| Global primary create action | current shell intent + Phase 3 contract | present | KEEP intent / REBUILD implementation | integrated V2 dock action | action remains globally reachable |
| Create transaction quick action | current quick-action contract | placeholder visual action | KEEP intent | V2 create action system | maps to authoritative create flow when original roadmap implementation exists |
| Create follow-up quick action | current quick-action contract | placeholder visual action | KEEP intent | V2 create action system | maps to authoritative follow-up flow when implemented |
| Create company quick action | current quick-action contract | placeholder visual action | KEEP intent | V2 create action system | maps to authoritative company create flow when implemented |
| Add document quick action | current quick-action contract | placeholder visual action | KEEP intent | V2 create action system | maps to authoritative document flow when implemented |
| Modal/sheet focus trap | current shell accessibility behavior | implemented | KEEP behavior / REBUILD code if needed | V2 overlays | keyboard focus remains contained/restored |
| Escape close | current shell accessibility behavior | implemented | KEEP behavior | V2 overlays | Escape closes dismissible modal/sheet |
| RTL | project contract | implemented directionally | KEEP requirement | all V2 UI | full RTL remains first-class |
| Android safe area/keyboard/back | core/mobile + roadmap contract | implemented/protected contract | KEEP requirement | V2 shell/forms/overlays | no hidden fields/nav/collisions |
| Approved reference-screen map | `docs/UI_REBIRTH_REFERENCE_MAP.md` | approved reference | KEEP as reference | UI-2 onward | composition decisions trace to reference families |
| Current `ui-rebirth` CSS/layout | `src/ui-rebirth/*` | current visual generation | REBUILD | replaced by clean V2 presentation boundary | no dependency retained solely for appearance |
| Current preview Home state | `src/ui-rebirth/preview/` | active temporary wiring | REBUILD / REMOVE from production path | V2 dev fixtures only | production V2 uses connected data path |

## Matrix rules

1. `KEEP` means behavior/business meaning is protected, not that file structure can never be refactored.
2. `REBUILD` means no visual compatibility obligation exists.
3. `reserved` routes are still preservation obligations: the redesign may not delete them because their original-roadmap implementation is later.
4. A placeholder UI action is not proof of a completed product feature; preserve its approved intent and map it to the original roadmap implementation point.
5. UI/UX V2 does not advance original roadmap delivery phases. It only prepares/rebuilds their presentation surfaces and destinations.
6. Any future UI stage that cannot identify a row's destination fails preservation review.
