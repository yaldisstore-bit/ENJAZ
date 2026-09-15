-- ENJAZ Phase 11.4-C — Supabase advisor hardening.
-- Public authenticated RPCs are SECURITY INVOKER façades over private, membership-checking
-- SECURITY DEFINER implementations, matching the established M3 command pattern.
-- Add covering indexes for new foreign keys and remove a redundant communication index.

begin;

-- Performance advisor: cover new FK access paths.
drop index if exists public.communication_outbound_commands_communication_idx;
create index communication_templates_created_by_idx on public.communication_templates(created_by);
create index communication_templates_updated_by_idx on public.communication_templates(updated_by);
create index communication_outbound_commands_template_idx on public.communication_outbound_commands(workspace_id,template_id) where template_id is not null;
create index communication_outbound_commands_requested_by_idx on public.communication_outbound_commands(requested_by);
create index communication_outbound_commands_decided_by_idx on public.communication_outbound_commands(decided_by) where decided_by is not null;
create index communication_document_links_created_by_idx on public.communication_document_links(created_by) where created_by is not null;
create index communication_conversion_receipts_actor_idx on public.communication_conversion_receipts(actor_user_id);

-- Move authenticated SECURITY DEFINER commands behind non-definer public façades.
alter function public.save_communication_template_v1(uuid,uuid,integer,text,text,text,text,text,boolean) rename to save_communication_template_v1_impl;
alter function public.save_communication_template_v1_impl(uuid,uuid,integer,text,text,text,text,text,boolean) set schema private;

alter function public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) rename to prepare_communication_outbound_v1_impl;
alter function public.prepare_communication_outbound_v1_impl(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) set schema private;

alter function public.decide_communication_outbound_v1(uuid,uuid,integer,text,text) rename to decide_communication_outbound_v1_impl;
alter function public.decide_communication_outbound_v1_impl(uuid,uuid,integer,text,text) set schema private;

alter function public.relink_communication_v1(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) rename to relink_communication_v1_impl;
alter function public.relink_communication_v1_impl(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) set schema private;

alter function public.create_transaction_followup_v1(uuid,uuid,uuid,text,timestamptz) rename to create_transaction_followup_v1_impl;
alter function public.create_transaction_followup_v1_impl(uuid,uuid,uuid,text,timestamptz) set schema private;

alter function public.convert_communication_to_followup_v1(uuid,uuid,text,uuid,text,timestamptz) rename to convert_communication_to_followup_v1_impl;
alter function public.convert_communication_to_followup_v1_impl(uuid,uuid,text,uuid,text,timestamptz) set schema private;

alter function public.convert_communication_to_task_v1(uuid,uuid,text,uuid,text,timestamptz) rename to convert_communication_to_task_v1_impl;
alter function public.convert_communication_to_task_v1_impl(uuid,uuid,text,uuid,text,timestamptz) set schema private;

alter function public.convert_communication_to_document_request_v1(uuid,uuid,text,uuid,uuid,text,text,timestamptz) rename to convert_communication_to_document_request_v1_impl;
alter function public.convert_communication_to_document_request_v1_impl(uuid,uuid,text,uuid,uuid,text,text,timestamptz) set schema private;

create function public.save_communication_template_v1(
  p_workspace_id uuid,p_template_id uuid,p_expected_version integer,p_channel text,p_name text,
  p_subject_template text,p_body_template text,p_sensitivity text default 'standard',p_active boolean default true
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.save_communication_template_v1_impl($1,$2,$3,$4,$5,$6,$7,$8,$9);
$$;

create function public.prepare_communication_outbound_v1(
  p_workspace_id uuid,p_provider_account_id uuid,p_idempotency_key text,p_endpoint_fingerprint text,
  p_contact_id uuid,p_transaction_id uuid,p_conversation_id uuid,p_template_id uuid,p_template_version integer,
  p_subject text,p_body_text text,p_summary text,p_document_ids uuid[] default '{}'::uuid[]
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.prepare_communication_outbound_v1_impl($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13);
$$;

create function public.decide_communication_outbound_v1(
  p_workspace_id uuid,p_command_id uuid,p_expected_version integer,p_decision text,p_reason text default null
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.decide_communication_outbound_v1_impl($1,$2,$3,$4,$5);
$$;

create function public.relink_communication_v1(
  p_workspace_id uuid,p_communication_id uuid,p_expected_version integer,p_conversation_id uuid,
  p_company_id uuid,p_contact_id uuid,p_transaction_id uuid,p_reason text
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.relink_communication_v1_impl($1,$2,$3,$4,$5,$6,$7,$8);
$$;

create function public.create_transaction_followup_v1(
  p_workspace_id uuid,p_transaction_id uuid,p_followup_id uuid,p_title text,p_due_at timestamptz
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.create_transaction_followup_v1_impl($1,$2,$3,$4,$5);
$$;

create function public.convert_communication_to_followup_v1(
  p_workspace_id uuid,p_communication_id uuid,p_idempotency_key text,p_followup_id uuid,p_title text,p_due_at timestamptz
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.convert_communication_to_followup_v1_impl($1,$2,$3,$4,$5,$6);
$$;

create function public.convert_communication_to_task_v1(
  p_workspace_id uuid,p_communication_id uuid,p_idempotency_key text,p_task_id uuid,p_title text,p_due_at timestamptz
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.convert_communication_to_task_v1_impl($1,$2,$3,$4,$5,$6);
$$;

create function public.convert_communication_to_document_request_v1(
  p_workspace_id uuid,p_communication_id uuid,p_idempotency_key text,p_principal_id uuid,p_request_id uuid,
  p_title text,p_instructions text default null,p_due_at timestamptz default null
) returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.convert_communication_to_document_request_v1_impl($1,$2,$3,$4,$5,$6,$7,$8);
$$;

-- Private implementations are callable only by authenticated execution paths; they are
-- not in the exposed API schema. Public façades remain the stable API contract.
revoke all on function private.save_communication_template_v1_impl(uuid,uuid,integer,text,text,text,text,text,boolean) from public,anon,service_role;
grant execute on function private.save_communication_template_v1_impl(uuid,uuid,integer,text,text,text,text,text,boolean) to authenticated;
revoke all on function private.prepare_communication_outbound_v1_impl(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) from public,anon,service_role;
grant execute on function private.prepare_communication_outbound_v1_impl(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) to authenticated;
revoke all on function private.decide_communication_outbound_v1_impl(uuid,uuid,integer,text,text) from public,anon,service_role;
grant execute on function private.decide_communication_outbound_v1_impl(uuid,uuid,integer,text,text) to authenticated;
revoke all on function private.relink_communication_v1_impl(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) from public,anon,service_role;
grant execute on function private.relink_communication_v1_impl(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) to authenticated;
revoke all on function private.create_transaction_followup_v1_impl(uuid,uuid,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function private.create_transaction_followup_v1_impl(uuid,uuid,uuid,text,timestamptz) to authenticated;
revoke all on function private.convert_communication_to_followup_v1_impl(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function private.convert_communication_to_followup_v1_impl(uuid,uuid,text,uuid,text,timestamptz) to authenticated;
revoke all on function private.convert_communication_to_task_v1_impl(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function private.convert_communication_to_task_v1_impl(uuid,uuid,text,uuid,text,timestamptz) to authenticated;
revoke all on function private.convert_communication_to_document_request_v1_impl(uuid,uuid,text,uuid,uuid,text,text,timestamptz) from public,anon,service_role;
grant execute on function private.convert_communication_to_document_request_v1_impl(uuid,uuid,text,uuid,uuid,text,text,timestamptz) to authenticated;

revoke all on function public.save_communication_template_v1(uuid,uuid,integer,text,text,text,text,text,boolean) from public,anon,service_role;
grant execute on function public.save_communication_template_v1(uuid,uuid,integer,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) from public,anon,service_role;
grant execute on function public.prepare_communication_outbound_v1(uuid,uuid,text,text,uuid,uuid,uuid,uuid,integer,text,text,text,uuid[]) to authenticated;
revoke all on function public.decide_communication_outbound_v1(uuid,uuid,integer,text,text) from public,anon,service_role;
grant execute on function public.decide_communication_outbound_v1(uuid,uuid,integer,text,text) to authenticated;
revoke all on function public.relink_communication_v1(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) from public,anon,service_role;
grant execute on function public.relink_communication_v1(uuid,uuid,integer,uuid,uuid,uuid,uuid,text) to authenticated;
revoke all on function public.create_transaction_followup_v1(uuid,uuid,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function public.create_transaction_followup_v1(uuid,uuid,uuid,text,timestamptz) to authenticated;
revoke all on function public.convert_communication_to_followup_v1(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function public.convert_communication_to_followup_v1(uuid,uuid,text,uuid,text,timestamptz) to authenticated;
revoke all on function public.convert_communication_to_task_v1(uuid,uuid,text,uuid,text,timestamptz) from public,anon,service_role;
grant execute on function public.convert_communication_to_task_v1(uuid,uuid,text,uuid,text,timestamptz) to authenticated;
revoke all on function public.convert_communication_to_document_request_v1(uuid,uuid,text,uuid,uuid,text,text,timestamptz) from public,anon,service_role;
grant execute on function public.convert_communication_to_document_request_v1(uuid,uuid,text,uuid,uuid,text,text,timestamptz) to authenticated;

commit;
