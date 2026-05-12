import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import {
  buildAuthSecurityAuditInput,
  logAuthSecurityEvent,
} from './security-audit';
import * as auditService from '../audit/service';

describe('auth security audit', () => {
  afterEach(() => {
    mock.restore();
  });

  it('builds a PHI-free audit event for session revocation', () => {
    const input = buildAuthSecurityAuditInput({
      actor: {
        id: 'admin-1',
        name: 'Admin One',
        email: 'admin@example.com',
        role: 'SuperAdmin',
        organizationId: 'org-1',
      },
      targetUserId: 'user-1',
      event: 'manual_admin_action',
      request: new Request('https://api.example.com/api/admin/users/user-1/revoke-sessions', {
        method: 'POST',
        headers: {
          'user-agent': 'test-agent',
        },
      }),
      ipAddress: '127.0.0.1',
      details: {
        revoked: true,
      },
    });

    expect(input).toMatchObject({
      actorId: 'admin-1',
      actorName: 'Admin One',
      actorRole: 'SuperAdmin',
      action: 'UPDATE',
      resourceType: 'Auth Security',
      resourceId: 'user-1',
      organizationId: 'org-1',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      isPhiAccess: false,
      details: {
        event: 'manual_admin_action',
        targetUserId: 'user-1',
        path: '/api/admin/users/user-1/revoke-sessions',
        method: 'POST',
        revoked: true,
      },
    });
  });

  it('does not throw when audit persistence fails', async () => {
    spyOn(auditService, 'createAuditLog').mockRejectedValue(
      new Error('audit unavailable'),
    );
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      logAuthSecurityEvent({
        actor: {
          id: 'admin-1',
          email: 'admin@example.com',
          organizationId: 'org-1',
        },
        targetUserId: 'user-1',
        event: 'account_disabled',
      }),
    ).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});
