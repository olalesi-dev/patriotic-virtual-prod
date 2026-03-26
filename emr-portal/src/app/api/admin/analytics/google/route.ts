import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function GET() {
    try {
        const propertyId = process.env.GA_PROPERTY_ID;
        if (!propertyId) {
            return NextResponse.json({ success: false, error: 'GA_PROPERTY_ID not configured in environment variables. Please enable Google Analytics Data API and set GA_PROPERTY_ID in the deployment.' }, { status: 400 });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient();

        const [response] = await analyticsDataClient.runReport({
             property: `properties/${propertyId}`,
             dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
             dimensions: [{ name: 'date' }, {name: 'sessionSourceMedium'}],
             metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
         });

        const data = response.rows?.map(row => ({
             date: row.dimensionValues?.[0]?.value,
             source: row.dimensionValues?.[1]?.value,
             users: parseInt(row.metricValues?.[0]?.value || '0'),
             sessions: parseInt(row.metricValues?.[1]?.value || '0'),
             views: parseInt(row.metricValues?.[2]?.value || '0'),
        })) || [];

        return NextResponse.json({ success: true, data });
    } catch(e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
