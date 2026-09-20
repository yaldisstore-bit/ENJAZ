# Phase 14.1 — A2 internal linked-read slice (not a cloud certificate)

Branch: `phase14-1-a2-linked-read-proof`. This step follows merged A1 PR #224, exact PR head `11a82fdc7ab61c0a9d9245dd67bff90b609dfd90` (81 SUCCESS, 1 expected SKIPPED, 0 failed in 82 completed runs), and exact A1 main `665fcc63a5919e4ad80d0b01b8f54914d15bad0c` (36/36 SUCCESS including Quality, Real Browser, Pages and Live External). A1 is source-certified, **not** an integrated product journey.

## Implemented in this slice
`src/features/journeys/crossDomainJourneyReadProof.ts` composes the existing authenticated workspace data-layer repositories without new tables, RPC, Edge, generic writes or shadow persistence. It loads one company and its transaction, then existing workflow instances, follow-ups, payments and reversals, and linked documents. It checks source IDs and workspace IDs on every returned row, checks payment/company and reversal/payment provenance, rejects incomplete 100-row pages, and re-checks root versions and the actor workspace after the reads. Archived transactions remain internal; this read proof makes **no** client-portal visibility claim.

`tests/phase14-1-a2-linked-read.test.ts` covers positive linked reads, invalid actor/ID, missing and mismatched root records, foreign-workspace children, forged company and reversal links, truncated lists, root version and actor-workspace drift, and archived internal-only behavior. Independent workflow `phase14-1-a2-linked-read.yml` runs the real TypeScript module's tests and existing typecheck/build/budget gates; it does not pretend to run hosted Supabase or an integrated browser journey.


## A2 financial source crosscheck (additional source slice)

`src/features/journeys/crossDomainJourneyFinanceProof.ts` invokes the existing read-only `FinanceCommandGateway.getReceipt` for each linked payment, matches authoritative receipt ID/company/transaction/workspace caller scope, method, receipt reference and exact bigint cents, reconciles one reversal per payment with the existing reversal rows, and rejects an orphan/duplicate reversal, sub-cent/unsafe number, inconsistent posted/reversed states or mismatched IDs. It returns only an *observed payment subtotal*, never a complete finance ledger, accounting balance, cross-domain atomicity claim or client authorization. The independent A2 workflow also runs the dedicated eight-case financial negative test file; no finance write RPC or new shadow ledger is introduced.

## Remaining non-negotiable exit gates
A2 must still run **a real authenticated, durable complete journey** through the actual linked domain commands using an explicitly isolated Supabase target. Check owner/member/outsider/client denial, create → refresh → read, retry/offline, monetary reversal, field handoff, document provenance, archive/restore and zero Auth/data residue. A3 must independently exercise Chromium at 1280/430/390/360/320 with published portal/RTL, keyboard/back/network recovery. Then complete exact-head regressions, merge, exact-main deployed-live recertification and a separate closure decision.

No destructive probe is authorized on production `juzxriirhkuzviwnhkbd`. The isolated-hosted execution target and test credentials must be independently validated before running the destructive part. Source/unit success must leave Phase 14.1 IN_PROGRESS, Phase 14.2 LOCKED and A2 Real Cloud / A3 Real Browser NOT_STARTED.
