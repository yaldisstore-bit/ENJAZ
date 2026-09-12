# Phase 9.6 — Real Browser Evidence

Status: **PASS**

Phase: **9.6 — Process Mining & Predictive Operations — M18**

Certified implementation head: `82a4a59bac08389ee7e200b497df8e75b914e39a`

GitHub Actions run: `34694922275`

Workflow: `ENJAZ Phase 9.6 — Process Mining Real Browser`

## Browser matrix

Real Chromium passed at all governed widths:

- `1280 × 900`
- `430 × 932`
- `390 × 844`
- `360 × 740`
- `320 × 720`

## Certified behaviors

The isolated browser harness uses the production `ProcessIntelligencePanel`, `IntelligenceViewTabs`, compact runtime contracts, and certified R2 styling. The fixture contains six process cases, including four prediction-eligible cases, an equal-time partial-order case, and a rework case.

The browser run proved:

- Business Intelligence remains the default `insights` view when `view=process` is absent.
- Switching to Process Intelligence adds `view=process` without creating a second IA destination.
- Browser back, forward, and reload preserve the governed query-driven view behavior.
- Process authority remains `read-only-derived` and provenance remains required.
- Six observed process cases render without fabricating source history.
- Equal-time evidence remains visibly `partial` and is never presented as strict ordering.
- Rework and threshold-governed bottleneck surfaces are visible.
- Next-activity prediction discloses `empirical_next_activity_frequency`, directional confidence, sample count, evidence count, and integer-derived probability.
- Delay prediction discloses `empirical_wait_threshold_frequency`, directional confidence, sample count, delayed sample count, and governed threshold.
- Threshold controls for 4, 24, and 72 hours change the delay contract deterministically.
- Equal-time events are explicitly excluded from delay samples.
- Actor-scoped sync receipts are disclosed as integrity-only and are not process-path input.
- No horizontal overflow was observed in document, body, or main content at any governed width.
- No page errors or console errors were observed.
- Failure diagnostics upload was skipped because the browser acceptance step succeeded.

## Governance

This evidence certifies only Real Browser behavior for Phase 9.6. It does not certify published Pages/Live behavior and does not authorize Phase 9.7. M18 remains `ACTIVE` and globally open for its Phase 15 anchor.
