import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(name:string)=>readFileSync(new URL(`../database/migrations/${name}`,import.meta.url),'utf8');

test('governed runtime has no provisional finalizer',()=>{
  const runtime=read('phase_10_3_document_factory_runtime.sql');
  assert.ok(!/create or replace function public\.finalize_document_draft_v1/i.test(runtime),'runtime must not expose a finalizer before render authority');
  assert.ok(!/grant execute on function public\.finalize_document_draft_v1/i.test(runtime),'runtime must not grant finalization');
});

test('render authority owns render-proof-only finalization',()=>{
  const render=read('phase_10_3_document_factory_render_authority.sql');
  assert.ok(render.toLowerCase().includes('drop function if exists public.finalize_document_draft_v1(uuid,uuid,uuid,uuid)'));
  assert.ok(/create or replace function public\.finalize_document_draft_v1\(\s*p_workspace_id uuid,p_draft_id uuid,p_render_job_id uuid\s*\)/i.test(render));
  assert.ok(render.includes('ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_REQUIRED'));
  assert.ok(render.includes('ENJAZ_DOCUMENT_FACTORY_RENDER_PROOF_DRIFT'));
  assert.ok(!/grant execute on function public\.complete_document_render_v1[^\n]+authenticated/i.test(render),'authenticated users must not complete render jobs');
});

test('published and final records stay immutable directly but allow parent workspace cascade',()=>{
  const hardening=read('phase_10_3_workspace_cascade_hardening.sql');
  assert.ok(hardening.includes("tg_op='DELETE' and old.status='published'"));
  assert.ok(hardening.includes("exists(select 1 from public.workspaces w where w.id=old.workspace_id)"));
  assert.ok(hardening.includes('ENJAZ_TEMPLATE_VERSION_PUBLISHED_IMMUTABLE'));
  assert.ok(hardening.includes("if old.status='final' then"));
  assert.ok(hardening.includes("tg_op='DELETE' and not exists(select 1 from public.workspaces w where w.id=old.workspace_id)"));
  assert.ok(hardening.includes('ENJAZ_DOCUMENT_FACTORY_FINAL_ARTIFACT_IMMUTABLE'));
  assert.ok(!/disable\s+trigger/i.test(hardening),'workspace cascade hardening must not disable immutable triggers');
});
