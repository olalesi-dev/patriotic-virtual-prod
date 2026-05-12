'use client';

import { useMemo, useState } from 'react';
import {
  getOptionKey,
  getOptionText,
  type OptionKeyConfig,
  type SelectOption,
} from '../lib/options';
import { Input } from './input';
import { Select, type BaseSelectProps, type SelectProps } from './select';

export type ComboboxProps<TValue, TMeta = unknown> = BaseSelectProps<
  TValue,
  TMeta
> &
  OptionKeyConfig<TValue> & {
    searchPlaceholder?: string;
  };

export function Combobox<TValue, TMeta = unknown>({
  getOptionKey: keyGetter,
  options,
  searchPlaceholder = 'Search...',
  ...props
}: ComboboxProps<TValue, TMeta>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        getOptionText(option).toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query],
  );

  const selectProps = {
    ...props,
    getOptionKey: keyGetter,
    options: filtered,
  } as unknown as SelectProps<TValue, TMeta>;
  const renderSelect = Select<TValue, TMeta>;

  return (
    <div className="space-y-2">
      <Input
        aria-label="Search options"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {renderSelect(selectProps)}
    </div>
  );
}
