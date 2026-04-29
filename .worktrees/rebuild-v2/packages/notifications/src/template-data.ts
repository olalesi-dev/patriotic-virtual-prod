const platformName = 'Patriotic Telehealth';

type DateInput = Date | string | undefined;

const toDate = (value: DateInput): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const getPlatformName = (): string => platformName;

export const formatAppointmentDate = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const formatAppointmentTime = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
  }).format(date);
};

export const formatRequestedDate = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) {
    return 'as soon as possible';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
