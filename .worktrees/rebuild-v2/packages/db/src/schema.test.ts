import { expect, test, describe } from 'bun:test';
import * as schema from './schema.js';

describe('Database Schema', () => {
  test('should export core tables', () => {
    expect(schema.users).toBeDefined();
    expect(schema.roles).toBeDefined();
    expect(schema.organizations).toBeDefined();
    expect(schema.patients).toBeDefined();
    expect(schema.providers).toBeDefined();
    expect(schema.appointments).toBeDefined();
  });

  test('should include auth profile contact links for notifications', () => {
    expect(schema.users.phone).toBeDefined();
    expect(schema.users.phoneVerified).toBeDefined();
    expect(schema.users.phoneVerification).toBeDefined();
    expect(schema.users.tokenVersion).toBeDefined();
    expect(schema.users.tokenVersionUpdatedAt).toBeDefined();
    expect(schema.users.disabled).toBeDefined();
    expect(schema.users.mustChangePassword).toBeDefined();
    expect(schema.users.passwordChangedAt).toBeDefined();
    expect(schema.users.adminCreatedById).toBeDefined();
    expect(schema.users.twoFactorEnabled).toBeDefined();
    expect(schema.users.failedLoginAttempts).toBeDefined();
    expect(schema.users.lockedUntil).toBeDefined();
    expect(schema.users.lastFailedLoginAt).toBeDefined();
    expect(schema.patients.userId).toBeDefined();
    expect(schema.patients.phoneVerified).toBeDefined();
    expect(schema.patients.phoneVerification).toBeDefined();
    expect(schema.providers.userId).toBeDefined();
  });

  test('should include audit log table with new columns', () => {
    expect(schema.auditLogs).toBeDefined();
    expect(schema.auditLogs.summary).toBeDefined();
    expect(schema.auditLogs.actorRole).toBeDefined();
    expect(schema.auditLogs.organizationId).toBeDefined();
    expect(schema.auditLogs.details).toBeDefined();
    expect(schema.auditLogs.previousHash).toBeDefined();
    expect(schema.auditLogs.hash).toBeDefined();
    expect(schema.auditLogs.hashAlgorithm).toBeDefined();
    expect(schema.auditLogs.exportStatus).toBeDefined();
    expect(schema.auditLogs.exportedAt).toBeDefined();
    expect(schema.auditLogs.externalSinkId).toBeDefined();
  });

  test('should include break glass emergency access grants', () => {
    expect(schema.breakGlassAccessGrants).toBeDefined();
    expect(schema.breakGlassAccessGrants.userId).toBeDefined();
    expect(schema.breakGlassAccessGrants.reason).toBeDefined();
    expect(schema.breakGlassAccessGrants.compensatingControl).toBeDefined();
    expect(schema.breakGlassAccessGrants.scopes).toBeDefined();
    expect(schema.breakGlassAccessGrants.expiresAt).toBeDefined();
  });

  test('should include delegated on-behalf-of access sessions', () => {
    expect(schema.delegatedAccessSessions).toBeDefined();
    expect(schema.delegatedAccessSessions.actorUserId).toBeDefined();
    expect(schema.delegatedAccessSessions.targetUserId).toBeDefined();
    expect(schema.delegatedAccessSessions.targetPatientId).toBeDefined();
    expect(schema.delegatedAccessSessions.targetProviderId).toBeDefined();
    expect(schema.delegatedAccessSessions.scopes).toBeDefined();
    expect(schema.delegatedAccessSessions.expiresAt).toBeDefined();
  });

  test('should include admin password reset approval workflow', () => {
    expect(schema.adminPasswordResetRequests).toBeDefined();
    expect(schema.adminPasswordResetRequests.userId).toBeDefined();
    expect(schema.adminPasswordResetRequests.organizationId).toBeDefined();
    expect(schema.adminPasswordResetRequests.requestedEmail).toBeDefined();
    expect(schema.adminPasswordResetRequests.requestedIpAddress).toBeDefined();
    expect(schema.adminPasswordResetRequests.requestedUserAgent).toBeDefined();
    expect(schema.adminPasswordResetRequests.status).toBeDefined();
    expect(schema.adminPasswordResetRequests.approvedById).toBeDefined();
    expect(schema.adminPasswordResetRequests.approvedAt).toBeDefined();
    expect(schema.adminPasswordResetRequests.rejectedById).toBeDefined();
    expect(schema.adminPasswordResetRequests.rejectedAt).toBeDefined();
    expect(schema.adminPasswordResetRequests.deliveredAt).toBeDefined();
  });

  test('should include encryption metadata tables and message ciphertext columns', () => {
    expect(schema.messages.encryptionMode).toBeDefined();
    expect(schema.messages.encryptedPayload).toBeDefined();
    expect(schema.messages.encryptedKeyRecipients).toBeDefined();
    expect(schema.encryptionKeyRegistry).toBeDefined();
    expect(schema.encryptionKeyRegistry.keyId).toBeDefined();
    expect(schema.encryptionKeyRegistry.provider).toBeDefined();
    expect(schema.encryptionKeyRegistry.purpose).toBeDefined();
    expect(schema.encryptedDocumentUploads).toBeDefined();
    expect(schema.encryptedDocumentUploads.storageProvider).toBeDefined();
    expect(schema.encryptedDocumentUploads.storageObjectKey).toBeDefined();
    expect(schema.encryptedDocumentUploads.encryptedPayload).toBeDefined();
    expect(
      schema.encryptedDocumentUploads.encryptedKeyRecipients,
    ).toBeDefined();
  });

  test('should include audit trigger sql', () => {
    expect(schema.auditTriggerSQL).toBeDefined();
    const sqlString = JSON.stringify(schema.auditTriggerSQL).toLowerCase();
    expect(sqlString).toContain('create or replace function audit_log_trigger');
    expect(sqlString).toContain('sha256');
    expect(sqlString).toContain('after insert');
  });
});
