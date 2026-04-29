import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { env } from '@workspace/env/index';

export class GoogleAnalyticsService {
  private client: BetaAnalyticsDataClient | null = null;

  constructor() {
    if (env.GA_PROPERTY_ID) {
      this.client = new BetaAnalyticsDataClient();
    }
  }

  async getTrafficReport() {
    if (!this.client || !env.GA_PROPERTY_ID) {
      throw new Error('Google Analytics is not configured.');
    }

    const [response] = await this.client.runReport({
      property: `properties/${env.GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'sessionSourceMedium' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    });

    return (
      response.rows?.map((row) => ({
        date: row.dimensionValues?.[0]?.value,
        source: row.dimensionValues?.[1]?.value,
        users: Number(row.metricValues?.[0]?.value || '0'),
        sessions: Number(row.metricValues?.[1]?.value || '0'),
        views: Number(row.metricValues?.[2]?.value || '0'),
      })) || []
    );
  }
}
