import type { ChangeEvent } from 'react';
import { classNames } from './classNames.ts';

export interface SwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Switch({ id, label, description, checked, disabled = false, onChange, className }: SwitchProps) {
  return (
    <div className={classNames('ui-choice-row', className)}>
      <div className="ui-choice-row__copy text-container-safe">
        <label className="type-label" htmlFor={id}>{label}</label>
        {description ? <p className="type-caption">{description}</p> : null}
      </div>
      <button
        className="ui-switch"
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={() => onChange(!checked)}
      >
        <span className="ui-switch__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}

export interface CheckboxProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ id, label, description, checked, disabled = false, onChange, className }: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.checked);
  return (
    <label className={classNames('ui-checkbox', className)} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={handleChange} />
      <span className="ui-checkbox__box" aria-hidden="true"><span>✓</span></span>
      <span className="ui-checkbox__copy text-container-safe">
        <strong className="type-label">{label}</strong>
        {description ? <span className="type-caption">{description}</span> : null}
      </span>
    </label>
  );
}
