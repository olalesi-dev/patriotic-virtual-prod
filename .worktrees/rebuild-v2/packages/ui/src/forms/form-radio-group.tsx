import { type ReactNode } from 'react';
import { type SelectOption } from '../lib/options';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormRadioGroupProps<TValue extends string> {
  field: FieldApiLike<TValue>;
  options: readonly SelectOption<TValue>[];
  label?: ReactNode;
  description?: ReactNode;
}

export function FormRadioGroup<TValue extends string>({
  description,
  field,
  label,
  options,
}: FormRadioGroupProps<TValue>) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <div className="grid gap-2">
        {options.map((option) => (
          <label className="flex items-center gap-2 text-sm" key={option.value}>
            <input
              checked={field.state.value === option.value}
              className="accent-current"
              disabled={option.disabled}
              name={field.name}
              type="radio"
              value={option.value}
              onBlur={field.handleBlur}
              onChange={() => field.handleChange(option.value)}
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </Field>
  );
}
