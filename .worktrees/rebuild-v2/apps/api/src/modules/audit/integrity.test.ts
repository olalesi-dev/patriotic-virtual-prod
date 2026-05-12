import { describe, expect, it } from 'bun:test';
import {
  buildAuditIntegrityHash,
  shouldExportAuditRecord,
  stableSerialize,
} from './integrity';

describe('audit integrity helpers', () => {
  it('serializes objects with stable key order', () => {
    expect(stableSerialize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('builds deterministic chain hashes including the previous hash', () => {
    const input = {
      id: 'audit-1',
      previousHash: 'previous',
      organizationId: 'org-1',
      actorId: 'user-1',
      actorName: 'Admin',
      actorRole: 'Admin',
      action: 'VIEW',
      tableName: 'Patient',
      recordId: 'patient-1',
      summary: 'Admin viewed Patient ID patient-1',
      details: { method: 'GET' },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      isPhiAccess: true,
    };

    expect(buildAuditIntegrityHash(input)).toBe(buildAuditIntegrityHash(input));
    expect(buildAuditIntegrityHash(input)).toHaveLength(64);
    expect(
      buildAuditIntegrityHash({ ...input, previousHash: 'different' }),
    ).not.toBe(buildAuditIntegrityHash(input));
  });

  it('exports PHI, auth security, and break-glass events', () => {
    expect(
      shouldExportAuditRecord({ tableName: 'Patient', isPhiAccess: true }),
    ).toBe(true);
    expect(
      shouldExportAuditRecord({
        tableName: 'Auth Security',
        isPhiAccess: false,
      }),
    ).toBe(true);
    expect(
      shouldExportAuditRecord({
        tableName: 'Anything',
        details: { event: 'break_glass_route_access' },
      }),
    ).toBe(true);
    expect(
      shouldExportAuditRecord({ tableName: 'Settings', isPhiAccess: false }),
    ).toBe(false);
  });
});
