import { useState } from 'react';
import { Link } from 'react-router';
import { BottomSheet, Dialog, TextField } from '../../design-system/components/index.ts';
import {
  CONTROL_TARGETS,
  GLOBAL_INTERACTION_ENTRIES,
  INBOX_TARGETS,
  QUICK_CREATE_INTENTS,
  formatInboxBadge,
  searchGlobalNavigation,
  type GlobalInteractionGlyph,
} from '../../core/interactions/globalInteractionContract.ts';

interface GlobalInteractionGlyphProps {
  name: GlobalInteractionGlyph;
}

function GlobalInteractionGlyphIcon({ name }: GlobalInteractionGlyphProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: false,
    'aria-hidden': true,
  };

  switch (name) {
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
    case 'inbox':
      return <svg {...common}><path d="M4.5 5.5h15v13h-15zM4.5 13h4l2 2h3l2-2h4" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'command':
      return <svg {...common}><path d="M6 4.5h12v5H6zM6 14.5h5v5H6zM15 14.5h3v5h-3z" /></svg>;
  }
}

export interface GlobalInteractionSurfacesProps {
  inboxCount?: number;
}

export function GlobalInteractionSurfaces({ inboxCount = 0 }: GlobalInteractionSurfacesProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [query, setQuery] = useState('');

  const badge = formatInboxBadge(inboxCount);
  const searchResults = searchGlobalNavigation(query);
  const inboxTarget = INBOX_TARGETS[0];

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <>
      <nav className="global-interactions" aria-label="الأدوات العامة">
        <div className="global-interactions__inner">
          <button
            className="global-interactions__item"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
          >
            <span className="global-interactions__icon"><GlobalInteractionGlyphIcon name="search" /></span>
            <span className="global-interactions__label">{GLOBAL_INTERACTION_ENTRIES[0].shortLabel}</span>
          </button>

          <Link
            className="global-interactions__item"
            to={inboxTarget.targetPath}
            aria-label={badge ? `صندوق الوارد، ${badge} عناصر غير مقروءة` : 'صندوق الوارد'}
          >
            <span className="global-interactions__icon global-interactions__icon--badge-anchor">
              <GlobalInteractionGlyphIcon name="inbox" />
              {badge ? <span className="global-interactions__badge" aria-hidden="true">{badge}</span> : null}
            </span>
            <span className="global-interactions__label">{GLOBAL_INTERACTION_ENTRIES[1].shortLabel}</span>
          </Link>

          <button
            className="global-interactions__item global-interactions__item--accent"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={quickCreateOpen}
            onClick={() => setQuickCreateOpen(true)}
          >
            <span className="global-interactions__icon"><GlobalInteractionGlyphIcon name="plus" /></span>
            <span className="global-interactions__label">{GLOBAL_INTERACTION_ENTRIES[2].shortLabel}</span>
          </button>

          <button
            className="global-interactions__item"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={controlOpen}
            onClick={() => setControlOpen(true)}
          >
            <span className="global-interactions__icon"><GlobalInteractionGlyphIcon name="command" /></span>
            <span className="global-interactions__label">{GLOBAL_INTERACTION_ENTRIES[3].shortLabel}</span>
          </button>
        </div>
      </nav>

      <Dialog
        id="global-search"
        open={searchOpen}
        title="البحث الشامل"
        description="بحث هيكلي آمن في أقسام إنجاز. البحث داخل بيانات المجالات يُضاف عند تسليم كل مجال."
        onClose={closeSearch}
        className="global-surface global-surface--search"
      >
        <div className="global-surface__stack">
          <TextField
            id="global-search-query"
            label="ابحث عن قسم"
            type="search"
            value={query}
            placeholder="مثال: معاملات، مالية، وثائق"
            autoComplete="off"
            inputMode="search"
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="global-surface__results" aria-live="polite">
            {query.trim().length < 2 ? (
              <p className="global-surface__hint type-caption">اكتب حرفين على الأقل لبدء البحث.</p>
            ) : searchResults.length ? (
              <ul className="global-surface__list" aria-label="نتائج البحث">
                {searchResults.map((route) => (
                  <li key={route.id}>
                    <Link className="global-surface__result" to={route.path} onClick={closeSearch}>
                      <span className="global-surface__result-copy">
                        <strong>{route.label}</strong>
                        <small>المحتوى الفعلي في Phase {route.deliveryPhase}</small>
                      </span>
                      <span className="global-surface__chevron" aria-hidden="true">‹</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="global-surface__empty type-caption">لا يوجد قسم مطابق. لم يتم اختلاق نتائج أو بيانات غير موجودة.</p>
            )}
          </div>
        </div>
      </Dialog>

      <BottomSheet
        id="global-quick-create"
        open={quickCreateOpen}
        title="إنشاء سريع"
        description="نقطة دخول واحدة؛ يفوّض التنفيذ إلى المجال المالك، وتبقى نماذج الإنشاء مملوكة للمجالات ولا تُنسخ داخل App Shell."
        onClose={() => setQuickCreateOpen(false)}
        className="global-surface"
      >
        <ul className="global-surface__list" aria-label="نوايا الإنشاء السريع">
          {QUICK_CREATE_INTENTS.map((intent) => (
            <li className="global-surface__delegate" key={intent.id}>
              <div className="global-surface__delegate-copy">
                <strong>{intent.actionLabel}</strong>
                <small>ينفذها قسم {intent.label} في Phase {intent.deliveryPhase}</small>
              </div>
              <Link
                className="global-surface__delegate-link"
                to={intent.targetPath}
                onClick={() => setQuickCreateOpen(false)}
              >
                فتح القسم
              </Link>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <BottomSheet
        id="global-control"
        open={controlOpen}
        title="القيادة والعمليات"
        description="الهيكل يوفّر نقطة الدخول فقط؛ منطق التشغيل يبقى في المجال المالك."
        onClose={() => setControlOpen(false)}
        className="global-surface"
      >
        <ul className="global-surface__list" aria-label="مراكز التحكم">
          {CONTROL_TARGETS.map((target) => (
            <li key={target.routeId}>
              <Link
                className="global-surface__result"
                to={target.targetPath}
                onClick={() => setControlOpen(false)}
              >
                <span className="global-surface__result-copy">
                  <strong>{target.label}</strong>
                  <small>محتوى المجال في Phase {target.deliveryPhase}</small>
                </span>
                <span className="global-surface__chevron" aria-hidden="true">‹</span>
              </Link>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
