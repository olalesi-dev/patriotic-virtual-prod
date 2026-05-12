import { type ReactNode } from 'react';
import { NumberInput, type NumberInputProps } from '../components/number-input';
import { Field, getFieldError, type FieldApiLike } from './field';

export interface FormNumberInputProps extends Omit<
  NumberInputProps,
  'name' | 'value' | 'onValueChange'
> {
  field: FieldApiLike<number>;
  label?: ReactNode;
  description?: ReactNode;
}

export function FormNumberInput({
  description,
  field,
  id = field.name,
  label,
  ...props
}: FormNumberInputProps) {
  return (
    <Field
      description={description}
      error={getFieldError(field)}
      htmlFor={id}
      label={label}
    >
      <NumberInput
        id={id}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onValueChange={field.handleChange}
        {...props}
      />
    </Field>
  );
}
