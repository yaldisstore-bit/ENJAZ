begin;

-- Phase 9.4 Real Cloud advisor hardening.
-- Cover only FK paths owned by the regulatory knowledge subsystem.

create index if not exists regulatory_sources_created_by_fk_idx
  on public.regulatory_sources(created_by);

create index if not exists regulatory_source_versions_created_by_fk_idx
  on public.regulatory_source_versions(created_by);

create index if not exists regulatory_source_versions_supersedes_fk_idx
  on public.regulatory_source_versions(supersedes_version_id);

create index if not exists regulatory_derived_artifacts_source_version_fk_idx
  on public.regulatory_derived_artifacts(source_id,source_version_id);

commit;
