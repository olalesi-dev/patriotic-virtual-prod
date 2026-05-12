import { type ReactNode } from 'react';
import {
  PasswordInput,
  type PasswordInputProps,
} from '../components/password-input';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormPasswordInputProps extends Omit<
  PasswordInputProps,
  'name' | 'value' | 'onChange'
> {
  field: FieldApiLike<string>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormPasswordInput({
  description,
  field,
  id = field.name,
  label,
  ...props
}: FormPasswordInputProps) {
  return (
    <Field
      description={description}
      error={getFieldError(field)}
      htmlFor={id}
      label={label}
    >
      <PasswordInput
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
