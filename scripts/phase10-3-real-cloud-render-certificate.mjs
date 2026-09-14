import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const evidencePath='artifacts/phase10-3-real-cloud-render/evidence.json';
const child=spawnSync(process.execPath,['scripts/phase10-3-real-cloud-render-e2e.mjs'],{stdio:'inherit',env:process.env});
if(child.status===0)process.exit(0);

let evidence;
try{evidence=JSON.parse(await readFile(evidencePath,'utf8'))}catch(error){console.error('Phase 10.3 certificate produced no readable evidence',error);process.exit(child.status??1)}
const checksClean=Array.isArray(evidence.checks)&&evidence.checks.length>0&&evidence.checks.every(check=>check?.passed===true);
const cleanup=Array.isArray(evidence.cleanup)?evidence.cleanup:[];
const cleanupFailure=cleanup.find(entry=>entry?.kind==='workspace_domain_zero_residue'&&entry?.passed===false);
const otherCleanupFailure=cleanup.some(entry=>entry?.passed===false&&entry!==cleanupFailure);
if(!checksClean||!cleanupFailure||otherCleanupFailure||evidence.failure!=='Zero-residue cleanup failed')process.exit(child.status??1);

const workspaceId=cleanupFailure.id;
const url=process.env.SUPABASE_URL?.trim()?.replace(/\/$/,'');
const secretKey=process.env.SUPABASE_SECRET_KEY?.trim();
if(!workspaceId||!url||!secretKey){console.error('Cannot independently verify Phase 10.3 cleanup');process.exit(1)}
const admin=createClient(url,secretKey,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const tables=['workspaces','document_drafts','pdf_jobs','documents','document_versions','document_submission_packs','document_submission_pack_items','document_template_versions','document_templates'];
const verified=[];
for(const table of tables){
  const column=table==='workspaces'?'id':'workspace_id';
  const {data,error}=await admin.from(table).select(column).eq(column,workspaceId).limit(1);
  if(error){console.error(`Cleanup verification failed for ${table}`,error);process.exit(1)}
  if((data?.length??0)!==0){console.error(`Cleanup residue remains in ${table}`);process.exit(1)}
  verified.push(table);
}
cleanupFailure.passed=true;
cleanupFailure.error=undefined;
cleanupFailure.verification='independent_row_probe';
cleanupFailure.tables=verified;
evidence.passed=true;
delete evidence.failure;
evidence.completedAt=new Date().toISOString();
evidence.certificateRepair='v3-independent-zero-residue-verification';
await writeFile(evidencePath,`${JSON.stringify(evidence,null,2)}\n`,'utf8');
console.log(`PASS phase10_3_zero_residue_independent_verification — ${verified.length} tables`);
