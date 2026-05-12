import { describe, expect, it } from 'bun:test';
import {
  buildAuditCsv,
  escapeCsvCell,
  normalizeAuditExportFormat,
} from './audit-export';

describe('audit export formatting', () => {
  it('escapes CSV cells with commas, quotes, and newlines', () => {
    expect(escapeCsvCell('simple')).toBe('simple');
    expect(escapeCsvCell('hello, "admin"\nnext')).toBe(
      '"hello, ""admin""\nnext"',
    );
  });

  it('builds a CSV export without raw object noise', () => {
    const csv = buildAuditCsv([
      {
        id: 'audit-1',
        createdAt: new Date('2026-05-09T00:00:00.000Z'),
        organizationId: 'org-1',
        actorId: 'admin-1',
        actorName: 'Admin, One',
        actorRole: 'Admin',
        action: 'VIEW',
        tableName: 'User',
        recordId: 'user-1',
        summary: 'Admin viewed User',
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        isPhiAccess: false,
        exportStatus: 'pending',
        hash: 'hash',
        previousHash: 'previous',
      },
    ]);

    expect(csv.split('\n')[0]).toContain('actorName');
    expect(csv).toContain('"Admin, One"');
    expect(csv).toContain('2026-05-09T00:00:00.000Z');
  });

  it('defaults export format to CSV', () => {
    expect(normalizeAuditExportFormat('json')).toBe('json');
    expect(normalizeAuditExportFormat('csv')).toBe('csv');
    expect(normalizeAuditExportFormat(undefined)).toBe('csv');
  });
});
