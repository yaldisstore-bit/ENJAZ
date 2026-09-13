-- ENJAZ Phase 10.1 — create a disposable Auth user through the public Auth API.
-- Credentials are generated inside Postgres and never returned to clients.

alter table private.phase10_1_probe_requests
  add column if not exists probe_email text;

with probe as (
  select
    'enjaz.vault.probe.'||replace(gen_random_uuid()::text,'-','')||'@example.com' as email,
    'Vz9!'||replace(gen_random_uuid()::text,'-','')||'qA7#' as password
), dispatched as (
  select email,
    net.http_post(
      url := 'https://juzxriirhkuzviwnhkbd.supabase.co/auth/v1/signup',
      body := jsonb_build_object('email',email,'password',password),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey','sb_publishable_QL0eBUXHR6cSAVbINSkyWA_pIGyQ1oJ'
      ),
      timeout_milliseconds := 10000
    ) as request_id
  from probe
)
insert into private.phase10_1_probe_requests(kind,request_id,created_at,probe_email)
select 'temp_user_signup',request_id,now(),email from dispatched
on conflict(kind) do update
set request_id=excluded.request_id,created_at=excluded.created_at,probe_email=excluded.probe_email;
