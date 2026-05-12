'use client';

import { IconCalendar } from '@tabler/icons-react';
import { type PlainDateLike, formatPlainDate } from '../lib/temporal';
import { Button } from './button';
import { Calendar } from './calendar';
import { PopoverContent, PopoverRoot, PopoverTrigger } from './popover';

export interface DatePickerProps {
  value?: PlainDateLike | string | null;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: PlainDateLike) => void;
}

export function DatePicker({
  disabled,
  onValueChange,
  placeholder = 'Pick date',
  value,
}: DatePickerProps) {
  return (
    <PopoverRoot>
      <PopoverTrigger
        render={
          <Button
            className="w-full justify-start"
            disabled={disabled}
            leftContent={<IconCalendar size={16} />}
            type="button"
            variant="outline"
          >
            {formatPlainDate(value) || placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar value={value} onValueChange={onValueChange} />
      </PopoverContent>
    </PopoverRoot>
  );
}
