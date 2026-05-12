import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { env } from '@workspace/env';
import { auditLogs } from '@workspace/db/schema';
import { db } from '../../db';

type AuditLogRow = typeof auditLogs.$inferSelect;

export interface AuditExportConfig {
  enabled: boolean;
  endpoint?: string;
  bearerToken?: string;
  timeoutMs: number;
  batchSize: number;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const parseBooleanFlag = (value: string | undefined) =>
  value?.trim().toLowerCase() === 'true';

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getAuditExportConfig = (): AuditExportConfig => ({
  enabled: parseBooleanFlag(env.AUDIT_EXPORT_ENABLED),
  endpoint: env.AUDIT_EXPORT_ENDPOINT?.trim() || undefined,
  bearerToken: env.AUDIT_EXPORT_BEARER_TOKEN?.trim() || undefined,
  timeoutMs: parsePositiveInteger(env.AUDIT_EXPORT_TIMEOUT_MS, 5000),
  batchSize: Math.min(
    parsePositiveInteger(env.AUDIT_EXPORT_BATCH_SIZE, 100),
    1000,
  ),
});

export const buildAuditExportPayload = (log: AuditLogRow) => ({
  schemaVersion: 1,
  id: log.id,
  organizationId: log.organizationId,
  actorId: log.actorId,
  actorRole: log.actorRole,
  action: log.action,
  resourceType: log.tableName,
  resourceId: log.recordId,
  summary: log.summary,
  details: log.details,
  ipAddress: log.ipAddress,
  userAgent: log.userAgent,
  isPhiAccess: log.isPhiAccess,
  hash: log.hash,
  previousHash: log.previousHash,
  hashAlgorithm: log.hashAlgorithm,
  createdAt: log.createdAt.toISOString(),
});

export const forwardAuditLogToSink = async (
  log: AuditLogRow,
  config: AuditExportConfig,
  fetcher: FetchLike = fetch,
) => {
  if (!config.enabled || !config.endpoint) {
    return { status: 'skipped' as const };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetcher(config.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.bearerToken
          ? { authorization: `Bearer ${config.bearerToken}` }
          : {}),
      },
      body: JSON.stringify(buildAuditExportPayload(log)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Audit export failed with HTTP ${response.status}`);
    }

    return {
      status: 'sent' as const,
      externalSinkId:
        response.headers.get('x-request-id') ??
        response.headers.get('x-amz-request-id') ??
        undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const processPendingAuditExports = async (
  config = getAuditExportConfig(),
) => {
  if (!config.enabled || !config.endpoint) {
    return { processed: 0, sent: 0, failed: 0, skipped: true };
  }

  const pending = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        inArray(auditLogs.exportStatus, ['pending', 'failed']),
        sql`${auditLogs.hash} is not null`,
      ),
    )
    .orderBy(asc(auditLogs.createdAt))
    .limit(config.batchSize);

  let sent = 0;
  let failed = 0;

  for (const log of pending) {
    try {
      const result = await forwardAuditLogToSink(log, config);
      if (result.status === 'sent') {
        sent += 1;
        await db
          .update(auditLogs)
          .set({
            exportStatus: 'sent',
            exportedAt: new Date(),
            externalSinkId: result.externalSinkId ?? null,
            lastExportError: null,
            exportAttempts: log.exportAttempts + 1,
          })
          .where(eq(auditLogs.id, log.id));
      }
    } catch (error) {
      failed += 1;
      await db
        .update(auditLogs)
        .set({
          exportStatus: 'failed',
          exportAttempts: log.exportAttempts + 1,
          lastExportError:
            error instanceof Error
              ? error.message
              : 'Unknown audit export error',
        })
        .where(eq(auditLogs.id, log.id));
    }
  }

  return { processed: pending.length, sent, failed, skipped: false };
};
