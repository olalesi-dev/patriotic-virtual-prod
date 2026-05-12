'use client';

import { IconChevronDown, IconX } from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import {
  getOptionKey,
  getOptionText,
  type OptionKeyConfig,
  type SelectOption,
} from '../lib/options';
import { Badge } from './badge';

export interface BaseMultiSelectProps<TValue, TMeta = unknown> {
  options: readonly SelectOption<TValue, TMeta>[];
  value?: TValue[];
  defaultValue?: TValue[];
  placeholder?: ReactNode;
  disabled?: boolean;
  className?: string;
  name?: string;
  onValueChange?: (
    value: TValue[],
    options: SelectOption<TValue, TMeta>[],
  ) => void;
}

export type MultiSelectProps<TValue, TMeta = unknown> = BaseMultiSelectProps<
  TValue,
  TMeta
> &
  OptionKeyConfig<TValue>;

export function MultiSelect<TValue, TMeta = unknown>({
  className,
  defaultValue = [],
  disabled,
  getOptionKey: keyGetter,
  name,
  onValueChange,
  options,
  placeholder = 'Select options',
  value,
}: MultiSelectProps<TValue, TMeta>) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<TValue[]>(defaultValue);
  const selectedValues = value ?? internalValue;
  const selectedKeys = new Set(
    selectedValues.map((item) => getOptionKey(item, keyGetter)),
  );
  const selectedOptions = useMemo(
    () =>
      options.filter((option) =>
        selectedKeys.has(getOptionKey(option.value, keyGetter)),
      ),
    [keyGetter, options, selectedKeys],
  );

  const update = (next: TValue[]) => {
    setInternalValue(next);
    const nextKeys = new Set(next.map((item) => getOptionKey(item, keyGetter)));
    onValueChange?.(
      next,
      options.filter((option) =>
        nextKeys.has(getOptionKey(option.value, keyGetter)),
      ),
    );
  };

  const toggle = (option: SelectOption<TValue, TMeta>) => {
    const key = getOptionKey(option.value, keyGetter);
    const next = selectedKeys.has(key)
      ? selectedValues.filter((item) => getOptionKey(item, keyGetter) !== key)
      : [...selectedValues, option.value];
    update(next);
  };

  return (
    <div className={cn('relative w-full', className)}>
      {name
        ? selectedValues.map((item) => (
            <input
              key={getOptionKey(item, keyGetter)}
              name={name}
              type="hidden"
              value={getOptionKey(item, keyGetter)}
            />
          ))
        : undefined}
      <button
        aria-expanded={open}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {selectedOptions.length ? (
            selectedOptions.map((option) => (
              <Badge
                key={getOptionKey(option.value, keyGetter)}
                variant="secondary"
              >
                {option.icon}
                {getOptionText(option)}
                <span className="ml-1 inline-flex">
                  <IconX size={12} />
                </span>
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <IconChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((option) => {
            const key = getOptionKey(option.value, keyGetter);
            const selected = selectedKeys.has(key);
            return (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                key={key}
              >
                <input
                  checked={selected}
                  className="accent-current"
                  disabled={option.disabled}
                  type="checkbox"
                  onChange={() => toggle(option)}
                />
                {option.icon}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : undefined}
    </div>
  );
}
