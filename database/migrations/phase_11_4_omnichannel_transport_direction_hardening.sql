-- ENJAZ Phase 11.4-B — transport direction integrity hardening
-- A provider transport attempt must agree with both the configured provider channel
-- and the canonical communication direction. Internal communications cannot carry
-- provider transport evidence.

begin;

create or replace function private.validate_communication_transport_scope_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_account_channel text;
  v_communication_channel text;
  v_communication_direction text;
begin
  select pa.channel into v_account_channel
  from public.communication_provider_accounts pa
  where pa.workspace_id=new.workspace_id and pa.id=new.provider_account_id;

  select c.channel,c.direction into v_communication_channel,v_communication_direction
  from public.communications c
  where c.workspace_id=new.workspace_id and c.id=new.communication_id;

  if v_account_channel is null or v_communication_channel is null then
    raise foreign_key_violation using message='ENJAZ_COMMUNICATION_TRANSPORT_SCOPE_INVALID';
  end if;
  if v_account_channel<>v_communication_channel then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TRANSPORT_CHANNEL_MISMATCH';
  end if;
  if v_communication_direction not in ('incoming','outgoing') or v_communication_direction<>new.direction then
    raise invalid_parameter_value using message='ENJAZ_COMMUNICATION_TRANSPORT_DIRECTION_MISMATCH';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_communication_transport_scope_v1() from public,anon,authenticated;

commit;
