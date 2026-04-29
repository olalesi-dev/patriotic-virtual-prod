import { describe, expect, it, spyOn, mock, afterEach } from 'bun:test';
import { ClinicalAnalyticsService } from './clinical-analytics.service';
import { db } from '../../db';

describe('ClinicalAnalyticsService', () => {
  const service = new ClinicalAnalyticsService();

  afterEach(() => {
    mock.restore();
  });

  it('getSummaryStats should return clinical metrics', async () => {
    // Robust mock for Drizzle's chaining and awaiting
    const createMockBuilder = (val: any) => {
      const builder: any = mock(() => Promise.resolve(val));
      builder.from = mock(() => builder);
      builder.innerJoin = mock(() => builder);
      builder.where = mock(() => builder);
      // Make the builder thenable so it can be awaited at any point
      builder.then = (onFullfilled: any) => Promise.resolve(val).then(onFullfilled);
      return builder;
    };

    const spy = spyOn(db, 'select');
    
    spy.mockImplementationOnce(() => createMockBuilder([{ count: 47 }]));
    spy.mockImplementationOnce(() => createMockBuilder([{ count: 10 }]));
    spy.mockImplementationOnce(() => createMockBuilder([{ count: 12 }]));

    const stats = await service.getSummaryStats('org-1');
    expect(stats.activePatients).toBe('47');
    expect(stats.labCompliance).toBe('83%');
  });

  it('getWeightLossTrend should return array of data points', async () => {
    const trend = await service.getWeightLossTrend('org-1');
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBeGreaterThan(0);
  });
});
