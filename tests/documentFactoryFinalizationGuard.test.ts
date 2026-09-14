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
