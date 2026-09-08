# Phase 8.4 — CRM, Service Catalog & Smart Intake — M6 + M17 — Kickoff

Status: **IN PROGRESS**  
Base: `010aff999e66ff31b8a813026cddbc69db30b550`  
Authorized by: **Phase 8.3 CLOSED + `phase8_4Allowed=true`**

## Purpose

Phase 8.4 creates ENJAZ's controlled front door for new commercial work before it becomes authoritative company/transaction work. It delivers the Phase 8 anchors of **M6 Service Catalog, CRM & Commercial Intake** and **M17 Smart Intake Forms & Secure Submission Links** without creating a second company, transaction, workflow or finance truth.

## M6 authority contract

CRM owns pre-transaction commercial facts only:

- service catalog items, pricing guidance, expected duration and required inputs;
- lead/prospect identity and source/referral facts;
- inquiry → qualification → quotation → acceptance/loss lifecycle;
- service requests and quotation line items;
- discount approval state;
- onboarding/readiness state before conversion;
- conversion audit preserving the original commercial request.

CRM does **not** silently become the canonical company, contact, transaction, workflow or finance ledger. Conversion into those systems is an explicit internal action and must use their authoritative tables with duplicate checks and audit.

## M17 public intake law

External intake is intentionally non-authoritative:

1. approved internal users build forms from an allow-listed field vocabulary;
2. public links use high-entropy bearer tokens; ENJAZ stores only a SHA-256 token hash;
3. links expire and can be revoked immediately;
4. public reads expose only the form/link/submission status needed by that bearer link — never workspace internals;
5. a link can resume its one incomplete draft safely until final submission, expiry or revocation;
6. external submissions enter a review queue and can never silently create internal authoritative records;
7. each approved field is explicitly mapped or rejected by an internal reviewer;
8. duplicate company/client signals must be resolved before authoritative conversion;
9. public endpoints have a server-side abuse/rate-limit boundary;
10. public/anon roles receive no direct table write authority.

## File/upload law

A filename or client JSON object is not proof that bytes were uploaded.

- Form fields may declare approved MIME types and maximum byte size.
- Submission metadata must pass server validation before it can be attached to the review queue.
- A file record remains `pending_upload` until the canonical storage pipeline acknowledges the object.
- Public intake must never claim an upload succeeded merely because local metadata exists.
- No permissive anonymous storage-table policy is introduced as a shortcut. Signed/canonical upload acknowledgement is required before Phase 8.4 closure can claim the complete mobile camera/file journey.

## Conversion law

Reviewed CRM/intake data can become authoritative only through guarded internal RPCs:

- caller must be an authenticated member of the same workspace;
- lead/request/quotation state must be eligible for conversion;
- duplicate company/contact candidates are checked first;
- a duplicate candidate without an explicit reuse decision fails closed;
- new company/contact/transaction rows are created only inside the conversion transaction;
- commercial quotation facts do not post finance-ledger entries;
- conversion creates a permanent audit row linking source lead/intake to resulting authoritative IDs;
- replay after conversion returns the existing conversion instead of duplicating core records.

## Required destructive evidence before closure

- schema/FK/index/RLS/privilege audit;
- anon cannot read/write CRM or intake tables directly;
- raw public tokens never persist in database rows, logs or browser storage;
- expired/revoked/malformed token rejection;
- public link cross-workspace isolation;
- public rate-limit/abuse boundary;
- draft → resume → final submit journey;
- required/conditional field validation;
- MIME/size validation and real upload acknowledgement boundary;
- reviewer accept/reject/map audit;
- duplicate company/contact fail-closed conversion;
- quotation total/discount approval invariants;
- conversion replay/idempotency and original-request preservation;
- authenticated Real Cloud round trip;
- Real Chromium/mobile acceptance at 1280/430/390/360/320;
- Android keyboard/back/reload/deep-link/long Arabic/dense review-queue stress;
- production bundle hard-budget enforcement without raising the 670000-byte cap;
- exact-head PR-wide regression and exact merged-SHA Pages/live-external recertification;
- zero Critical/High/functional blocker defects.

## Successor lock

**Phase 8.5 — Multi-Branch / Departments / Teams — M15 foundation remains LOCKED.**

It is not authorized until Phase 8.4 is formally closed with M6/M17 schema, permissions, service layer, complete live journeys, destructive tests, Real Cloud, Real Browser and post-merge evidence.
