import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { classNames } from './classNames.ts';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  id: string;
  label: string;
  items: readonly TabItem[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ id, label, items, selectedId, onChange, className }: TabsProps) {
  const selectAt = (index: number) => {
    const item = items[index];
    if (!item) return;
    onChange(item.id);
    requestAnimationFrame(() => document.getElementById(`${id}-tab-${item.id}`)?.focus());
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!items.length) return;
    let target = index;
    if (event.key === 'ArrowLeft') target = (index + 1) % items.length;
    else if (event.key === 'ArrowRight') target = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = items.length - 1;
    else return;
    event.preventDefault();
    selectAt(target);
  };

  return (
    <div className={classNames('ui-tabs', className)} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const selected = item.id === selectedId;
        return (
          <button
            className={classNames('ui-tab', selected && 'ui-tab--selected')}
            id={`${id}-tab-${item.id}`}
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index)}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' ? <bdi className="ui-tab__count text-numeric">{item.count}</bdi> : null}
          </button>
        );
      })}
    </div>
  );
}
