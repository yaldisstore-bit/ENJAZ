-- ENJAZ Phase 11.1 — notification FK performance hardening
begin;

create index in_app_notifications_user_fk_idx
  on public.in_app_notifications(user_id);

commit;
