-- ENJAZ Phase 11.4-C — deployed Edge gateway fail-closed probe dispatch.
-- The function is intentionally verify_jwt=false because provider webhooks have their own
-- cryptographic signatures and dispatch has a separate server-only internal key.
-- This probe proves an unauthenticated dispatch POST is rejected by that custom boundary.

create table if not exists private.phase114c_edge_gateway_probe(
  request_id bigint primary key,
  created_at timestamptz not null default now()
);

insert into private.phase114c_edge_gateway_probe(request_id)
select net.http_post(
  url:='https://juzxriirhkuzviwnhkbd.supabase.co/functions/v1/enjaz-communications/dispatch',
  body:='{}'::jsonb,
  headers:='{"content-type":"application/json"}'::jsonb,
  timeout_milliseconds:=5000
);
