import type { ChangeEvent, ReactNode } from 'react';
import { classNames } from './classNames.ts';

interface FieldFrameProps {
  id: string;
  label: string;
  hint: string | undefined;
  error: string | undefined;
  required: boolean;
  children: ReactNode;
  className: string | undefined;
}

function descriptionIds(id: string, hint?: string, error?: string): string | undefined {
  const values = [] as string[];
  if (hint) values.push(`${id}-hint`);
  if (error) values.push(`${id}-error`);
  return values.length ? values.join(' ') : undefined;
}

function FieldFrame({ id, label, hint, error, required, children, className }: FieldFrameProps) {
  return (
    <div className={classNames('ui-field', error && 'ui-field--error', className)}>
      <label className="ui-field__label type-label" htmlFor={id}>
        <span>{label}</span>
        {required ? <span className="ui-field__required" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint ? <p className="ui-field__hint type-caption" id={`${id}-hint`}>{hint}</p> : null}
      {error ? <p className="ui-field__error type-caption" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}

export interface TextFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'search' | 'password';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search' | 'url' | 'none';
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function TextField({
  id,
  label,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  autoComplete,
  inputMode,
  onChange,
  className,
}: TextFieldProps) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        className="ui-field__control type-body"
        id={id}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionIds(id, hint, error)}
        onChange={onChange}
      />
    </FieldFrame>
  );
}

export interface TextAreaFieldProps {
  id: string;
  label: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

export function TextAreaField({
  id,
  label,
  value,
  defaultValue,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  rows = 4,
  onChange,
  className,
}: TextAreaFieldProps) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        className="ui-field__control ui-field__control--textarea type-body"
        id={id}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionIds(id, hint, error)}
        onChange={onChange}
      />
    </FieldFrame>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  id: string;
  label: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

export function SelectField({
  id,
  label,
  options,
  value,
  defaultValue,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  onChange,
  className,
}: SelectFieldProps) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        className="ui-field__control ui-field__control--select type-body"
        id={id}
        value={value}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionIds(id, hint, error)}
        onChange={onChange}
      >
        {placeholder ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
    </FieldFrame>
  );
}
