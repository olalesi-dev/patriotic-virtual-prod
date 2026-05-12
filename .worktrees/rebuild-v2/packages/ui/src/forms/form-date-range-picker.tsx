import { type ReactNode } from 'react';
import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangeValue,
} from '../components/date-range-picker';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormDateRangePickerProps extends Omit<
  DateRangePickerProps,
  'value' | 'onValueChange'
> {
  field: FieldApiLike<DateRangeValue>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormDateRangePicker({
  description,
  field,
  label,
  ...props
}: FormDateRangePickerProps) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <DateRangePicker
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...props}
      />
    </Field>
  );
}
