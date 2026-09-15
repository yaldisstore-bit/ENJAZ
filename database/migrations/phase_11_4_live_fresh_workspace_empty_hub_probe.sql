-- Phase 11.4-D fresh-workspace Real Cloud certificate.
-- Creates a brand-new empty workspace under an existing authenticated actor,
-- proves the hub returns no manufactured communications/provider state, then rolls back.

begin;

do $$
declare
  v_actor uuid;
  v_workspace uuid := gen_random_uuid();
  v_hub jsonb;
begin
  select wm.user_id into v_actor
  from public.workspace_memberships wm
  order by wm.created_at
  limit 1;
  if v_actor is null then raise exception 'PHASE114D_FRESH_NO_ACTOR'; end if;

  insert into public.workspaces(id,owner_user_id,name,timezone,locale,currency)
  values(v_workspace,v_actor,'Phase 11.4-D Fresh Workspace Probe','Asia/Baghdad','ar-IQ','IQD');
  insert into public.workspace_memberships(workspace_id,user_id,role)
  values(v_workspace,v_actor,'owner');

  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;

  v_hub := public.get_communications_hub_v1(v_workspace,null,null,60);
  if coalesce((v_hub->'summary'->>'conversationCount')::int,-1) <> 0 then raise exception 'PHASE114D_FRESH_CONVERSATIONS_NOT_ZERO %',v_hub; end if;
  if coalesce((v_hub->'summary'->>'unreadCount')::int,-1) <> 0 then raise exception 'PHASE114D_FRESH_UNREAD_NOT_ZERO %',v_hub; end if;
  if coalesce((v_hub->'summary'->>'reviewCount')::int,-1) <> 0 then raise exception 'PHASE114D_FRESH_REVIEW_NOT_ZERO %',v_hub; end if;
  if jsonb_array_length(coalesce(v_hub->'conversations','[]'::jsonb)) <> 0 then raise exception 'PHASE114D_FRESH_CONVERSATION_ROWS'; end if;
  if jsonb_array_length(coalesce(v_hub->'timeline','[]'::jsonb)) <> 0 then raise exception 'PHASE114D_FRESH_TIMELINE_ROWS'; end if;
  if jsonb_array_length(coalesce(v_hub->'reviewQueue','[]'::jsonb)) <> 0 then raise exception 'PHASE114D_FRESH_REVIEW_ROWS'; end if;
  if jsonb_array_length(coalesce(v_hub->'providerAccounts','[]'::jsonb)) <> 0 then raise exception 'PHASE114D_FRESH_PROVIDER_ROWS'; end if;

  reset role;
  raise notice 'ENJAZ PHASE 11.4-D FRESH WORKSPACE EMPTY HUB PROBE PASS';
end;
$$;

rollback;
