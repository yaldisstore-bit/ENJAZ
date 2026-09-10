-- ENJAZ Phase 9.2 — legacy saved_views schema guard
-- Phase 1 shipped an earlier, unused saved_views shape. Phase 9.2 owns a different
-- authority contract. Never destroy legacy rows silently: only replace the legacy
-- table when it is empty, otherwise fail closed and require an explicit data migration.

begin;

do $$
declare
  v_row_count bigint:=0;
  v_is_phase92_shape boolean:=false;
begin
  if to_regclass('public.saved_views') is null then
    return;
  end if;

  select
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='owner_user_id')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='domain')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='visibility')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='definition')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='version')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='operation_id')
    and exists(select 1 from information_schema.columns where table_schema='public' and table_name='saved_views' and column_name='deleted_at')
  into v_is_phase92_shape;

  if v_is_phase92_shape then
    return;
  end if;

  execute 'select count(*) from public.saved_views' into v_row_count;
  if v_row_count<>0 then
    raise exception 'ENJAZ_SAVED_VIEWS_LEGACY_DATA_REQUIRES_MANUAL_MIGRATION'
      using errcode='P0001';
  end if;

  -- Intentionally no CASCADE: unexpected dependencies must block the migration
  -- rather than being removed implicitly.
  drop table public.saved_views;
end;
$$;

commit;
