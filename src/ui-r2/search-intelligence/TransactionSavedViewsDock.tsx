import { useState, useSyncExternalStore } from 'react';
import {
  createTransactionSavedViewDefinition,
} from '../../features/transactions/transactionListModel.ts';
import {
  getTransactionSavedViewBridgeSnapshot,
  subscribeTransactionSavedViewBridge,
} from '../../features/transactions/transactionSavedViewBridge.ts';
import {
  fromTransactionSavedView,
  toTransactionSavedView,
} from '../../features/searchIntelligence/searchSavedViewContract.ts';
import { useSavedViews } from '../../features/searchIntelligence/useSearchIntelligence.ts';

export function TransactionSavedViewsDock() {
  const bridge = useSyncExternalStore(subscribeTransactionSavedViewBridge, getTransactionSavedViewBridgeSnapshot, getTransactionSavedViewBridgeSnapshot);
  const saved = useSavedViews('transactions');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  if (!bridge.request || !bridge.apply) return null;

  const definition = fromTransactionSavedView(createTransactionSavedViewDefinition(bridge.request));
  const create = async () => {
    const clean = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!clean) { setMessage('اكتب اسماً للمنظر أولاً.'); return; }
    setMessage(null);
    try { await saved.createPersonal(clean, definition); setName(''); setMessage('تم حفظ المنظر الشخصي.'); }
    catch { setMessage(saved.errorMessage ?? 'تعذر حفظ المنظر.'); }
  };
  const apply = (item: (typeof saved.items)[number]) => {
    const transactionView = toTransactionSavedView(item.definition);
    if (!transactionView) { setMessage('هذا المنظر لم يعد متوافقاً مع عقد قائمة المعاملات.'); return; }
    bridge.apply?.(transactionView);
    setMessage(`تم تطبيق «${item.name}».`);
  };
  const rename = async (item: (typeof saved.items)[number]) => {
    const next = window.prompt('الاسم الجديد للمنظر', item.name)?.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!next || next === item.name) return;
    try { await saved.rename(item, next); setMessage('تمت إعادة تسمية المنظر.'); }
    catch { setMessage(saved.errorMessage ?? 'تعذر إعادة التسمية.'); }
  };
  const remove = async (item: (typeof saved.items)[number]) => {
    if (!window.confirm(`حذف المنظر «${item.name}»؟`)) return;
    try { await saved.remove(item); setMessage('تم حذف المنظر.'); }
    catch { setMessage(saved.errorMessage ?? 'تعذر حذف المنظر.'); }
  };

  return <section className="r2-saved-views" data-phase9-2-saved-views="transactions" aria-label="المناظر الذكية المحفوظة">
    <div className="r2-saved-views__head"><div><span>Phase 9.2</span><strong>مناظري الذكية</strong></div><small>يحفظ البحث والمنظر والترتيب وحجم الصفحة فقط — بلا نسخ للنتائج.</small></div>
    <div className="r2-saved-views__create"><input aria-label="اسم المنظر المحفوظ" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: المتلكئة عالية الأولوية" /><button type="button" disabled={saved.busyId !== null} onClick={() => { void create(); }}>{saved.busyId === 'new' ? 'جارٍ الحفظ…' : 'حفظ المنظر الحالي'}</button></div>
    {saved.status === 'loading' ? <p className="r2-saved-views__state">جارٍ تحميل المناظر…</p> : null}
    {saved.status === 'error' ? <p className="r2-saved-views__state is-error">{saved.errorMessage}<button type="button" onClick={saved.retry}>إعادة المحاولة</button></p> : null}
    {saved.status === 'ready' ? <div className="r2-saved-views__list">{saved.items.length ? saved.items.map((item) => {
      const compatible = toTransactionSavedView(item.definition) !== null;
      const owned = item.ownerUserId === saved.userId;
      return <article key={item.id} className="r2-saved-view-chip" data-saved-view-id={item.id} data-saved-view-visibility={item.visibility}>
        <button type="button" className="r2-saved-view-chip__apply" disabled={!compatible || saved.busyId === item.id} onClick={() => apply(item)}><strong>{item.name}</strong><small>{item.visibility === 'personal' ? 'شخصي' : item.visibility === 'team' ? 'فريق' : 'مساحة العمل'}</small></button>
        {owned ? <span className="r2-saved-view-chip__actions"><button type="button" aria-label={`إعادة تسمية ${item.name}`} disabled={saved.busyId === item.id} onClick={() => { void rename(item); }}>✎</button><button type="button" aria-label={`حذف ${item.name}`} disabled={saved.busyId === item.id} onClick={() => { void remove(item); }}>×</button></span> : null}
      </article>;
    }) : <p className="r2-saved-views__state">لا توجد مناظر محفوظة بعد.</p>}</div> : null}
    {(message || saved.errorMessage) ? <p className="r2-saved-views__message" role="status">{message ?? saved.errorMessage}</p> : null}
  </section>;
}
