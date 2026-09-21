import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupDiagnostic, removeLinkedFixtureWorkspace } from '../scripts/phase14-1-a2-linked-cleanup.mjs';

const ws='14100000-0000-4000-8000-000000000001';
const uid='14100000-0000-4000-8000-000000000002';
const foreign='14100000-0000-4000-8000-000000000003';
function fixture({marker='phase14_1_a2_j04_field_real_cloud',owner=uid,blocked=null,zeroDelete=false}={}) {
  const rows={workspaces:[{id:ws,owner_user_id:owner},{id:foreign,owner_user_id:foreign}]};
  const dependencies=['client_portal_authority_events','client_portal_resource_shares',
    'client_portal_grants','document_upload_sessions'];
  for(const t of dependencies)rows[t]=[{id:uid,workspace_id:ws},{id:foreign,workspace_id:foreign}];
  const deletes=[];
  const admin={auth:{admin:{getUserById:async()=>({data:{user:{id:uid,
    email:'enjaz-a2-j03-owner-'+uid+'@example.com',
    user_metadata:{enjaz_test_marker:marker,label:'owner'}}},error:null})}},from(table){
    let remove=false,single=false;const filters=[];
    const q={select(){return q;},delete(){remove=true;return q;},
      eq(k,v){filters.push([k,v]);return q;},single(){single=true;return q;},
      then(resolve,reject){return Promise.resolve().then(()=>{
        const matches=r=>filters.every(([k,v])=>r[k]===v);
        const data=rows[table].filter(matches);
        if(remove){
          deletes.push({table,filters});
          if(table===blocked)return {error:{code:'23503',message:'violates constraint "fixture_parent_fk"; JWT sensitive'},data:null};
          if(table==='workspaces'){
            assert.ok(dependencies.every(t=>rows[t].every(r=>r.workspace_id!==ws)), 'RESTRICT children must be removed first');
            assert.deepEqual(filters,[['id',ws],['owner_user_id',uid]]);
            if(zeroDelete)return {error:null,data:[]};
          } else assert.deepEqual(filters,[['workspace_id',ws]]);
          rows[table]=rows[table].filter(r=>!matches(r));
        }
        return {data:single?(data[0]??null):data,error:null};
      }).then(resolve,reject);}};
    return q;
  }};
  return {rows,deletes,args:{admin,url:'https://nqhgaukutkyvfumbtbtg.supabase.co',userId:uid,workspaceId:ws}};
}

test('linked fixture cleanup resolves RESTRICT children and preserves a foreign graph',async()=>{
  const f=fixture();await removeLinkedFixtureWorkspace(f.args);
  for(const rows of Object.values(f.rows))assert.deepEqual(rows.map(r=>r.id),[foreign]);
  assert.equal(f.deletes.at(-1).table,'workspaces');
});
test('production and unknown targets are refused before reads or writes',async()=>{
  for(const url of ['https://juzxriirhkuzviwnhkbd.supabase.co','https://other.supabase.co']){
    const f=fixture();await assert.rejects(removeLinkedFixtureWorkspace({...f.args,url}),/CLEANUP_TARGET_DENIED/);
    assert.equal(f.deletes.length,0);
  }
});
test('an unmarked identity cannot authorize cleanup',async()=>{
  const f=fixture({marker:'real-user'});await assert.rejects(removeLinkedFixtureWorkspace(f.args),/CLEANUP_UNMARKED_USER_DENIED/);
  assert.equal(f.deletes.length,0);
});
test('a marked user cannot delete another workspace owner data',async()=>{
  const f=fixture({owner:foreign});await assert.rejects(removeLinkedFixtureWorkspace(f.args),/CLEANUP_WORKSPACE_OWNER_MISMATCH/);
  assert.equal(f.deletes.length,0);
});
test('a dependency error aborts the parent delete and exposes only safe diagnostics',async()=>{
  const f=fixture({blocked:'client_portal_resource_shares'});
  await assert.rejects(removeLinkedFixtureWorkspace(f.args),e=>{
    assert.deepEqual(e.diagnostic,{code:'23503',constraint:'fixture_parent_fk'});return true;
  });
  assert.equal(f.deletes.some(d=>d.table==='workspaces'),false);
  assert.equal(f.rows.workspaces.length,2);
});
test('zero-row parent delete is never a confirmed cleanup',async()=>{
  const f=fixture({zeroDelete:true});await assert.rejects(removeLinkedFixtureWorkspace(f.args),/CLEANUP_WORKSPACE_DELETE_UNCONFIRMED/);
});
test('diagnostics exclude arbitrary server text and credential-shaped codes',()=>{
  assert.deepEqual(cleanupDiagnostic({code:'eyJ.secret.token',message:'password=private'}),{code:'UNKNOWN'});
});
