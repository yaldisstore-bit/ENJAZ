import { Link } from 'react-router';
import {
  CONTROL_TARGETS,
  GLOBAL_INTERACTION_ENTRIES,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  GLOBAL_SEARCH_RESULT_LIMIT,
  INBOX_TARGETS,
  QUICK_CREATE_INTENTS,
} from '../../../core/interactions/globalInteractionContract.ts';
import { ROUTES } from '../../../core/routing/routes.ts';
import { GlobalInteractionSurfaces } from '../../../shared/interactions/GlobalInteractionSurfaces.tsx';

export function GlobalInteractionLabPage() {
  return (
    <main className="foundation-page interaction-lab" id="main-content">
      <section className="foundation-card" aria-labelledby="interaction-lab-title">
        <p className="foundation-eyebrow">Phase 3.3 · Global Interaction Surfaces</p>
        <h1 id="interaction-lab-title">الأسطح العامة لإنجاز</h1>
        <p className="interaction-lab__lead type-body">
          أربع نقاط دخول عالمية فوق App Shell، من دون نقل منطق المعاملات أو الشركات أو الإشعارات أو العمليات إلى الهيكل نفسه.
        </p>

        <div className="interaction-lab__dock-proof">
          <GlobalInteractionSurfaces inboxCount={20} />
        </div>

        <div className="interaction-lab__grid" aria-label="عقود الأسطح العامة">
          {GLOBAL_INTERACTION_ENTRIES.map((entry) => (
            <article className="interaction-lab__card" key={entry.id}>
              <strong>{entry.label}</strong>
              <span className="type-caption">{entry.description}</span>
              <code dir="ltr">{entry.presentation}</code>
            </article>
          ))}
        </div>

        <dl className="interaction-lab__facts">
          <div><dt>Search floor</dt><dd>{GLOBAL_SEARCH_MIN_QUERY_LENGTH} chars</dd></div>
          <div><dt>Search result cap</dt><dd>{GLOBAL_SEARCH_RESULT_LIMIT}</dd></div>
          <div><dt>Quick create intents</dt><dd>{QUICK_CREATE_INTENTS.length}</dd></div>
          <div><dt>Inbox delegates</dt><dd>{INBOX_TARGETS.length}</dd></div>
          <div><dt>Control delegates</dt><dd>{CONTROL_TARGETS.length}</dd></div>
        </dl>

        <p className="interaction-lab__boundary type-caption">
          ملاحظة الحدود: البحث في هذه المرحلة يكتشف أقسام إنجاز فقط. بيانات الأعمال، عدادات الوارد الحقيقية، ونماذج الإنشاء تُربط عند تسليم مجالاتها المعتمدة.
        </p>

        <Link className="foundation-link" to={ROUTES.navigationPreview}>العودة إلى Navigation Architecture 3.2</Link>
        <br />
        <Link className="foundation-link" to={ROUTES.foundation}>العودة إلى حالة الأساس</Link>
      </section>
    </main>
  );
}
