import { type ReactNode } from 'react';
import { Input, type InputProps } from '../components/input';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormInputProps extends Omit<
  InputProps,
  'name' | 'value' | 'onChange'
> {
  field: FieldApiLike<string>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormInput({
  description,
  field,
  id = field.name,
  label,
  ...props
}: FormInputProps) {
  return (
    <Field
      description={description}
      error={getFieldError(field)}
      htmlFor={id}
      label={label}
    >
      <Input
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
