import { type ReactNode } from 'react';
import { Progress, type ProgressProps } from '../components/progress';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormProgressProps extends Omit<ProgressProps, 'value'> {
  field: FieldApiLike<number>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormProgress({
  description,
  field,
  label,
  ...props
}: FormProgressProps) {
  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      <Progress value={field.state.value} {...props} />
    </Field>
  );
}
