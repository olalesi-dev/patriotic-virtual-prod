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

  test('should include audit log table with new columns', () => {
    expect(schema.auditLogs).toBeDefined();
    expect(schema.auditLogs.summary).toBeDefined();
    expect(schema.auditLogs.actorRole).toBeDefined();
    expect(schema.auditLogs.organizationId).toBeDefined();
    expect(schema.auditLogs.details).toBeDefined();
  });

  test('should include audit trigger sql', () => {
    expect(schema.auditTriggerSQL).toBeDefined();
    const sqlString = JSON.stringify(schema.auditTriggerSQL).toLowerCase();
    expect(sqlString).toContain('create or replace function audit_log_trigger');
    expect(sqlString).toContain('sha256');
    expect(sqlString).toContain('after insert');
  });
});
