import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className = '' }: FormFieldProps) {
  return (
    <label className={`form-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className = '', ...props }: FormInputProps) {
  return (
    <FormField label={label} className={className}>
      <input {...props} />
    </FormField>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly string[] | { value: string; label: string }[];
}

export function FormSelect({ label, options, className = '', ...props }: FormSelectProps) {
  return (
    <FormField label={label} className={className}>
      <select {...props}>
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ),
        )}
      </select>
    </FormField>
  );
}

interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FormCheckbox({ label, checked, onChange }: FormCheckboxProps) {
  return (
    <label className="form-checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
