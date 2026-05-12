export interface PlainDateLike {
  year: number;
  month: number;
  day: number;
  toString(): string;
}

export interface PlainTimeLike {
  hour: number;
  minute: number;
  second?: number;
  toString(): string;
}

interface TemporalApi {
  PlainDate?: {
    from(value: string | PlainDateLike): PlainDateLike;
  };
  PlainTime?: {
    from(value: string | PlainTimeLike): PlainTimeLike;
  };
}

const getTemporal = () =>
  (globalThis as typeof globalThis & { Temporal?: TemporalApi }).Temporal;

const pad = (value: number) => String(value).padStart(2, '0');

export function plainDateFrom(value: string | PlainDateLike): PlainDateLike {
  const temporal = getTemporal();
  if (temporal?.PlainDate) {
    return temporal.PlainDate.from(value);
  }
  if (typeof value !== 'string') {
    return value;
  }
  const [year, month, day] = value.split('-').map(Number);
  return {
    year,
    month,
    day,
    toString: () => `${year}-${pad(month)}-${pad(day)}`,
  };
}

export function plainTimeFrom(value: string | PlainTimeLike): PlainTimeLike {
  const temporal = getTemporal();
  if (temporal?.PlainTime) {
    return temporal.PlainTime.from(value);
  }
  if (typeof value !== 'string') {
    return value;
  }
  const [hour, minute, second = 0] = value.split(':').map(Number);
  return {
    hour,
    minute,
    second,
    toString: () => `${pad(hour)}:${pad(minute)}:${pad(second)}`,
  };
}

export function formatPlainDate(value?: PlainDateLike | string | null) {
  if (!value) {
    return '';
  }
  return plainDateFrom(value).toString();
}

export function formatPlainTime(value?: PlainTimeLike | string | null) {
  if (!value) {
    return '';
  }
  const time = plainTimeFrom(value);
  return `${pad(time.hour)}:${pad(time.minute)}`;
}
