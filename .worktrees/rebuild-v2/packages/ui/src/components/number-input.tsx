'use client';

import { IconMinus, IconPlus } from '@tabler/icons-react';
import { type ComponentProps } from 'react';
import { Button } from './button';
import { Input } from './input';

export interface NumberInputProps extends Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> {
  value?: number;
  step?: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
}

export function NumberInput({
  max,
  min,
  onValueChange,
  step = 1,
  value = 0,
  ...props
}: NumberInputProps) {
  const update = (next: number) => {
    const bounded = Math.min(max ?? next, Math.max(min ?? next, next));
    onValueChange?.(bounded);
  };

  return (
    <Input
      inputMode="decimal"
      type="number"
      value={value}
      leftContent={
        <Button
          aria-label="Decrease"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => update(value - step)}
        >
          <IconMinus size={16} />
        </Button>
      }
      rightContent={
        <Button
          aria-label="Increase"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => update(value + step)}
        >
          <IconPlus size={16} />
        </Button>
      }
      onChange={(event) => update(event.currentTarget.valueAsNumber)}
      {...props}
    />
  );
}
