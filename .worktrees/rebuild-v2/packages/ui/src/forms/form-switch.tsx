import { type ReactNode } from 'react';
import { Switch, type SwitchProps } from '../components/switch';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormSwitchProps extends Omit<
  SwitchProps,
  'checked' | 'onCheckedChange'
> {
  field: FieldApiLike<boolean>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormSwitch({
  description,
  field,
  label,
  ...props
}: FormSwitchProps) {
  return (
    <Field description={description} error={getFieldError(field)}>
      <label className="flex items-center gap-2 text-sm">
        <Switch
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
