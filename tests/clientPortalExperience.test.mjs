import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const main=read('src/main.tsx');
const root=read('src/ui-r2/client-portal/ClientPortalProductionRoot.tsx');
const gateway=read('src/features/client-portal/clientPortalGateway.ts');
const activation=read('database/migrations/phase_11_3_client_portal_activation.sql');

function activationViolations(source){
  const out=[];
  const need=(marker,label)=>{if(!source.includes(marker))out.push(`missing:${label}`)};
  need('p.user_id=v_actor','actor-bound-invitation');
  need("p.status='invited'",'invited-only-discovery');
  need("v_row.status<>'invited'",'invited-only-activation');
  need('v_row.version<>p_expected_version','optimistic-version');
  need('workspace_memberships','staff-collision');
  need('organization_members','workforce-collision');
  need("'principal.activated','self_activation'",'activation-audit');
  need('grant execute on function public.activate_client_portal_invitation_v1(uuid,integer) to authenticated','authenticated-entry');
  if(/insert\s+into\s+public\.(workspace_memberships|organization_members|client_portal_grants)/i.test(source))out.push('authority-mint');
  if(/p_user_id\s+uuid/i.test(source))out.push('caller-selected-user');
  return out;
}

function runtimeViolations(source){
  const out=[];
  for(const forbidden of ['createEnjazDataLayerFactory','DataLayerProvider','resolveWorkspaceId','UiR2LiveRoot','LazyLiveProductionPortals','bootstrapWorkspace','.signUp(']){
    if(source.includes(forbidden))out.push(`staff-runtime:${forbidden}`);
  }
  return out;
}

function gatewayViolations(source){
  const out=[];
  if(/\.from\s*\(/.test(source))out.push('direct-table-read');
  if(/service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(source))out.push('browser-secret');
  for(const marker of ['list_client_portal_workspaces_v1','get_client_portal_read_model_v1','send_client_portal_message_v1']){
    if(!source.includes(marker))out.push(`missing:${marker}`);
  }
  return out;
}

test('portal route selects a lazy external root instead of nesting in staff runtime',()=>{
  assert.match(main,/lazy\(\(\)=>import\('\.\/ui-r2\/client-portal\/ClientPortalProductionRoot\.tsx'\)/);
  assert.match(main,/parts\.includes\('portal'\)/);
  assert.match(main,/isClientPortalPath\(\)[\s\S]*ClientPortalProductionRoot[\s\S]*UiR2ProductionRoot/);
});

test('client portal runtime has no staff data layer, workspace bootstrap or staff command providers',()=>{
  assert.deepEqual(runtimeViolations(root),[]);
  assert.match(root,/auth\.service\.signIn\(\{email:email\.trim\(\),password\}\)/);
  assert.match(root,/gateway\.listInvitations\(\)/);
  assert.match(root,/gateway\.activateInvitation/);
});

test('client browser gateway stays on governed RPC and Vault boundaries',()=>{
  assert.deepEqual(gatewayViolations(gateway),[]);
  assert.match(gateway,/client\.edge\('enjaz-document-vault'/);
  assert.match(gateway,/action:'portal-prepare'/);
  assert.match(gateway,/action:'portal-acknowledge'/);
});

test('self activation contract is exact-user, optimistic, collision-safe and audited',()=>{
  assert.deepEqual(activationViolations(activation),[]);
  assert.match(activation,/where p\.workspace_id=p_workspace_id\s+and p\.user_id=v_actor\s+for update/);
  assert.match(activation,/set status='active',activated_at=now\(\),revoked_at=null,version=version\+1/);
  assert.doesNotMatch(activation,/insert\s+into\s+public\.(workspace_memberships|organization_members|client_portal_grants)/i);
});

test('destruction: caller-selected activation identity is detected',()=>{
  const broken=activation.replace('p.user_id=v_actor','p.user_id=p_user_id');
  assert.ok(activationViolations(broken).includes('missing:actor-bound-invitation'));
});

test('destruction: removing stale-version protection is detected',()=>{
  const broken=activation.replace('v_row.version<>p_expected_version','false');
  assert.ok(activationViolations(broken).includes('missing:optimistic-version'));
});

test('destruction: minting staff membership during activation is detected',()=>{
  const broken=activation.replace('commit;',"insert into public.workspace_memberships(workspace_id,user_id) values(null,null);\ncommit;");
  assert.ok(activationViolations(broken).includes('authority-mint'));
});

test('destruction: mounting staff data layer in portal runtime is detected',()=>{
  const broken=`import { DataLayerProvider } from '../runtime/fake';\n${root}`;
  assert.ok(runtimeViolations(broken).includes('staff-runtime:DataLayerProvider'));
});

test('destruction: direct browser table access is detected',()=>{
  const broken=`${gateway}\nconst forbidden=client.from('transactions');`;
  assert.ok(gatewayViolations(broken).includes('direct-table-read'));
});
