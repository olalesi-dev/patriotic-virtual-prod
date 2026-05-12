import { describe, it, expect, spyOn, mock, afterEach } from 'bun:test';
import { generateAuditSummary, createAuditLog } from './service';
import { db } from '../../db';

const mockPreviousAuditHash = (hash: string | null = null) =>
  spyOn(db, 'select').mockImplementation(
    () =>
      ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(hash ? [{ hash }] : []),
            }),
          }),
        }),
      }) as any,
  );

describe('Audit Service', () => {
  afterEach(() => {
    mock.restore();
  });

  describe('generateAuditSummary', () => {
    it('should format summary for VIEW action', () => {
      const summary = generateAuditSummary(
        'Admin John',
        'VIEW',
        'Patient',
        'cuid123',
      );
      expect(summary).toBe('Admin John viewed Patient ID cuid123');
    });

    it('should format summary for CREATE action', () => {
      const summary = generateAuditSummary(
        'System',
        'CREATE',
        'Appointment',
        'app-456',
      );
      expect(summary).toBe('System created Appointment ID app-456');
    });

    it('should format summary for UPDATE action', () => {
      const summary = generateAuditSummary(
        'Staff',
        'UPDATE',
        'Provider',
        'prov-789',
      );
      expect(summary).toBe('Staff updated Provider ID prov-789');
    });

    it('should format summary for DELETE action', () => {
      const summary = generateAuditSummary(
        'SuperAdmin',
        'DELETE',
        'User',
        'user-000',
      );
      expect(summary).toBe('SuperAdmin deleted User ID user-000');
    });

    it('should handle custom actions', () => {
      const summary = generateAuditSummary('Admin', 'LOGIN', 'Session');
      expect(summary).toBe('Admin logined Session');
    });

    it('should handle custom actions ending in e', () => {
      const summary = generateAuditSummary('Admin', 'APPROVE', 'Report');
      expect(summary).toBe('Admin approved Report');
    });

    it('should handle missing resourceId', () => {
      const summary = generateAuditSummary('Admin John', 'VIEW', 'Logs');
      expect(summary).toBe('Admin John viewed Logs');
    });
  });

  describe('createAuditLog', () => {
    it('should insert an audit log with provided organizationId', async () => {
      const mockLog = { id: 'log-123', summary: 'Test summary' } as any;

      mockPreviousAuditHash('previous-hash');
      const insertSpy = spyOn(db, 'insert').mockImplementation(
        () =>
          ({
            values: mock(() => ({
              returning: mock(() => [mockLog]),
            })) as any,
          }) as any,
      );

      const result = await createAuditLog({
        actorId: 'user-1',
        actorName: 'John Doe',
        actorRole: 'Admin',
        action: 'VIEW',
        resourceType: 'Patient',
        resourceId: 'pat-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        organizationId: 'org-1',
        isPhiAccess: false,
      });

      expect(result).toEqual(mockLog);
      expect(insertSpy).toHaveBeenCalled();
      const valuesCall = (insertSpy.mock.results[0].value as any).values.mock
        .calls[0][0];
      expect(valuesCall.ipAddress).toBe('127.0.0.1');
      expect(valuesCall.userAgent).toBe('test-agent');
      expect(valuesCall.isPhiAccess).toBe(false);
      expect(valuesCall.previousHash).toBe('previous-hash');
      expect(valuesCall.hash).toHaveLength(64);
      expect(valuesCall.hashAlgorithm).toBe('sha256');
      expect(valuesCall.exportStatus).toBe('not_required');
    });

    it('should default organizationId if not provided', async () => {
      const mockLog = { id: 'log-456', summary: 'Default Org summary' } as any;
      const mockOrg = {
        id: 'patriotic-org-id',
        name: 'Patriotic Virtual Telehealth',
      };

      // Mock organization lookup
      const orgSpy = spyOn(
        db.query.organizations,
        'findFirst',
      ).mockResolvedValue(mockOrg as any);
      mockPreviousAuditHash();

      // Mock insert
      const insertSpy = spyOn(db, 'insert').mockImplementation(() => {
        const valuesMock = mock(() => ({
          returning: mock(() => [mockLog]),
        }));
        return { values: valuesMock } as any;
      });

      const result = await createAuditLog({
        actorId: 'user-2',
        actorName: 'Jane Smith',
        actorRole: 'Staff',
        action: 'CREATE',
        resourceType: 'Appointment',
        ipAddress: '192.168.1.1',
      });

      expect(result).toEqual(mockLog);
      expect(orgSpy).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalled();

      // Verify that the insert used the found organization ID
      const valuesCall = (insertSpy.mock.results[0].value as any).values.mock
        .calls[0][0];
      expect(valuesCall.organizationId).toBe('patriotic-org-id');
    });

    it('marks auth and PHI audit rows pending for export', async () => {
      const mockLog = { id: 'log-789', summary: 'Security summary' } as any;

      mockPreviousAuditHash('previous-hash');
      const insertSpy = spyOn(db, 'insert').mockImplementation(() => {
        const valuesMock = mock(() => ({
          returning: mock(() => [mockLog]),
        }));
        return { values: valuesMock } as any;
      });

      await createAuditLog({
        actorId: 'user-3',
        actorName: 'Security Admin',
        actorRole: 'Admin',
        action: 'UPDATE',
        resourceType: 'Auth Security',
        resourceId: 'user-3',
        ipAddress: '127.0.0.1',
        organizationId: 'org-1',
      });

      const valuesCall = (insertSpy.mock.results[0].value as any).values.mock
        .calls[0][0];
      expect(valuesCall.exportStatus).toBe('pending');
    });
  });
});
