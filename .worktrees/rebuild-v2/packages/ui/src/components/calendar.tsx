'use client';

import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import {
  formatPlainDate,
  plainDateFrom,
  type PlainDateLike,
} from '../lib/temporal';
import { Button } from './button';
import { Select } from './select';

export interface CalendarProps {
  value?: PlainDateLike | string | null;
  defaultMonth?: PlainDateLike | string;
  fromYear?: number;
  toYear?: number;
  className?: string;
  onValueChange?: (value: PlainDateLike) => void;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const pad = (value: number) => String(value).padStart(2, '0');

function dateFromParts(year: number, month: number, day: number) {
  return plainDateFrom(`${year}-${pad(month)}-${pad(day)}`);
}

export function Calendar({
  className,
  defaultMonth,
  fromYear,
  onValueChange,
  toYear,
  value,
}: CalendarProps) {
  const selected = value ? plainDateFrom(value) : undefined;
  const initial =
    selected ??
    (defaultMonth
      ? plainDateFrom(defaultMonth)
      : plainDateFrom(new Date().toISOString().slice(0, 10)));
  const [visibleMonth, setVisibleMonth] = useState(initial.month);
  const [visibleYear, setVisibleYear] = useState(initial.year);
  const years = useMemo(() => {
    const start = fromYear ?? visibleYear - 80;
    const end = toYear ?? visibleYear + 20;
    return Array.from(
      { length: end - start + 1 },
      (_unused, index) => start + index,
    );
  }, [fromYear, toYear, visibleYear]);

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(visibleYear, visibleMonth - 1, 1));
    const startOffset = first.getUTCDay();
    const daysInMonth = new Date(
      Date.UTC(visibleYear, visibleMonth, 0),
    ).getUTCDate();
    return Array.from({ length: 42 }, (_unused, index) => {
      const day = index - startOffset + 1;
      return day > 0 && day <= daysInMonth ? day : undefined;
    });
  }, [visibleMonth, visibleYear]);

  const moveMonth = (delta: number) => {
    const next = new Date(Date.UTC(visibleYear, visibleMonth - 1 + delta, 1));
    setVisibleYear(next.getUTCFullYear());
    setVisibleMonth(next.getUTCMonth() + 1);
  };

  return (
    <div
      className={cn(
        'w-72 rounded-lg border bg-card p-3 text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Button
          aria-label="Previous month"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => moveMonth(-1)}
        >
          <IconChevronLeft size={16} />
        </Button>
        <Select
          className="flex-1"
          options={monthNames.map((label, index) => ({
            label,
            value: index + 1,
          }))}
          value={visibleMonth}
          onValueChange={setVisibleMonth}
        />
        <Select
          className="w-24"
          options={years.map((year) => ({ label: String(year), value: year }))}
          value={visibleYear}
          onValueChange={setVisibleYear}
        />
        <Button
          aria-label="Next month"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => moveMonth(1)}
        >
          <IconChevronRight size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {days.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, index) => {
          const date = day
            ? dateFromParts(visibleYear, visibleMonth, day)
            : undefined;
          const active =
            date &&
            selected &&
            formatPlainDate(date) === formatPlainDate(selected);
          return (
            <button
              className={cn(
                'h-8 rounded-md text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-0',
                active &&
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              )}
              disabled={!day}
              key={`${visibleYear}-${visibleMonth}-${index}`}
              type="button"
              onClick={() => date && onValueChange?.(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
