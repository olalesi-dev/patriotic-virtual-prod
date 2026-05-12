'use client';

import { IconChevronDown, IconCheck } from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import {
  getOptionKey,
  type OptionKeyConfig,
  type SelectOption,
} from '../lib/options';

export interface BaseSelectProps<TValue, TMeta = unknown> {
  options: readonly SelectOption<TValue, TMeta>[];
  value?: TValue;
  defaultValue?: TValue;
  placeholder?: ReactNode;
  disabled?: boolean;
  className?: string;
  name?: string;
  onValueChange?: (value: TValue, option: SelectOption<TValue, TMeta>) => void;
}

export type SelectProps<TValue, TMeta = unknown> = BaseSelectProps<
  TValue,
  TMeta
> &
  OptionKeyConfig<TValue>;

export function Select<TValue, TMeta = unknown>({
  className,
  defaultValue,
  disabled,
  getOptionKey: keyGetter,
  name,
  onValueChange,
  options,
  placeholder = 'Select an option',
  value,
}: SelectProps<TValue, TMeta>) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<TValue | undefined>(
    defaultValue,
  );
  const selectedValue = value ?? internalValue;
  const selectedKey =
    selectedValue === undefined
      ? undefined
      : getOptionKey(selectedValue, keyGetter);
  const selected = useMemo(
    () =>
      options.find(
        (option) => getOptionKey(option.value, keyGetter) === selectedKey,
      ),
    [keyGetter, options, selectedKey],
  );

  const choose = (option: SelectOption<TValue, TMeta>) => {
    if (option.disabled) {
      return;
    }
    setInternalValue(option.value);
    setOpen(false);
    onValueChange?.(option.value, option);
  };

  return (
    <div className={cn('relative w-full', className)}>
      {name && selectedKey ? (
        <input name={name} type="hidden" value={selectedKey} />
      ) : undefined}
      <button
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        role="combobox"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={cn(
            'flex min-w-0 items-center gap-2 truncate',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected?.icon}
          {selected?.label ?? placeholder}
        </span>
        <IconChevronDown className="size-4 shrink-0 opacity-60" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <div role="listbox">
            {options.map((option) => {
              const optionKey = getOptionKey(option.value, keyGetter);
              const isSelected = optionKey === selectedKey;
              return (
                <button
                  aria-selected={isSelected}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  disabled={option.disabled}
                  key={optionKey}
                  role="option"
                  type="button"
                  onClick={() => choose(option)}
                >
                  <span className="inline-flex size-4 items-center justify-center">
                    {isSelected ? <IconCheck size={14} /> : undefined}
                  </span>
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : undefined}
    </div>
  );
}
