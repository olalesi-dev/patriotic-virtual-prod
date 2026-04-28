export const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;

export const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const formatNotificationDateTime = (value: unknown): string => {
  const parsed =
    typeof value === 'string' || value instanceof Date
      ? new Date(value)
      : undefined;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return 'your scheduled time';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(parsed);
};

export const readRecipientType = (
  data: Record<string, unknown>,
): 'patient' | 'provider' =>
  data.recipient_type === 'provider' ? 'provider' : 'patient';

export const readPatientName = (data: Record<string, unknown>): string =>
  asString(data.patient_name ?? data.patientName, 'the patient');

export const readProviderName = (data: Record<string, unknown>): string =>
  asString(data.provider_name ?? data.providerName, 'your care team');

export const readPortalLink = (
  data: Record<string, unknown>,
  fallback: string,
): string => asOptionalString(data.portalLink) ?? fallback;

export const buildReminderBody = (
  data: Record<string, unknown>,
  leadTimeLabel: string,
): string => {
  const appointmentAt = formatNotificationDateTime(data.appointmentAt);

  if (readRecipientType(data) === 'provider') {
    return `Your appointment with ${readPatientName(data)} starts in ${leadTimeLabel} at ${appointmentAt}.`;
  }

  return `Your appointment with ${readProviderName(data)} starts in ${leadTimeLabel} at ${appointmentAt}.`;
};
