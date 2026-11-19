import styles from './form.module.css';

interface ShellProps {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: (a11y: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => React.ReactNode;
}

/** Etiqueta + control + nota (error en rojo o pista en gris), enlazados para lectores de pantalla. */
function FieldShell({ name, label, error, hint, children }: ShellProps) {
  const id = `field-${name}`;
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': note ? noteId : undefined,
      })}
      {note && (
        <p id={noteId} className={error ? styles.error : styles.hint}>
          {note}
        </p>
      )}
    </div>
  );
}

type Common = { name: string; label: string; error?: string; hint?: string };

export function Field({ name, label, error, hint, type = 'text', ...input }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint}>
      {(a11y) => <input {...input} {...a11y} name={name} type={type} className={styles.input} />}
    </FieldShell>
  );
}

export function TextareaField({ name, label, error, hint, ...textarea }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint}>
      {(a11y) => <textarea {...textarea} {...a11y} name={name} className={`${styles.input} ${styles.textarea}`} />}
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  options,
  ...select
}: Common & React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[] }) {
  return (
    <FieldShell name={name} label={label} error={error} hint={hint}>
      {(a11y) => (
        <select {...select} {...a11y} name={name} className={`${styles.input} ${styles.select}`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/** Casilla con texto (que puede incluir enlaces) y error debajo. */
export function CheckboxField({
  name,
  error,
  children,
  defaultChecked,
}: {
  name: string;
  error?: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
}) {
  const id = `field-${name}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.check}>
        <input
          id={id}
          name={name}
          type="checkbox"
          value="on"
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-note` : undefined}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-note`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.formSuccess} role="status">
      {message}
    </p>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: React.ReactNode; pendingLabel: string }) {
  return (
    <button type="submit" className={styles.submit} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
