import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const migration=read('database/migrations/phase_10_3_submission_pack_authority.sql');
const renderer=read('supabase/functions/enjaz-document-render/index.ts');
const commands=read('src/features/documents/documentFactoryCommands.ts');
const panel=read('src/ui-r2/documents/DocumentFactoryPanel.tsx');
const lower=(s:string)=>s.toLowerCase();
const has=(s:string,n:string)=>lower(s).includes(lower(n));

test('submission pack authority accepts finalized PDFs only and stays service-completed',()=>{
 for(const marker of [
  'create table if not exists public.document_submission_packs',
  'create table if not exists public.document_submission_pack_items',
  'enable row level security',
  'revoke all on table public.document_submission_packs from public,anon,authenticated',
  "array_length(p_draft_ids,1) not between 2 and 20",
  "v_draft.status<>'final'",
  'v_draft.transaction_id is distinct from p_transaction_id',
  "lower(dv.mime_type)='application/pdf'",
  'ENJAZ_SUBMISSION_PACK_REQUEST_DRIFT',
  'mark_document_submission_pack_running_v1',
  'complete_document_submission_pack_v1',
  'fail_document_submission_pack_v1',
  'to service_role',
 ])assert.equal(has(migration,marker),true,`missing ${marker}`);
 assert.equal(/grant\s+(insert|update|delete)[^;]+document_submission_packs[^;]+authenticated/i.test(migration),false);
 assert.equal(/grant execute on function public\.complete_document_submission_pack_v1[^\n]+authenticated/i.test(migration),false);
});

test('renderer emits stable QR identity, conditional sections, repeated rows and transaction packs',()=>{
 for(const marker of [
  "import QRCode from 'npm:qrcode@1.5.4'",
  'ENJAZ:DRAFT:',
  'ENJAZ:PACK:',
  'applyAdvancedLayout',
  '\\[\\[IF\\s+',
  '\\[\\[EACH\\s+',
  '[[ITEM]]',
  'drawTable',
  'renderSubmissionPack',
  'PACK_SOURCE_OBJECT_DRIFT',
  "p_document_type:'submission-pack'",
  'complete_document_submission_pack_v1',
 ])assert.equal(has(renderer,marker),true,`missing ${marker}`);
 const auth=renderer.indexOf('auth.getUser()');
 const dispatch=renderer.indexOf("if(body.mode==='pack')return await handlePack(body,workspaceId,who.data.user.id,user,admin)");
 assert.ok(auth>=0&&dispatch>auth,'pack dispatch must occur only after authenticated user resolution');
 assert.equal(has(renderer,'if(pack.requestedBy!==userId)'),true,'pack actor must match the authenticated user');
});

test('browser gateway exposes governed template versions and pack build without server credentials',()=>{
 for(const marker of [
  'listManagedTemplates',
  'save_document_template_v1',
  'create_document_template_version_v1',
  'publish_document_template_version_v1',
  'request_document_submission_pack_v1',
  "mode:'pack'",
  'get_document_submission_pack_v1',
 ])assert.equal(has(commands,marker),true,`missing ${marker}`);
 assert.equal(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|sb_secret_/i.test(commands),false);
});

test('factory UI manages templates and only builds packs from final drafts on the same transaction',()=>{
 for(const marker of [
  'إدارة القوالب',
  'حفظ + إنشاء نسخة ثابتة ونشرها',
  '[[IF company.address]]',
  '[[EACH ocr.items]]',
  "d.status==='final'",
  'd.transactionId===transactionId',
  'إنشاء حزمة التقديم من جميع المستندات النهائية',
  'نهائي · QR ثابت · محفوظ في Vault',
 ])assert.equal(has(panel,marker),true,`missing ${marker}`);
});
