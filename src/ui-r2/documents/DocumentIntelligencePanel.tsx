import {useCallback,useEffect,useState} from 'react';
import type {DocumentVaultGateway} from '../../features/documents/documentVaultCommands.ts';
import type {DocumentAnalysis,DocumentIntelligenceState} from '../../features/documents/documentIntelligenceContract.ts';

type Props=Readonly<{gateway:DocumentVaultGateway;workspaceId:string;documentId:string}>;
const stateLabel=(state:DocumentIntelligenceState)=>({queued:'في قائمة التحليل',extracting:'جارٍ الاستخراج',review_required:'بانتظار المراجعة',reviewed:'تمت المراجعة',verified:'متحقق',rejected:'مرفوض',failed:'فشل التحليل',superseded:'نسخة قديمة',legacy_unverified:'قديم وغير متحقق'} as const)[state];
const percent=(value:number|null)=>value==null?'—':`${Math.round(value*100)}%`;

export function DocumentIntelligencePanel({gateway,workspaceId,documentId}:Props){
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[analyses,setAnalyses]=useState<readonly DocumentAnalysis[]>([]),[version,setVersion]=useState<number|null>(null);
 const load=useCallback(async()=>{setLoading(true);try{const report=await gateway.intelligence(workspaceId,documentId);setAnalyses(report.analyses);setVersion(report.currentVersionNumber);setError('')}catch{setError('تعذر تحميل نتائج القراءة الذكية.')}finally{setLoading(false)}},[gateway,workspaceId,documentId]);
 useEffect(()=>{void load()},[load]);
 const run=async()=>{setBusy(true);setError('');try{await gateway.extract(workspaceId,documentId,version);await load()}catch{setError('تعذر إكمال القراءة الذكية. تحقق من إعداد Azure ومن صلاحية الملف ثم أعد المحاولة.')}finally{setBusy(false)}};
 const review=async(id:string,decision:'accept'|'reject')=>{setBusy(true);setError('');try{await gateway.reviewExtraction(workspaceId,id,decision);await load()}catch{setError('تعذر تسجيل قرار المراجعة.')}finally{setBusy(false)}};
 const verify=async(id:string)=>{setBusy(true);setError('');try{await gateway.verifyExtraction(workspaceId,id);await load()}catch{setError('تعذر تثبيت التحقق النهائي.')}finally{setBusy(false)}};
 const current=analyses[0]??null,fields=current?Object.entries(current.extractedFields):[];
 return <section className="rk-derived" data-phase10-2="document-intelligence" data-source-authority="SOURCE_FILE_REMAINS_AUTHORITATIVE">
  <div className="rk-section-title"><div><span className="rk-kicker">Document Intelligence · 10.2</span><h3>القراءة الذكية للوثيقة</h3></div><span className="rk-non-authority-chip">الملف الأصلي هو المرجع</span></div>
  <p>يستخرج إنجاز النص والحقول للمساعدة فقط. لا تتحول النتيجة إلى معلومة موثقة إلا بعد المراجعة ثم التحقق الصريح.</p>
  {error?<div className="rk-empty rk-empty--error" role="alert"><p>{error}</p></div>:null}
  {loading?<div className="rk-skeleton"/>:<>
   <section className="rk-provenance"><div><span>نسخة المصدر</span><strong>{version?`v${version}`:'—'}</strong></div><div><span>الحالة</span><strong>{current?stateLabel(current.state):'لم تُحلل'}</strong></div><div><span>الثقة</span><strong>{current?percent(current.confidence):'—'}</strong></div></section>
   <div className="rk-source-actions"><button type="button" className="rk-button rk-button--primary" disabled={busy||current?.state==='extracting'||current?.state==='queued'} onClick={()=>void run()}>{busy?'جارٍ التنفيذ…':current?'إعادة القراءة من النسخة الحالية':'تشغيل القراءة الذكية'}</button><button type="button" className="rk-button" disabled={busy} onClick={()=>void load()}>تحديث النتيجة</button></div>
   {current?<article className="rk-derived-card" data-intelligence-state={current.state}><div className="rk-section-title"><div><strong>{stateLabel(current.state)}</strong><p>{current.provider||'محرك الاستخراج غير مسجل'}</p></div><span className="rk-truth-chip">{percent(current.confidence)}</span></div>
    {current.failureCode?<p role="alert">رمز الفشل: {current.failureCode}</p>:null}
    {current.state==='review_required'?<div className="rk-source-actions"><button type="button" className="rk-button rk-button--primary" disabled={busy} onClick={()=>void review(current.id,'accept')}>اعتماد المراجعة</button><button type="button" className="rk-button" disabled={busy} onClick={()=>void review(current.id,'reject')}>رفض النتيجة</button></div>:null}
    {current.state==='reviewed'?<div className="rk-source-actions"><button type="button" className="rk-button rk-button--primary" disabled={busy} onClick={()=>void verify(current.id)}>تحقق نهائي صريح</button></div>:null}
    {fields.length?<div className="rk-result-grid">{fields.map(([key,field])=><div className="rk-result" key={key}><strong>{key}</strong><span className="rk-result__excerpt">{field.value||'—'}</span><span className="rk-result__foot"><span>صفحة {field.pageNumber}</span><span>ثقة {percent(field.confidence)}</span></span></div>)}</div>:null}
    {current.ocrText?<div className="rk-official-text"><div className="rk-section-title"><h3>النص المستخرج</h3><span className="rk-non-authority-chip">مشتق وغير بديل للأصل</span></div><p style={{whiteSpace:'pre-wrap'}}>{current.ocrText}</p></div>:null}
   </article>:<section className="rk-empty"><div className="rk-empty__mark">◎</div><h3>لا توجد قراءة بعد</h3><p>ابدأ التحليل من النسخة الحالية، ثم راجع النتيجة قبل التحقق منها.</p></section>}
  </>}
 </section>
}
