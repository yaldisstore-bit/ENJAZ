-- ENJAZ Phase 10.1 — real network transport probe dispatch.
-- Uses only the public publishable key. Response is read separately from pg_net.

create table if not exists private.phase10_1_probe_requests (
  kind text primary key,
  request_id bigint not null,
  created_at timestamptz not null default now()
);

insert into private.phase10_1_probe_requests(kind,request_id,created_at)
values (
  'anonymous_auth',
  net.http_post(
    url := 'https://juzxriirhkuzviwnhkbd.supabase.co/auth/v1/signup',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_QL0eBUXHR6cSAVbINSkyWA_pIGyQ1oJ'
    ),
    timeout_milliseconds := 10000
  ),
  now()
)
on conflict(kind) do update
set request_id=excluded.request_id,created_at=excluded.created_at;
