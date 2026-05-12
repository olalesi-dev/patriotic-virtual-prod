import { createHash } from 'node:crypto';

interface AuditHashInput {
  id: string;
  previousHash?: string | null;
  organizationId: string;
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  tableName: string;
  recordId: string;
  summary: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isPhiAccess: boolean;
}

export const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
};

export const buildAuditIntegrityHash = (input: AuditHashInput) =>
  createHash('sha256').update(stableSerialize(input)).digest('hex');

export const shouldExportAuditRecord = (input: {
  tableName: string;
  isPhiAccess?: boolean;
  details?: Record<string, unknown> | null;
}) => {
  if (input.isPhiAccess) {
    return true;
  }

  if (['Auth Security', 'Emergency Access'].includes(input.tableName)) {
    return true;
  }

  const event =
    typeof input.details?.event === 'string' ? input.details.event : undefined;
  return Boolean(
    event &&
    (event.startsWith('break_glass') ||
      event.includes('session') ||
      event.includes('password') ||
      event.includes('mfa') ||
      event.includes('permission') ||
      event.includes('role')),
  );
};
