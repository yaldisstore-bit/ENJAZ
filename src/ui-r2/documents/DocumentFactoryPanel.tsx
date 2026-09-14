import {useEffect,useMemo,useState} from 'react';
import type {DocumentFactoryDraft,DocumentFactoryGateway,DocumentFactoryTemplate} from '../../features/documents/documentFactoryCommands.ts';
import type {DocumentIntelligenceGateway} from '../../features/documents/documentIntelligenceCommands.ts';
import type {DocumentVaultGateway} from '../../features/documents/documentVaultCommands.ts';

type Props=Readonly<{gateway:DocumentFactoryGateway;vaultGateway:DocumentVaultGateway;intelligenceGateway?:DocumentIntelligenceGateway;workspaceId:string;documentId:string;sourceTitle:string;companyId:string|null;transactionId:string|null}>;
const statusLabel:Record<DocumentFactoryDraft['status'],string>={draft:'مُعاد للتعديل',review_required:'بانتظار المراجعة',approved:'معتمد للإصدار',registered:'مسجل',final:'نهائي',failed:'فشل'};
const errorText=(e:unknown)=>{const raw=e instanceof Error?e.message:'';if(/required fact|missing/i.test(raw))return'القالب يحتاج بيانات غير متوفرة في السجلات الحالية.';if(/ocr.*verified|ocr.*stale/i.test(raw))return'تحليل الوثيقة غير متحقق أو أصبح قديمًا؛ أعد الفحص والتحقق أولًا.';if(/approval|required|approvable/i.test(raw))return'لا يمكن إصدار المستند قبل اعتماد المسودة.';return'تعذر إكمال عملية مصنع الوثائق. لم يتم اعتماد مستند ناقص أو مكرر.'};

export function DocumentFactoryPanel({gateway,vaultGateway,intelligenceGateway,workspaceId,documentId,sourceTitle,companyId,transactionId}:Props){
 const[templates,setTemplates]=useState<readonly DocumentFactoryTemplate[]>([]),[drafts,setDrafts]=useState<readonly DocumentFactoryDraft[]>([]),[templateId,setTemplateId]=useState(''),[title,setTitle]=useState(`كتاب رسمي — ${sourceTitle}`),[verifiedAnalysisId,setVerifiedAnalysisId]=useState<string|null>(null),[note,setNote]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const selectedTemplate=useMemo(()=>templates.find(x=>x.versionId===templateId)??null,[templates,templateId]);
 const load=async()=>{setLoading(true);try{const [t,d,intel]=await Promise.all([gateway.listTemplates(workspaceId),gateway.listDrafts(workspaceId,companyId,30),intelligenceGateway?intelligenceGateway.detail(workspaceId,documentId):Promise.resolve(null)]);setTemplates(t);setDrafts(d);setTemplateId(v=>t.some(x=>x.versionId===v)?v:t[0]?.versionId??'');const verified=intel?.analyses.find(x=>x.state==='verified'&&!x.stale)??null;setVerifiedAnalysisId(verified?.id??null);setError('')}catch(e){setError(errorText(e))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[gateway,intelligenceGateway,workspaceId,documentId,companyId]);
 const act=async(fn:()=>Promise<unknown>)=>{setBusy(true);try{await fn();setNote('');setError('');await load()}catch(e){setError(errorText(e))}finally{setBusy(false)}};
 const generate=()=>{if(!templateId)return Promise.resolve();return act(()=>gateway.generate({workspaceId,templateVersionId:templateId,title:title.trim(),companyId,transactionId,ocrAnalysisId:verifiedAnalysisId}))};
 const review=(draftId:string,decision:'approve'|'return')=>act(()=>gateway.review(workspaceId,draftId,decision,note.trim()||null));
 const issue=(draftId:string)=>act(()=>gateway.renderAndFinalize(workspaceId,draftId));
 const openFinal=async(draft:DocumentFactoryDraft)=>{if(!draft.finalDocumentId)return;setBusy(true);try{location.assign(await vaultGateway.downloadUrl(workspaceId,draft.finalDocumentId))}catch(e){setError(errorText(e));setBusy(false)}};
 return <section className="df-panel" data-phase10-3="document-factory" data-factory-authority="governed-rpc+render-proof">
  <div className="rk-section-title df-head"><div><span className="rk-kicker">Document Factory · 10.3</span><h3>مصنع الوثائق الرسمية</h3><p>يحوّل البيانات المتحققة إلى مسودة ثابتة، ثم PDF عربي نهائي محفوظ في الخزنة.</p></div><span className="rk-truth-chip">Generate → Review → Render → Finalize</span></div>
  {error?<section className="df-alert" role="alert"><strong>تعذر إكمال العملية</strong><span>{error}</span></section>:null}
  {loading?<div className="rk-skeleton df-loading" aria-label="تحميل مصنع الوثائق"/>:<>
   <section className="df-compose" aria-label="إنشاء مستند رسمي"><div className="df-compose__top"><div><strong>إنشاء مسودة من الحقائق المعتمدة</strong><small>{verifiedAnalysisId?'سيُضمَّن OCR المتحقق من هذه الوثيقة إذا احتاجه القالب.':'لا يوجد OCR متحقق حاليًا؛ سيستخدم القالب بيانات السجلات المتاحة فقط.'}</small></div>{verifiedAnalysisId?<span className="rk-truth-chip">OCR متحقق</span>:<span className="rk-non-authority-chip">OCR اختياري</span>}</div>
    <label className="df-field"><span>القالب المنشور</span><select value={templateId} onChange={e=>setTemplateId(e.target.value)} disabled={busy||!templates.length}><option value="">{templates.length?'اختر قالبًا':'لا توجد قوالب منشورة'}</option>{templates.map(t=><option key={t.versionId} value={t.versionId}>{t.name} · v{t.versionNumber}</option>)}</select></label>
    <label className="df-field"><span>عنوان المستند</span><input value={title} maxLength={320} onChange={e=>setTitle(e.target.value)}/></label>
    {selectedTemplate?<div className="df-template-meta"><span>{selectedTemplate.kind}</span><span>{Object.keys(selectedTemplate.tokenSchema).length} حقول دمج</span><span>نسخة {selectedTemplate.versionNumber}</span></div>:null}
    <button type="button" className="rk-button rk-button--primary df-primary" disabled={busy||!templateId||!title.trim()} onClick={()=>void generate()}>{busy?'جارٍ التنفيذ…':'توليد مسودة رسمية'}</button>
   </section>
   <section className="df-history"><div className="rk-section-title"><div><span className="rk-kicker">سجل الإصدار</span><h4>المسودات المرتبطة</h4></div><span className="rk-non-authority-chip">{drafts.length} مسودة</span></div>
    {!drafts.length?<div className="df-empty">لم تُنشأ مسودة مرتبطة بعد.</div>:drafts.map(d=><article className="df-draft" key={d.id} data-draft-status={d.status}><header><div><span className={d.status==='final'?'rk-truth-chip':'rk-non-authority-chip'}>{statusLabel[d.status]}</span><strong>{d.title}</strong></div><small>{d.updatedAt?new Date(d.updatedAt).toLocaleString('ar-IQ'):'—'}</small></header><details><summary>معاينة المحتوى والحقائق</summary><div className="df-preview"><p>{d.compiledContent}</p><dl>{Object.entries(d.facts).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v??'')}</dd></div>)}</dl></div></details>
      {d.status==='review_required'?<div className="df-review"><label className="df-field"><span>ملاحظة المراجعة</span><textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="اختياري — سبب الاعتماد أو الإرجاع…"/></label><div className="rk-source-actions"><button type="button" className="rk-button rk-button--primary" disabled={busy} onClick={()=>void review(d.id,'approve')}>اعتماد المسودة</button><button type="button" className="rk-button" disabled={busy} onClick={()=>void review(d.id,'return')}>إرجاع دون إصدار</button></div></div>:null}
      {d.status==='approved'?<button type="button" className="rk-button rk-button--primary df-primary" disabled={busy} onClick={()=>void issue(d.id)}>{busy?'جارٍ إنشاء PDF…':'إصدار PDF واعتماد نهائي'}</button>:null}
      {d.status==='final'?<div className="df-final"><span className="rk-truth-chip">تم ربط النسخة النهائية بالـVault</span><button type="button" className="rk-button" disabled={busy||!d.finalDocumentId} onClick={()=>void openFinal(d)}>فتح PDF النهائي</button></div>:null}
      {d.status==='draft'?<p className="df-returned">أُعيدت هذه المسودة ولم تعد قابلة للإصدار؛ أنشئ مسودة جديدة بعد تصحيح المصدر أو القالب.</p>:null}
     </article>)}
   </section>
  </>}
 </section>
}
