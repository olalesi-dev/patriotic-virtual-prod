import { describe, it, expect, spyOn, mock, afterEach } from 'bun:test';
import { generateAuditSummary, createAuditLog } from './service';
import { db } from '../../db';

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
        organizationId: 'org-1',
      });

      expect(result).toEqual(mockLog);
      expect(insertSpy).toHaveBeenCalled();
    });

    it('should default organizationId if not provided', async () => {
      const mockLog = { id: 'log-456', summary: 'Default Org summary' } as any;
      const mockOrg = {
        id: 'patriotic-org-id',
        name: 'Patriotic Virtual Telehealth',
      };

      // Mock organization lookup
      const orgSpy = spyOn(db.query.organizations, 'findFirst').mockResolvedValue(
        mockOrg as any,
      );

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
  });
});
