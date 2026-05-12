type AuditExportRow = Record<string, unknown>;

const csvColumns = [
  'id',
  'createdAt',
  'organizationId',
  'actorId',
  'actorName',
  'actorRole',
  'action',
  'resourceType',
  'resourceId',
  'summary',
  'ipAddress',
  'userAgent',
  'isPhiAccess',
  'exportStatus',
  'hash',
  'previousHash',
] as const;

const stringifyCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

export const escapeCsvCell = (value: unknown) => {
  const raw = stringifyCell(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
};

export const buildAuditExportRows = (logs: AuditExportRow[]) =>
  logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    organizationId: log.organizationId,
    actorId: log.actorId,
    actorName: log.actorName,
    actorRole: log.actorRole,
    action: log.action,
    resourceType: log.tableName,
    resourceId: log.recordId,
    summary: log.summary,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    isPhiAccess: log.isPhiAccess,
    exportStatus: log.exportStatus,
    hash: log.hash,
    previousHash: log.previousHash,
  }));

export const buildAuditCsv = (logs: AuditExportRow[]) => {
  const rows = buildAuditExportRows(logs);
  return [
    csvColumns.join(','),
    ...rows.map((row) =>
      csvColumns
        .map((column) => escapeCsvCell(row[column as keyof typeof row]))
        .join(','),
    ),
  ].join('\n');
};

export const normalizeAuditExportFormat = (format?: string) =>
  format?.toLowerCase() === 'json' ? 'json' : 'csv';
