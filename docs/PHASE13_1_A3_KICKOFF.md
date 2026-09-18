# Phase 13.1-A3 — Read-only Intake Destruction & Closure Readiness

**Status:** IN PROGRESS  
**A2 certificate:** Gate #5 / `35395538307` — PASS on `b63ce1c5591d7ff9f54bb69efcabbe685cdef95f`  
**Successor:** Phase 13.2 — Normalize & Map — LOCKED

## Objective

Destroy the 13.1 read-only intake boundary before Phase 13.1 becomes eligible for an implementation PR.

A3 adds no import feature. It hardens and attacks A1/A2 only.

## Hardening

A3 requires snapshot and record safety ceilings to use **real UTF-8 byte length**, not JavaScript character count. This matters for Arabic and other multi-byte legacy content.

## Destruction dimensions

- 5,001-record overflow;
- UTF-8 multi-byte record overflow;
- nested JSON depth overflow;
- oversized arrays / wide objects;
- hostile target/mapping control fields;
- duplicate-key storms;
- dangling-link storms;
- exact-label anti-alias behavior;
- deterministic replay;
- input mutation trap;
- preserved opaque Arabic fields;
- zero persistence / normalization / target assignment / import authority.

## Closure-readiness law

A3 may prove Phase 13.1 ready for PR certification, but it may not:
- set Phase 13.1 CLOSED;
- authorize Phase 13.2;
- create a mapping;
- write to Supabase;
- add DB tables/RPCs/Edge functions;
- add client UI;
- raise bundle budgets.

## A2 certificate preserved

- A2 Gate #5 / `35395538307`: PASS.
- A2 tests: **10/10 PASS**.
- functional regression: **219/219 PASS**.
- DB self-test: **25/25 PASS**.
- build: **431032 / 670000 initial JS; 759568 / 760000 total JS; 179989 / 180000 CSS**.

## Successor lock

**Phase 13.2 remains LOCKED.**
