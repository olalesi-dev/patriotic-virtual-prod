'use client';

import {
  type PlainTimeLike,
  formatPlainTime,
  plainTimeFrom,
} from '../lib/temporal';
import { Input } from './input';

export interface TimePickerProps {
  value?: PlainTimeLike | string | null;
  disabled?: boolean;
  onValueChange?: (value: PlainTimeLike) => void;
}

export function TimePicker({
  disabled,
  onValueChange,
  value,
}: TimePickerProps) {
  return (
    <Input
      disabled={disabled}
      type="time"
      value={formatPlainTime(value)}
      onChange={(event) =>
        onValueChange?.(plainTimeFrom(event.currentTarget.value))
      }
    />
  );
}
