'use client';

import { type PlainDateLike, formatPlainDate } from '../lib/temporal';
import { Calendar } from './calendar';

export interface DateRangeValue {
  from?: PlainDateLike | string | null;
  to?: PlainDateLike | string | null;
}

export interface DateRangePickerProps {
  value?: DateRangeValue;
  onValueChange?: (value: DateRangeValue) => void;
}

export function DateRangePicker({
  onValueChange,
  value = {},
}: DateRangePickerProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm md:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium">
          From {formatPlainDate(value.from)}
        </div>
        <Calendar
          value={value.from}
          onValueChange={(from) => onValueChange?.({ ...value, from })}
        />
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">
          To {formatPlainDate(value.to)}
        </div>
        <Calendar
          value={value.to}
          onValueChange={(to) => onValueChange?.({ ...value, to })}
        />
      </div>
    </div>
  );
}
