import { type ReactNode } from 'react';
import { Textarea, type TextareaProps } from '../components/textarea';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormTextareaInputProps extends Omit<
  TextareaProps,
  'name' | 'value' | 'onChange'
> {
  field: FieldApiLike<string>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormTextareaInput({
  description,
  field,
  id = field.name,
  label,
  ...props
}: FormTextareaInputProps) {
  return (
    <Field
      description={description}
      error={getFieldError(field)}
      htmlFor={id}
      label={label}
    >
      <Textarea
        id={id}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.currentTarget.value)}
        {...props}
      />
    </Field>
  );
}
