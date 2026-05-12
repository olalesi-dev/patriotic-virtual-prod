import { type ReactNode } from 'react';
import { TimePicker, type TimePickerProps } from '../components/time-picker';
import { type PlainTimeLike } from '../lib/temporal';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormTimePickerProps extends Omit<
  TimePickerProps,
  'value' | 'onValueChange'
> {
  field: FieldApiLike<PlainTimeLike | string | null>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormTimePicker({
  description,
  field,
  label,
  ...props
}: FormTimePickerProps) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <TimePicker
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...props}
      />
    </Field>
  );
}
