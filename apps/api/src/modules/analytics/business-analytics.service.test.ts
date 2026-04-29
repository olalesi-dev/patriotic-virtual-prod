import { describe, expect, it, spyOn, mock, afterEach } from 'bun:test';
import { BusinessAnalyticsService } from './business-analytics.service';
import { db } from '../../db';

describe('BusinessAnalyticsService', () => {
  const service = new BusinessAnalyticsService();

  afterEach(() => {
    mock.restore();
  });

  it('getSummaryStats should return business metrics', async () => {
    const createMockBuilder = (val: any) => {
      const builder: any = mock(() => Promise.resolve(val));
      builder.from = mock(() => builder);
      builder.innerJoin = mock(() => builder);
      builder.where = mock(() => builder);
      builder.then = (onFullfilled: any) => Promise.resolve(val).then(onFullfilled);
      return builder;
    };

    const spy = spyOn(db, 'select');
    
    spy.mockImplementationOnce(() => createMockBuilder([{ total: 1880000 }]));
    spy.mockImplementationOnce(() => createMockBuilder([{ count: 47 }]));
    spy.mockImplementationOnce(() => createMockBuilder([{ count: 3 }]));

    const stats = await service.getSummaryStats('org-1');
    expect(stats.mrr).toBe('$18,800');
    expect(stats.churnRate).toBe('6.4%');
  });

  it('getAcquisitionChannels should return grouped results', async () => {
    const createMockBuilder = (val: any) => {
      const builder: any = mock(() => Promise.resolve(val));
      builder.from = mock(() => builder);
      builder.where = mock(() => builder);
      builder.groupBy = mock(() => builder);
      builder.then = (onFullfilled: any) => Promise.resolve(val).then(onFullfilled);
      return builder;
    };

    spyOn(db, 'select').mockImplementationOnce(() => createMockBuilder([
      { name: 'Instagram', patients: 145 },
      { name: 'Google Ads', patients: 98 }
    ]));

    const channels = await service.getAcquisitionChannels('org-1');
    expect(channels.length).toBe(2);
    expect(channels[0].name).toBe('Instagram');
  });
});
