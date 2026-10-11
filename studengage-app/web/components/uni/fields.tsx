export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-rose">
      {error}
    </p>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal normal-case tracking-normal">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** a11y props for an input inside <Field>. */
export function describe(id: string, error?: string, hint?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function CheckGroup({
  legend,
  name,
  options,
  defaultChecked = [],
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  defaultChecked?: string[];
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {options.map((o) => (
          <label key={o.value} className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={o.value} defaultChecked={defaultChecked.includes(o.value)} className="accent-emerald" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
