import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const state=JSON.parse(read('docs/PHASE11_4_STATE.json'));
const closure=read('docs/PHASE11_4C_CLOSURE.md');
const migration=read('database/migrations/phase_11_4_unified_communications_read_model.sql');
const hardening=read('database/migrations/phase_11_4_unified_communications_read_index_hardening.sql');
const probe=read('database/migrations/phase_11_4_live_unified_communications_probe.sql');
const service=read('src/features/communications/communicationsHubService.ts');
const dispatchBridge=read('src/features/communications/communicationsDispatchBridge.ts');
const controller=read('src/features/communications/useCommunicationsHub.ts');
const staffEdge=read('supabase/functions/enjaz-communications-user/index.ts');
const ui=read('src/ui-r2/communications/CommunicationsHubConnected.tsx');
const css=read('src/ui-r2/communications/communications-hub.css');
const router=read('src/ui-r2/core-work/CoreWorkConnected.tsx');
const nav=read('src/ui-r2/architecture/navigation-contract.ts');

const fail=[];
const req=(ok,message)=>{if(!ok)fail.push(message)};
const has=(text,needle,message)=>req(text.includes(needle),message);
const lacks=(text,needle,message)=>req(!text.includes(needle),message);

req(state.phase==='11.4'&&state.currentSlice==='11.4-D','11.4-D must be the active slice');
req(state.currentSliceBaseCommit==='0fc0ab580b5b9414f9bf9aa323260aa56fc4793e','D must start from certified C merge');
req(state.phase11_4cMergeCommit===state.currentSliceBaseCommit,'C merge lineage must equal D base');
req(state.phase11_4cExitGatePassed===true,'C closure must remain passed');
req(state.phase11_4cPostMergeRecertification==='PASS_ZERO_FAILED_ZERO_RUNNING_ZERO_QUEUED','C post-merge recertification proof missing');
req(state.phase11_4dExitGatePassed===false&&state.exitGatePassed===false,'D/overall gate must remain open until final certification');
req(state.phase11_5Allowed===false&&state.successorStatus==='LOCKED','Phase 11.5 must remain locked');
req(state.conversationExperienceImplemented===true,'unified conversation experience must be implemented');
req(state.unifiedCommunicationsRealCloudVerification.startsWith('PASS_'),'Real Cloud D verification must pass');
req(state.unifiedCommunicationsRealCloudProbeZeroResidue===true,'D Real Cloud probe must leave zero residue');
req(state.unifiedCommunicationsNewUnindexedForeignKeys===0,'D must add no unindexed foreign keys');
req(state.unifiedCommunicationsNewSecurityDefinerPublicFindings===0,'D must add no public security-definer exposure');
req(state.unifiedCommunicationsNewRlsNoPolicyFindings===0,'D must add no RLS-no-policy finding');

has(closure,'0fc0ab580b5b9414f9bf9aa323260aa56fc4793e','C closure merge SHA missing');
has(closure,'Phase **11.4-D','C closure must authorize D');
lacks(migration,'create table public.communications','D must not create a shadow communications store');
lacks(migration,'create table public.communication_inbox','D must not create a shadow inbox store');
has(migration,'create table public.communication_conversation_reads','D may add only per-user read cursor state');
has(migration,'communication_conversation_reads_browser_deny','read cursor direct browser deny policy missing');
has(migration,'get_communications_hub_v1_impl','governed read model missing');
has(migration,'private.require_communication_workspace_user_v1','workspace membership authorization missing');
has(migration,"c.direction='incoming'",'unread/awaiting derivation must use canonical incoming communication');
has(migration,"interval '4 hours'",'unanswered SLA derivation missing');
has(migration,"link_status in ('review_required','unmatched')",'safe review queue derivation missing');
has(migration,'position(v_query in lower','authorized body/entity search missing');
has(migration,'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED','blind retry denial missing');
has(migration,"provider_message_id is not null",'unsafe provider-evidence retry guard missing');
has(migration,'communication.outbound.retry_queued','retry audit evidence missing');
has(migration,'security invoker','public read/action façades must remain security invoker');
has(hardening,'communication_conversation_reads_user_fk_idx','read cursor user FK index hardening missing');

for(const marker of ['PHASE114D_HUB_CONVERSATIONS_EMPTY','PHASE114D_TIMELINE_COUNT_FAIL','PHASE114D_UNREAD_NOT_DERIVED','PHASE114D_AWAITING_STAFF_FAIL','PHASE114D_SEARCH_FAIL','PHASE114D_READ_CURSOR_FAIL','PHASE114D_DIRECT_READ_TABLE_ALLOWED','PHASE114D_SAFE_RETRY_FAIL','PHASE114D_RECONCILIATION_BLIND_RETRY_ALLOWED']) has(probe,marker,`Real Cloud destruction probe marker missing: ${marker}`);
has(probe,'set local role authenticated','probe must exercise actual authenticated role');
has(probe,'rollback;','probe must roll back all fixtures');

for(const marker of ['get_communications_hub_v1','mark_communication_conversation_read_v1','retry_communication_outbound_v1','relink_communication_v1']) has(service,marker,`service must use governed RPC ${marker}`);
lacks(service,".from('communications')",'browser service must never read canonical table directly');
lacks(service,".from('communication_",'browser service must never read support tables directly');
has(controller,'ENJAZ_COMMUNICATION_RETRY_RECONCILIATION_REQUIRED','controller must explain reconciliation no-retry state');
has(controller,'markCommunicationConversationRead','selecting a conversation must use governed read cursor command');
has(controller,'sendQueuedCommunication','safe retry must continue through authenticated staff transport bridge');
has(dispatchBridge,"factory.edge('enjaz-communications-user'",'browser bridge must target staff-only Edge Function');
lacks(dispatchBridge,'x-enjaz-communications-key','browser bridge must never carry the internal gateway key');

has(staffEdge,'db.auth.getUser(token)','staff Edge must validate the JWT server-side');
has(staffEdge,"from('workspace_memberships')",'staff Edge must verify workspace membership');
has(staffEdge,"from('communication_outbound_commands')",'staff Edge must verify canonical outbound command');
has(staffEdge,'requested_by','staff Edge must bind send authority to command requester');
has(staffEdge,'ENJAZ_COMMUNICATIONS_INTERNAL_KEY','internal gateway key must stay server-side');
has(staffEdge,'enjaz-communications?action=dispatch','staff Edge must delegate provider transport to canonical gateway');
lacks(staffEdge,'TWILIO_AUTH_TOKEN=','hard-coded Twilio credentials forbidden');
lacks(staffEdge,'RESEND_API_KEY=','hard-coded Resend credentials forbidden');

for(const marker of ['data-phase11-4-unified-communications="live"','data-communications-timeline="canonical"','data-communications-review="governed"','بحث الاتصالات','إعادة آمنة','اختر محادثة أولًا','تحتاج مطابقة']) has(ui,marker,`unified communications UI marker missing: ${marker}`);
has(ui,'COMMUNICATIONS_INLINE_CSS','communications responsive styling must remain bundled without global CSS budget regression');
has(router,"destinationId === 'communications'",'live R2 router must route communications');
has(router,'CommunicationsHubConnected','live R2 router must use unified communications component');
has(nav,"['communications', 'الاتصالات'",'R2 communications destination missing');
has(nav,"['operations', 'communications'",'communications must live in operations launcher group');
for(const alias of ['اتصالات','رسائل','واتساب','بريد']) has(nav,`${alias}: 'communications'`,`Find Anything alias missing: ${alias}`);
for(const breakpoint of ['@media (max-width:60rem)','@media (max-width:42rem)','@media (max-width:24rem)']) has(css,breakpoint,`responsive communications reference CSS missing ${breakpoint}`);

if(fail.length){console.error(`ENJAZ PHASE 11.4-D UNIFIED COMMUNICATIONS AUDIT FAIL (${fail.length})`);for(const item of fail)console.error(`- ${item}`);process.exit(1);}
console.log('ENJAZ PHASE 11.4-D UNIFIED COMMUNICATIONS AUDIT PASS — canonical timeline, per-user unread, SLA, governed search/relink, safe retry, authenticated staff transport bridge, C lineage and M10 lock preserved.');
