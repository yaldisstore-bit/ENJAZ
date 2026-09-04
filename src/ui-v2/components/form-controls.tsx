import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

function fieldId(label: string, supplied?: string) {
  return supplied ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
}

export function EzTextarea(props: Readonly<TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}>) {
  const { label, hint, error, className = '', id, ...textareaProps } = props;
  const resolvedId = fieldId(label, id);
  return (
    <label className={`ez-field ez-field--textarea ${error ? 'ez-field--error' : ''} ${className}`.trim()} htmlFor={resolvedId}>
      <span className="ez-field__label">{label}</span>
      <span className="ez-field__control"><textarea {...textareaProps} id={resolvedId} /></span>
      {error ? <span className="ez-field__message" role="alert">{error}</span> : hint ? <span className="ez-field__hint">{hint}</span> : null}
    </label>
  );
}

export function EzSelect(props: Readonly<SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
}>) {
  const { label, hint, error, options, className = '', id, ...selectProps } = props;
  const resolvedId = fieldId(label, id);
  return (
    <label className={`ez-field ez-field--select ${error ? 'ez-field--error' : ''} ${className}`.trim()} htmlFor={resolvedId}>
      <span className="ez-field__label">{label}</span>
      <span className="ez-field__control">
        <select {...selectProps} id={resolvedId}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
      {error ? <span className="ez-field__message" role="alert">{error}</span> : hint ? <span className="ez-field__hint">{hint}</span> : null}
    </label>
  );
}

export function EzFormSection(props: Readonly<{ title: string; eyebrow?: string; children: ReactNode; aside?: ReactNode }>) {
  return (
    <section className="ez-form-section">
      <header className="ez-form-section__head">
        <div>{props.eyebrow ? <span>{props.eyebrow}</span> : null}<h3>{props.title}</h3></div>
        {props.aside ? <div>{props.aside}</div> : null}
      </header>
      <div className="ez-form-section__body">{props.children}</div>
    </section>
  );
}

export function EzFormActions(props: Readonly<{ children: ReactNode }>) {
  return <div className="ez-form-actions">{props.children}</div>;
}
