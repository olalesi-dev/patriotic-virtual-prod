import { describe, expect, test } from 'bun:test';
import {
  vitalLogs,
  labOrders,
  subscriptions,
  systemSettings,
  shopProducts,
  shopOrders,
} from './index';

describe('Analytics Database Schema', () => {
  test('vitalLogs table has correct structure', () => {
    expect(vitalLogs.id).toBeDefined();
    expect(vitalLogs.patientId).toBeDefined();
    expect(vitalLogs.type).toBeDefined();
    expect(vitalLogs.value).toBeDefined();
  });

  test('labOrders table has correct structure', () => {
    expect(labOrders.id).toBeDefined();
    expect(labOrders.patientId).toBeDefined();
    expect(labOrders.status).toBeDefined();
  });

  test('subscriptions table has correct structure', () => {
    expect(subscriptions.id).toBeDefined();
    expect(subscriptions.patientId).toBeDefined();
    expect(subscriptions.mrr).toBeDefined();
    expect(subscriptions.status).toBeDefined();
  });

  test('systemSettings table has correct structure', () => {
    expect(systemSettings.id).toBeDefined();
    expect(systemSettings.key).toBeDefined();
    expect(systemSettings.value).toBeDefined();
    expect(systemSettings.organizationId).toBeDefined();
  });

  test('shop tables have organization isolation', () => {
    expect(shopProducts.organizationId).toBeDefined();
    expect(shopOrders.organizationId).toBeDefined();
  });
});
