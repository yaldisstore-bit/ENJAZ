import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createSupabaseAuthGateway } from '../../core/auth/SupabaseAuthGateway.ts';
import { createRuntimeConfig } from '../../core/config/env.ts';
import { createEnjazSupabaseClient } from '../../core/supabase/client.ts';
import { AuthProvider, useAuth } from '../../features/auth/state/AuthContext.tsx';
import {
  createClientPortalGateway,
  type ClientPortalAuthorityContext,
  type ClientPortalGateway,
  type ClientPortalInvitation,
  type ClientPortalReadModel,
  type ClientPortalRequestView,
  type ClientPortalWorkspace,
} from '../../features/client-portal/clientPortalGateway.ts';
import clientPortalCss from './client-portal.css?raw';

type PortalSection='overview'|'requests'|'transactions'|'documents'|'receipts';
type Notice={kind:'success'|'error'|'info';message:string}|null;

function userMessage(reason:unknown,fallback:string):string{
  const candidate=reason as Readonly<{userMessage?:unknown;message?:unknown}>;
  return typeof candidate?.userMessage==='string'?candidate.userMessage:typeof candidate?.message==='string'?candidate.message:fallback;
}

function ClientPortalStyles(){return <style data-client-portal-styles="lazy">{clientPortalCss}</style>;}
function ClientPortalMark(){return <div className="cp-mark" aria-hidden="true"><span>إ</span></div>;}
function LoadingPortal(){return <main className="cp-loading" dir="rtl"><ClientPortalMark/><strong>إنجاز</strong><span>نجهّز بوابتك الآمنة…</span></main>;}

function PortalAuthScreen(){
  const auth=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setBusy(true);setNotice(null);
    try{await auth.service.signIn({email:email.trim(),password});}
    catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر تسجيل الدخول.')});}
    finally{setBusy(false);}
  };
  const reset=async()=>{
    if(!email.trim()){setNotice({kind:'info',message:'اكتب بريدك الإلكتروني أولاً لاستلام رابط الاستعادة.'});return;}
    setBusy(true);setNotice(null);
    try{
      const redirect=new URL(window.location.href);redirect.search='';redirect.hash='';redirect.searchParams.set('auth','update-password');
      await auth.service.requestPasswordReset(email.trim(),redirect.toString());
      setNotice({kind:'success',message:'أرسلنا رابط استعادة كلمة المرور إلى بريدك إذا كان الحساب صالحًا.'});
    }catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر إرسال رابط الاستعادة.')});}
    finally{setBusy(false);}
  };
  return <main className="cp-auth" dir="rtl" data-client-portal-auth="true"><section className="cp-auth__card">
    <div className="cp-auth__brand"><ClientPortalMark/><div><strong>بوابة إنجاز</strong><span>مساحتك الآمنة لمتابعة معاملاتك</span></div></div>
    <header><p className="cp-kicker">دخول العملاء</p><h1>كل ما يخص معاملتك، في مكان واضح.</h1><p>استخدم البريد المرتبط بالدعوة. حساب العميل منفصل بالكامل عن مساحة عمل الموظفين.</p></header>
    {notice&&<div className={`cp-notice cp-notice--${notice.kind}`} role="status">{notice.message}</div>}
    <form onSubmit={(event)=>{void submit(event);}} className="cp-auth__form">
      <label><span>البريد الإلكتروني</span><input type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.currentTarget.value)} required placeholder="name@example.com"/></label>
      <label><span>كلمة المرور</span><input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.currentTarget.value)} required placeholder="••••••••"/></label>
      <button className="cp-button cp-button--primary" disabled={busy}>{busy?'جارٍ التحقق…':'دخول آمن'}</button>
      <button type="button" className="cp-link-button" onClick={()=>{void reset();}} disabled={busy}>نسيت كلمة المرور؟</button>
    </form>
    <footer>لا يمكن لهذا الحساب الوصول إلى ملاحظات الموظفين أو الأنظمة الداخلية أو أي شركة غير مخولة له.</footer>
  </section></main>;
}

function PortalPasswordUpdate(){
  const auth=useAuth();const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(password!==confirm){setNotice({kind:'error',message:'كلمتا المرور غير متطابقتين.'});return;}setBusy(true);setNotice(null);try{await auth.service.updatePassword(password);const url=new URL(window.location.href);url.searchParams.delete('auth');window.history.replaceState(window.history.state,'',url);setNotice({kind:'success',message:'تم تحديث كلمة المرور. يمكنك متابعة البوابة الآن.'});}catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر تحديث كلمة المرور.')});}finally{setBusy(false);}};
  return <main className="cp-auth" dir="rtl"><section className="cp-auth__card"><div className="cp-auth__brand"><ClientPortalMark/><div><strong>بوابة إنجاز</strong><span>استعادة الوصول</span></div></div><header><p className="cp-kicker">كلمة مرور جديدة</p><h1>أمّن حسابك</h1><p>استخدم كلمة مرور جديدة لا تقل عن 10 أحرف.</p></header>{notice&&<div className={`cp-notice cp-notice--${notice.kind}`}>{notice.message}</div>}<form className="cp-auth__form" onSubmit={(event)=>{void submit(event);}}><label><span>كلمة المرور الجديدة</span><input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e)=>setPassword(e.currentTarget.value)}/></label><label><span>تأكيد كلمة المرور</span><input type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e)=>setConfirm(e.currentTarget.value)}/></label><button className="cp-button cp-button--primary" disabled={busy}>{busy?'جارٍ الحفظ…':'حفظ كلمة المرور'}</button></form></section></main>;
}

function EmptyAccess({invitations,onActivate,busy,onSignOut}:Readonly<{invitations:readonly ClientPortalInvitation[];onActivate:(v:ClientPortalInvitation)=>void;busy:boolean;onSignOut:()=>void}>){
  return <main className="cp-entry" dir="rtl"><section className="cp-entry__card"><ClientPortalMark/><p className="cp-kicker">بوابة العملاء</p>{invitations.length?<><h1>لديك دعوة جديدة</h1><p>فعّل الوصول إلى المساحة التي دعاك إليها فريق إنجاز. التفعيل لا يمنحك أي صلاحية خارج العناصر المشتركة معك.</p><div className="cp-invitations">{invitations.map((inv)=><button key={inv.principalId} className="cp-invitation" disabled={busy} onClick={()=>onActivate(inv)}><span><strong>{inv.workspaceName}</strong><small>دعوة جاهزة للتفعيل</small></span><b>{busy?'…':'تفعيل'}</b></button>)}</div></>:<><h1>لا توجد صلاحية عميل نشطة</h1><p>الحساب صحيح، لكن لا توجد دعوة أو مساحة عميل مفعلة له حاليًا.</p></>}<button className="cp-link-button" onClick={onSignOut}>تسجيل الخروج</button></section></main>;
}

const requestLabels:Record<ClientPortalRequestView['requestType'],string>={document:'رفع وثيقة',approval:'موافقة على وثيقة',information:'معلومة مطلوبة',appointment:'تأكيد موعد',payment:'دفعة/إيصال'};

function RequestAction({gateway,workspaceId,request,onChanged}:Readonly<{gateway:ClientPortalGateway;workspaceId:string;request:ClientPortalRequestView;onChanged:()=>Promise<void>}>){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[comment,setComment]=useState(''),[notice,setNotice]=useState<Notice>(null),[file,setFile]=useState<File|null>(null);
  const run=async(action:()=>Promise<void>,success:string)=>{setBusy(true);setNotice(null);try{await action();setNotice({kind:'success',message:success});await onChanged();}catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر تنفيذ الإجراء.')});}finally{setBusy(false);}};
  if(request.status!=='open')return <div className="cp-request__done">تم التعامل مع هذا الطلب.</div>;
  return <div className="cp-request__action">{notice&&<div className={`cp-notice cp-notice--${notice.kind}`}>{notice.message}</div>}
    {request.requestType==='information'&&<><textarea value={message} onChange={(e)=>setMessage(e.currentTarget.value)} maxLength={4000} placeholder="اكتب ردك أو المعلومة المطلوبة…"/><button className="cp-button cp-button--primary" disabled={busy||!message.trim()} onClick={()=>{void run(()=>gateway.sendMessage({workspaceId,transactionId:request.transactionId,requestId:request.id,body:message}),'تم إرسال ردك بأمان.');}}>إرسال الرد</button></>}
    {request.requestType==='appointment'&&<><input value={comment} onChange={(e)=>setComment(e.currentTarget.value)} maxLength={1200} placeholder="ملاحظة اختيارية"/><div className="cp-action-row"><button className="cp-button cp-button--primary" disabled={busy} onClick={()=>{void run(()=>gateway.respondAppointment({workspaceId,requestId:request.id,decision:'confirmed',comment}),'تم تأكيد الموعد.');}}>تأكيد</button><button className="cp-button cp-button--secondary" disabled={busy} onClick={()=>{void run(()=>gateway.respondAppointment({workspaceId,requestId:request.id,decision:'declined',comment}),'تم إرسال الاعتذار عن الموعد.');}}>اعتذار</button></div></>}
    {request.requestType==='approval'&&<><textarea value={comment} onChange={(e)=>setComment(e.currentTarget.value)} maxLength={1000} placeholder="تعليق اختياري على الموافقة أو الرفض"/><div className="cp-action-row"><button className="cp-button cp-button--primary" disabled={busy} onClick={()=>{void run(()=>gateway.respondDocumentApproval({workspaceId,requestId:request.id,decision:'approved',comment}),'تم اعتماد قرار الموافقة.');}}>موافقة</button><button className="cp-button cp-button--danger" disabled={busy} onClick={()=>{void run(()=>gateway.respondDocumentApproval({workspaceId,requestId:request.id,decision:'rejected',comment}),'تم تسجيل الرفض.');}}>رفض</button></div></>}
    {request.requestType==='document'&&<><label className="cp-file"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" onChange={(e)=>setFile(e.currentTarget.files?.[0]??null)}/><span>{file?file.name:'اختر الوثيقة المطلوبة'}</span><b>اختيار ملف</b></label><button className="cp-button cp-button--primary" disabled={busy||!file} onClick={()=>{if(file)void run(()=>gateway.uploadRequestedDocument({workspaceId,requestId:request.id,title:request.title,file}),'تم رفع الوثيقة والتحقق منها بنجاح.');}}>{busy?'جارٍ الرفع والتحقق…':'رفع الوثيقة'}</button></>}
    {request.requestType==='payment'&&<p className="cp-muted">تفاصيل الدفع للمتابعة فقط؛ لا تنفذ البوابة أي قيد مالي مباشر.</p>}
  </div>;
}

function PortalShell({gateway,workspaces,initialWorkspace,onSignOut}:Readonly<{gateway:ClientPortalGateway;workspaces:readonly ClientPortalWorkspace[];initialWorkspace:string;onSignOut:()=>void}>){
  const [workspaceId,setWorkspaceId]=useState(initialWorkspace),[section,setSection]=useState<PortalSection>('overview');
  const loadSequence=useRef(0);
  const [view,setView]=useState<Readonly<{model:ClientPortalReadModel|null;authority:ClientPortalAuthorityContext|null;loading:boolean;notice:Notice}>>({
    model:null,authority:null,loading:true,notice:null,
  });
  const {model,authority,loading,notice}=view;
  const current=workspaces.find((item)=>item.workspaceId===workspaceId)??workspaces[0]!;
  const reload=useCallback(async()=>{
    const sequence=++loadSequence.current;
    setView((previous)=>({...previous,loading:true,notice:null}));
    try{
      const [m,a]=await Promise.all([gateway.readModel(current.workspaceId),gateway.authority(current.workspaceId)]);
      if(sequence!==loadSequence.current)return;
      setView({model:m,authority:a,loading:false,notice:null});
    }catch(error){
      if(sequence!==loadSequence.current)return;
      setView({model:null,authority:null,loading:false,notice:{kind:'error',message:userMessage(error,'تعذر تحميل بيانات البوابة.')}});
    }
  },[gateway,current.workspaceId]);
  useEffect(()=>{void reload();},[reload]);
  const openRequests=useMemo(()=>model?.requests.filter((item)=>item.status==='open')??[],[model]);
  const companyById=useMemo(()=>new Map((model?.companies??[]).map((item)=>[item.id,item])),[model]);
  const nav:readonly [PortalSection,string,string][]=[['overview','الرئيسية','⌂'],['requests','الطلبات','✓'],['transactions','المعاملات','▣'],['documents','الوثائق','▤'],['receipts','الإيصالات','◫']];
  return <div className="cp-shell" dir="rtl" data-client-portal-shell="isolated" data-client-portal-load-state={loading?'loading':notice?'error':model&&authority?'ready':'invalid'}><header className="cp-topbar"><div className="cp-topbar__brand"><ClientPortalMark/><div><strong>بوابة إنجاز</strong><span>{current.workspaceName}</span></div></div><div className="cp-topbar__actions">{workspaces.length>1&&<select aria-label="مساحة العمل" value={workspaceId} onChange={(e)=>setWorkspaceId(e.currentTarget.value)}>{workspaces.map((item)=><option key={item.workspaceId} value={item.workspaceId}>{item.workspaceName}</option>)}</select>}<button onClick={()=>{void reload();}} className="cp-icon-button" aria-label="تحديث">↻</button><button onClick={onSignOut} className="cp-icon-button" aria-label="تسجيل الخروج">↪</button></div></header><main className="cp-main">{notice&&<div className={`cp-notice cp-notice--${notice.kind}`}>{notice.message}</div>}{loading?<div className="cp-skeleton"><span/><span/><span/></div>:model&&authority&&<>
    {section==='overview'&&<><section className="cp-hero"><div><p className="cp-kicker">ملخصك اليوم</p><h1>{openRequests.length?`لديك ${openRequests.length} طلب بحاجة لإجراء`:'كل شيء تحت السيطرة'}</h1><p>{openRequests.length?'أنجز المطلوب من هنا مباشرة؛ كل إجراء مرتبط بمعاملته وصلاحيته المحددة.':'لا توجد طلبات مفتوحة الآن. يمكنك متابعة حالة معاملاتك ووثائقك في أي وقت.'}</p></div><div className="cp-hero__metric"><strong>{model.transactions.length}</strong><span>معاملة متاحة</span></div></section><section className="cp-stats"><article><span>طلبات مفتوحة</span><strong>{openRequests.length}</strong></article><article><span>وثائق مشتركة</span><strong>{model.documents.length}</strong></article><article><span>إيصالات</span><strong>{model.receipts.length}</strong></article></section>{openRequests.slice(0,3).map((request)=><article className="cp-request" key={request.id}><div className="cp-request__head"><span className="cp-chip">{requestLabels[request.requestType]}</span><small>{request.dueAt?`الاستحقاق ${new Date(request.dueAt).toLocaleDateString('ar-IQ')}`:'بدون موعد محدد'}</small></div><h2>{request.title}</h2>{request.instructions&&<p>{request.instructions}</p>}<RequestAction gateway={gateway} workspaceId={current.workspaceId} request={request} onChanged={reload}/></article>)}</>}
    {section==='requests'&&<section className="cp-section"><header><p className="cp-kicker">مركز الإجراءات</p><h1>الطلبات</h1><span>{model.requests.length} طلب</span></header><div className="cp-list">{model.requests.map((request)=><article className="cp-request" key={request.id}><div className="cp-request__head"><span className="cp-chip">{requestLabels[request.requestType]}</span><span className={`cp-status cp-status--${request.status==='open'?'open':'done'}`}>{request.status==='open'?'مفتوح':'مكتمل'}</span></div><h2>{request.title}</h2>{request.instructions&&<p>{request.instructions}</p>}<RequestAction gateway={gateway} workspaceId={current.workspaceId} request={request} onChanged={reload}/></article>)}</div></section>}
    {section==='transactions'&&<section className="cp-section"><header><p className="cp-kicker">المعاملات المخولة</p><h1>معاملاتي</h1><span>{model.transactions.length} معاملة</span></header><div className="cp-list">{model.transactions.map((tx)=><article className="cp-record" key={tx.id}><div><span className="cp-chip">{tx.type||'معاملة'}</span><h2>{companyById.get(tx.companyId)?.displayName||companyById.get(tx.companyId)?.legalName||'الشركة'}</h2><p>آخر تحديث {new Date(tx.updatedAt).toLocaleDateString('ar-IQ')}</p></div><span className="cp-status cp-status--open">{tx.status}</span></article>)}</div></section>}
    {section==='documents'&&<section className="cp-section"><header><p className="cp-kicker">المستندات المشتركة</p><h1>الوثائق</h1><span>{model.documents.length} وثيقة</span></header><div className="cp-list">{model.documents.map((doc)=><article className="cp-record" key={doc.id}><div><span className="cp-doc-icon">▤</span><h2>{doc.title}</h2><p>{doc.documentType||doc.mimeType} · {Math.max(1,Math.round(doc.sizeBytes/1024))} KB</p></div><span className="cp-status cp-status--done">متاحة</span></article>)}</div></section>}
    {section==='receipts'&&<section className="cp-section"><header><p className="cp-kicker">سجل مالي للعرض</p><h1>الإيصالات</h1><span>{model.receipts.length} إيصال</span></header><div className="cp-list">{model.receipts.map((receipt)=><article className="cp-record" key={receipt.paymentId}><div><span className="cp-chip">{receipt.method}</span><h2>{receipt.amount}</h2><p>{receipt.receiptRef||'إيصال دفع'} · {new Date(receipt.paidAt).toLocaleDateString('ar-IQ')}</p></div><span className="cp-status cp-status--done">{receipt.status}</span></article>)}</div></section>}
  </>}</main><nav className="cp-bottom-nav" aria-label="تنقل بوابة العميل">{nav.map(([id,label,icon])=><button key={id} className={section===id?'is-active':''} onClick={()=>setSection(id)}><span aria-hidden="true">{icon}</span><b>{label}</b>{id==='requests'&&openRequests.length>0&&<i>{openRequests.length}</i>}</button>)}</nav></div>;
}

function AuthenticatedPortal({gateway}:Readonly<{gateway:ClientPortalGateway}>){
  const auth=useAuth();const [workspaces,setWorkspaces]=useState<readonly ClientPortalWorkspace[]>([]),[invitations,setInvitations]=useState<readonly ClientPortalInvitation[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null);
  const refresh=useCallback(async()=>{setLoading(true);setNotice(null);try{const [active,pending]=await Promise.all([gateway.listWorkspaces(),gateway.listInvitations()]);setWorkspaces(active);setInvitations(pending);}catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر التحقق من صلاحية البوابة.')});}finally{setLoading(false);}},[gateway]);
  useEffect(()=>{if(auth.status==='authenticated')void refresh();},[auth.status,refresh]);
  if(auth.status==='checking')return <LoadingPortal/>;
  if(auth.status==='anonymous'||!auth.user)return <PortalAuthScreen/>;
  if(new URLSearchParams(window.location.search).get('auth')==='update-password')return <PortalPasswordUpdate/>;
  const signOut=()=>{void auth.service.signOut();};
  const activate=async(inv:ClientPortalInvitation)=>{setBusy(true);setNotice(null);try{await gateway.activateInvitation(inv.workspaceId,inv.version);await refresh();}catch(error){setNotice({kind:'error',message:userMessage(error,'تعذر تفعيل الدعوة.')});}finally{setBusy(false);}};
  if(loading)return <LoadingPortal/>;
  if(notice&&workspaces.length===0)return <main className="cp-entry" dir="rtl"><section className="cp-entry__card"><ClientPortalMark/><div className="cp-notice cp-notice--error">{notice.message}</div><button className="cp-button cp-button--secondary" onClick={()=>{void refresh();}}>إعادة المحاولة</button><button className="cp-link-button" onClick={signOut}>تسجيل الخروج</button></section></main>;
  if(!workspaces.length)return <EmptyAccess invitations={invitations} onActivate={(inv)=>{void activate(inv);}} busy={busy} onSignOut={signOut}/>;
  return <PortalShell gateway={gateway} workspaces={workspaces} initialWorkspace={workspaces[0]!.workspaceId} onSignOut={signOut}/>;
}

export function ClientPortalProductionRoot(){
  const [runtime]=useState(()=>{try{const config=createRuntimeConfig(import.meta.env as unknown as Readonly<Record<string,unknown>>),client=createEnjazSupabaseClient(config);return {auth:createSupabaseAuthGateway(client),gateway:createClientPortalGateway(client),error:null as string|null};}catch{return {auth:null,gateway:null,error:'إعدادات الاتصال ببوابة إنجاز غير مكتملة.'};}});
  if(!runtime.auth||!runtime.gateway)return <><ClientPortalStyles/><main className="cp-entry" dir="rtl"><section className="cp-entry__card"><ClientPortalMark/><h1>تعذر تشغيل بوابة العميل</h1><p>{runtime.error}</p></section></main></>;
  return <><ClientPortalStyles/><AuthProvider gateway={runtime.auth}><AuthenticatedPortal gateway={runtime.gateway}/></AuthProvider></>;
}