import { type ReactNode } from 'react';
import { DatePicker, type DatePickerProps } from '../components/date-picker';
import { type PlainDateLike } from '../lib/temporal';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormDatePickerProps extends Omit<
  DatePickerProps,
  'value' | 'onValueChange'
> {
  field: FieldApiLike<PlainDateLike | string | null>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormDatePicker({
  description,
  field,
  label,
  ...props
}: FormDatePickerProps) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <DatePicker
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...props}
      />
    </Field>
  );
}
