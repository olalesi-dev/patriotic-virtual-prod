import { describe, expect, it, mock } from 'bun:test';
import {
  buildAuditExportPayload,
  forwardAuditLogToSink,
  type AuditExportConfig,
} from './exporter';

const createAuditLog = () =>
  ({
    id: 'audit-1',
    organizationId: 'org-1',
    actorId: 'user-1',
    actorName: 'Admin',
    actorRole: 'Admin',
    action: 'VIEW',
    tableName: 'Patient',
    recordId: 'patient-1',
    summary: 'Admin viewed Patient ID patient-1',
    details: { method: 'GET' },
    oldData: null,
    newData: null,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    previousHash: 'previous-hash',
    hash: 'current-hash',
    hashAlgorithm: 'sha256',
    exportStatus: 'pending',
    exportedAt: null,
    exportAttempts: 0,
    lastExportError: null,
    externalSinkId: null,
    isPhiAccess: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }) as any;

const config: AuditExportConfig = {
  enabled: true,
  endpoint: 'https://audit.example.test/ingest',
  bearerToken: 'secret',
  timeoutMs: 1000,
  batchSize: 100,
};

describe('audit exporter', () => {
  it('builds append-only export payloads with hash-chain fields', () => {
    expect(buildAuditExportPayload(createAuditLog())).toMatchObject({
      schemaVersion: 1,
      id: 'audit-1',
      hash: 'current-hash',
      previousHash: 'previous-hash',
      hashAlgorithm: 'sha256',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('skips forwarding when export is disabled', async () => {
    const fetcher = mock(fetch);

    await expect(
      forwardAuditLogToSink(
        createAuditLog(),
        { ...config, enabled: false },
        fetcher,
      ),
    ).resolves.toEqual({ status: 'skipped' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts audit payloads to the configured endpoint', async () => {
    const fetcher = mock(
      async () =>
        new Response(null, {
          status: 202,
          headers: { 'x-request-id': 'sink-1' },
        }),
    );

    await expect(
      forwardAuditLogToSink(createAuditLog(), config, fetcher),
    ).resolves.toEqual({ status: 'sent', externalSinkId: 'sink-1' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = (fetcher as any).mock.calls[0];
    expect(url).toBe(config.endpoint);
    expect(init.headers.authorization).toBe('Bearer secret');
  });
});
