# Phase 5.1 — Transaction List & Search — Kickoff

Status: **IN PROGRESS on `phase-5.1-transaction-list-search`**.

This document starts Phase 5.1 only. It does not declare Phase 5.1 complete and does not start Phase 5.2.

## Frozen scope

Phase 5.1 owns the transaction directory surface only:

- current transactions view;
- stalled/delayed transactions view;
- archived/closed transactions view;
- search across transaction identity/type/department/status/priority and company label;
- sorting;
- bounded pagination;
- a stable anchor for future saved-view integration.

Creation/editing remains Phase 5.2. Transaction 360° remains Phase 5.3. Lifecycle actions remain Phase 5.4. Large-list/offline/conflict destruction remains Phase 5.5.

## First implementation slice

The first slice replaces the static transaction showcase with a real feature boundary:

- `src/features/transactions/transactionListModel.ts`
- `src/features/transactions/transactionListService.ts`
- `src/features/transactions/useTransactionList.ts`
- `src/features/transactions/transactionListPreview.ts`
- `src/ui-v2/screens/TransactionListScreen.tsx`
- `src/ui-v2/styles/transaction-list.css`

The live path must stay behind Auth + Data Layer + workspace scope. Preview/CI data stays deterministic and isolated.

## Safety contracts introduced at kickoff

- deleted transactions never appear in any transaction list view;
- completed/closed/archived work is separated from current work;
- stalled/delayed work is separated from current work;
- missing company relations are explicit instead of displaying a fabricated company name;
- unsafe money precision is not formatted as an exact financial fact;
- search is normalized for common Arabic character/diacritic variants;
- the first service implementation loads the complete non-deleted workspace transaction source up to a hard 5,000-row safety ceiling and fails closed above it instead of silently showing a partial result;
- client-visible pages are bounded to 50 rows maximum.

## Exit gate still required

Phase 5.1 remains open until its dedicated architecture/functional/browser/destruction gates are added and green, the roadmap status is explicitly promoted, and the final PR is merged into canonical `main`.
