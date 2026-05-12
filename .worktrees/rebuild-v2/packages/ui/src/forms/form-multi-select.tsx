import { type ReactNode } from 'react';
import { MultiSelect, type MultiSelectProps } from '../components/multi-select';
import { type OptionKeyConfig, type SelectOption } from '../lib/options';
import { Field, getFieldError, type FieldApiLike } from './field';

export type FormMultiSelectProps<TValue, TMeta = unknown> = Omit<
  MultiSelectProps<TValue, TMeta>,
  'value' | 'onValueChange'
> &
  OptionKeyConfig<TValue> & {
    field: FieldApiLike<TValue[]>;
    label?: ReactNode;
    description?: ReactNode;
    options: readonly SelectOption<TValue, TMeta>[];
  };

export function FormMultiSelect<TValue, TMeta = unknown>({
  description,
  field,
  label,
  ...props
}: FormMultiSelectProps<TValue, TMeta>) {
  const multiSelectProps = props as unknown as MultiSelectProps<TValue, TMeta>;
  const renderMultiSelect = MultiSelect<TValue, TMeta>;

  return (
    <Field description={description} error={getFieldError(field)} label={label}>
      {renderMultiSelect({
        ...multiSelectProps,
        value: field.state.value,
        onValueChange: (value) => field.handleChange(value),
      })}
    </Field>
  );
}
