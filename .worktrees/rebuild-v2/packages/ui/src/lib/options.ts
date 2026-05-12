import { type ReactNode } from 'react';

export type PrimitiveOptionValue = string | number | boolean;

export interface SelectOption<TValue, TMeta = unknown> {
  value: TValue;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  searchText?: string;
  meta?: TMeta;
}

export type OptionKeyGetter<TValue> = (value: TValue) => string;

export type SelectValueFromOptions<
  TOptions extends readonly SelectOption<unknown, unknown>[],
> =
  TOptions[number] extends SelectOption<infer TValue, unknown> ? TValue : never;

export type SelectMetaFromOptions<
  TOptions extends readonly SelectOption<unknown, unknown>[],
> = TOptions[number] extends SelectOption<unknown, infer TMeta> ? TMeta : never;

export function defineSelectOptions<
  const TOptions extends readonly SelectOption<unknown, unknown>[],
>(options: TOptions): TOptions {
  return options;
}

export type OptionKeyConfig<TValue> = TValue extends PrimitiveOptionValue
  ? { getOptionKey?: OptionKeyGetter<TValue> }
  : { getOptionKey: OptionKeyGetter<TValue> };

export function getOptionKey<TValue>(
  value: TValue,
  getOptionKey?: OptionKeyGetter<TValue>,
): string {
  if (getOptionKey) {
    return getOptionKey(value);
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  throw new Error('Object option values require getOptionKey.');
}

export function getOptionText<TValue, TMeta>(
  option: SelectOption<TValue, TMeta>,
): string {
  if (option.searchText) {
    return option.searchText;
  }
  if (typeof option.label === 'string') {
    return option.label;
  }
  if (typeof option.value === 'string') {
    return option.value;
  }
  if (typeof option.value === 'number' || typeof option.value === 'boolean') {
    return String(option.value);
  }
  return '';
}
