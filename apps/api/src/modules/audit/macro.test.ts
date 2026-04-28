import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { auditMacro } from './macro';
import * as auditService from './service';

// Mocking the service
mock.module('./service', () => ({
  createAuditLog: mock(() => Promise.resolve({ id: 'log-1' })),
  generateAuditSummary: mock(() => 'summary'),
}));

describe('Audit Macro', () => {
  beforeEach(() => {
    (auditService.createAuditLog as any).mockClear();
  });

  it('should log PHI access when PHI macro is used with underscore', async () => {
    const app = new Elysia()
      .use(auditMacro)
      .derive(() => ({
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin' },
        ip: '127.0.0.1',
      }))
      .get('/patient/:id', () => ({ success: true }), {
        PHI: 'VIEW_PATIENT',
      });

    await app.handle(new Request('http://localhost/patient/123'));

    expect(auditService.createAuditLog).toHaveBeenCalled();
    const call = (auditService.createAuditLog as any).mock.calls[0][0];
    expect(call.actorId).toBe('user-1');
    expect(call.action).toBe('VIEW');
    expect(call.resourceType).toBe('PATIENT');
    expect(call.resourceId).toBe('123');
  });

  it('should log PHI access when PHI macro is used with space', async () => {
    const app = new Elysia()
      .use(auditMacro)
      .derive(() => ({
        user: { id: 'user-2', name: 'User 2', email: 'user2@example.com', role: 'user' },
        ip: '192.168.1.1',
      }))
      .get('/patient/:patientId', () => ({ success: true }), {
        PHI: 'READ PATIENT_PROFILE',
      });

    await app.handle(new Request('http://localhost/patient/456'));

    expect(auditService.createAuditLog).toHaveBeenCalled();
    const call = (auditService.createAuditLog as any).mock.calls[0][0];
    expect(call.actorId).toBe('user-2');
    expect(call.action).toBe('READ');
    expect(call.resourceType).toBe('PATIENT_PROFILE');
    expect(call.resourceId).toBe('456');
  });

  it('should throw error if user is missing', async () => {
    const app = new Elysia()
      .use(auditMacro)
      .derive(() => ({
        ip: '127.0.0.1',
        user: null,
      }))
      .get('/patient/:id', () => ({ success: true }), {
        PHI: 'VIEW_PATIENT',
      });

    const response = await app.handle(new Request('http://localhost/patient/123'));
    expect(response.status).toBe(500);
  });
});
