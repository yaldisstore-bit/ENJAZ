-- ENJAZ Phase 10.1 — remove temporary pg_net probe bookkeeping.
-- Network responses remain governed by pg_net's own retention lifecycle.

drop table if exists private.phase10_1_probe_requests;
