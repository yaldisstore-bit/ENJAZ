begin;

alter table private.scheduling_command_receipts
  add constraint scheduling_command_receipts_workspace_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;

commit;
