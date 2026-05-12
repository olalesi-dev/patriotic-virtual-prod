import { type ReactNode } from 'react';
import { Select, type SelectProps } from '../components/select';
import { type OptionKeyConfig, type SelectOption } from '../lib/options';
import { Field, getFieldError, type FieldApiLike } from './field';

export type FormSelectProps<TValue, TMeta = unknown> = Omit<
  SelectProps<TValue, TMeta>,
  'value' | 'onValueChange'
> &
  OptionKeyConfig<TValue> & {
    field: FieldApiLike<TValue>;
    label?: ReactNode;
    description?: ReactNode;
    options: readonly SelectOption<TValue, TMeta>[];
  };

export function FormSelect<TValue, TMeta = unknown>({
  description,
  field,
  label,
  ...props
}: FormSelectProps<TValue, TMeta>) {
  const selectProps = props as unknown as SelectProps<TValue, TMeta>;
  const renderSelect = Select<TValue, TMeta>;

  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      {renderSelect({
        ...selectProps,
        value: field.state.value,
        onValueChange: (value) => field.handleChange(value),
      })}
    </Field>
  );
}
