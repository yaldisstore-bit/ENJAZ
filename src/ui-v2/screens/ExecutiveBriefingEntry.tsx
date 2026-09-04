import { EzBadge, EzButton } from '../components/primitives.tsx';

export function ExecutiveBriefingEntry(props: Readonly<{ onOpen(): void }>) {
  return (
    <section className="ez-executive-entry" data-executive-entry="true" data-pattern="executive-entry">
      <div>
        <span>نظرة الإدارة</span>
        <h2>الملخص التنفيذي</h2>
        <p>المخاطر والعوائق وضغط العمل والنبضة المالية في قراءة واحدة قبل اتخاذ القرار.</p>
      </div>
      <div><EzBadge tone="gold">مختصر</EzBadge><EzButton tone="dark" onClick={props.onOpen}>فتح الملخص التنفيذي</EzButton></div>
    </section>
  );
}
