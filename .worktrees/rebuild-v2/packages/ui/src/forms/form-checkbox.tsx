import { type ReactNode } from 'react';
import { Checkbox, type CheckboxProps } from '../components/checkbox';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormCheckboxProps extends Omit<
  CheckboxProps,
  'checked' | 'onCheckedChange'
> {
  field: FieldApiLike<boolean>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormCheckbox({
  description,
  field,
  label,
  ...props
}: FormCheckboxProps) {
  return (
    <Field description={description} error={getFieldError(field)}>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={field.state.value}
          onBlur={field.handleBlur}
          onCheckedChange={(checked) => field.handleChange(checked === true)}
          {...props}
        />
        {label}
      </label>
    </Field>
  );
}
