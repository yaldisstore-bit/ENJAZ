import {randomUUID} from 'node:crypto';

// Existing governance RPCs on the SAME J01 company. Synthetic records only;
// expiry here certifies the as-of projection, not legal signature authority.
export async function checkLinkedGovernance({owner,outsider,fresh,admin,makeUser,
  workspaceId,companyId,transactionId,readCount,verify}) {
  const ws=workspaceId;
  const common={p_workspace_id:ws,p_company_id:companyId};
  const context=async(client,asOf)=>client.rpc('get_company_governance_context_v1',
    {...common,p_as_of:asOf});
  const before=await context(fresh,'2026-02-01');
  verify(!before.error&&before.data?.companyId===companyId&&before.data?.canMutate===true,
    'J10_OWNER_GOVERNANCE_CONTEXT_ON_SAME_COMPANY');
  const contact=await owner.client.from('contacts').insert({workspace_id:ws,
    display_name:'J10 synthetic representative',contact_type:'client',status:'active'})
    .select('id').single();
  verify(!contact.error&&Boolean(contact.data?.id),'J10_AUTHENTICATED_SOURCE_CONTACT');
  const person=contact.data.id;
  const ownership={...common,p_expected_version:0,p_operation_id:randomUUID(),
    p_effective_from:'2026-01-01',p_entries:[{kind:'person',id:person,role:'shareholder',percentage:'100'}]};
  const foreign=await outsider.client.rpc('replace_company_ownership_snapshot_v1',ownership);
  verify(foreign.error?.code==='42501'&&await readCount('corporate_ownership_stakes',ws)===0,
    'J10_FOREIGN_OWNER_CANNOT_MUTATE_GOVERNANCE');
  const owned=await owner.client.rpc('replace_company_ownership_snapshot_v1',ownership);
  verify(!owned.error&&owned.data?.version===1,'J10_OWNERSHIP_SNAPSHOT_PERSISTED');
  const replay=await fresh.rpc('replace_company_ownership_snapshot_v1',ownership);
  verify(!replay.error&&replay.data?.replayed===true&&await readCount('corporate_ownership_stakes',ws)===1,
    'J10_OWNERSHIP_REPLAY_NO_DUPLICATE');
  const incomplete=await owner.client.rpc('replace_company_ownership_snapshot_v1',
    {...ownership,p_entries:[{kind:'person',id:person,role:'shareholder',percentage:'90'}]});
  verify(incomplete.error?.code==='23514'&&await readCount('corporate_ownership_stakes',ws)===1,
    'J10_INCOMPLETE_OWNERSHIP_TOTAL_DENIED');
  // A replay conflict must carry an independently valid 100% ownership payload;
  // otherwise the percentage validation correctly fails before replay lookup.
  const conflict=await owner.client.rpc('replace_company_ownership_snapshot_v1',
    {...ownership,p_entries:[{kind:'person',id:person,role:'partner',percentage:'100'}]});
  verify(conflict.error?.code==='23505','J10_OWNERSHIP_REPLAY_PAYLOAD_CONFLICT');
  const bo=await owner.client.rpc('replace_company_beneficial_owners_v1',{
    ...common,p_expected_version:0,p_operation_id:randomUUID(),p_effective_from:'2026-01-01',
    p_entries:[{contactId:person,basis:'ownership',percentage:'100'}]});
  verify(!bo.error&&bo.data?.version===1,'J10_BENEFICIAL_OWNER_PERSISTED');
  const grantArgs={...common,p_expected_version:0,p_operation_id:randomUUID(),p_contact_id:person,
    p_role:'authorized_person',p_scope:'limited',p_powers:['represent'],
    p_effective_from:'2026-01-15',p_expires_on:'2026-08-01'};
  const grant=await owner.client.rpc('grant_company_authority_v1',grantArgs);
  verify(!grant.error&&Boolean(grant.data?.grantId)&&grant.data?.version===1,
    'J10_DATED_REPRESENTATION_AUTHORITY_PERSISTED');
  const historical=await context(fresh,'2026-02-01');
  const expired=await context(fresh,'2026-09-01');
  verify(!historical.error&&!expired.error&&historical.data?.authorities?.length===1&&
    historical.data.authorities[0].id===grant.data.grantId&&expired.data?.authorities?.length===0&&
    expired.data?.risks?.some(x=>x.code==='REPRESENTATION_AUTHORITY_MISSING'),
    'J10_EXPIRED_AUTHORITY_ABSENT_FROM_CURRENT_CONTEXT_HISTORY_PRESERVED');

  // Workforce member is independently signed in and deliberately has no legacy
  // owner membership in this workspace. Admin membership is fixture scaffolding.
  const member=await makeUser('member');
  const membership=await admin.from('organization_members').insert({workspace_id:ws,
    user_id:member.id,status:'active',created_by:owner.id}).select('id').single();
  verify(!membership.error&&Boolean(membership.data?.id),'J10_REAL_SAME_WORKSPACE_WORKFORCE_FIXTURE');
  const memberRead=await context(member.client,'2026-02-01');
  const memberWrite=await member.client.rpc('grant_company_authority_v1',{
    ...grantArgs,p_operation_id:randomUUID(),p_expected_version:1});
  verify(!memberRead.error&&memberRead.data?.canMutate===false&&memberWrite.error?.code==='42501',
    'J10_WORKFORCE_CAN_READ_BUT_CANNOT_ESCALATE_GOVERNANCE');
  const foreignRead=await context(outsider.client,'2026-02-01');
  verify(foreignRead.error?.code==='42501','J10_FOREIGN_GOVERNANCE_READ_DENIED');

  const resolutionArgs={...common,p_expected_version:0,p_operation_id:randomUUID(),
    p_resolution_number:'J10-LAB',p_title:'Synthetic lab authority resolution',
    p_resolution_type:'authorization',p_effective_on:'2026-01-15',p_notes:'Disposable test record'};
  const resolution=await owner.client.rpc('record_company_resolution_v1',resolutionArgs);
  verify(!resolution.error&&resolution.data?.version===1,'J10_RESOLUTION_PERSISTED');
  const stale=await owner.client.rpc('record_company_resolution_v1',{
    ...resolutionArgs,p_operation_id:randomUUID(),p_resolution_number:'J10-STALE'});
  verify(stale.error?.code==='PT409'&&await readCount('corporate_resolutions',ws)===1,
    'J10_STALE_RESOLUTION_VERSION_DENIED');
  const capital=await owner.client.rpc('record_company_capital_event_v1',{
    ...common,p_expected_version:0,p_operation_id:randomUUID(),p_change_type:'set',
    p_amount_after:'120.50',p_effective_on:'2026-01-20',p_reason:'J10 synthetic capital registry'});
  verify(!capital.error&&capital.data?.version===1,'J10_GOVERNED_CAPITAL_EVENT_PERSISTED');
  const bypass=await owner.client.from('companies').update({capital:999}).eq('id',companyId).select('id');
  verify(bypass.error?.code==='42501','J10_DIRECT_CAPITAL_BYPASS_DENIED');
  const final=await context(fresh,'2026-02-01');
  const source=await fresh.from('transactions').select('id,company_id,workspace_id').eq('id',transactionId).single();
  verify(!final.error&&final.data?.ownership?.stakes?.length===1&&
    final.data?.beneficialOwners?.length===1&&final.data?.resolutions?.length===1&&
    final.data?.capital?.amount==='120.5'&&final.data?.versions?.capital===1&&
    !source.error&&source.data?.company_id===companyId&&source.data?.workspace_id===ws,
    'J10_FRESH_JWT_GOVERNANCE_PRESERVES_J01_J09_LINEAGE');
  return {member};
}
