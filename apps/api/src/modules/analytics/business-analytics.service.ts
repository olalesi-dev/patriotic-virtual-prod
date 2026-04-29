import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

export class BusinessAnalyticsService {
  async getSummaryStats(organizationId: string) {
    const [mrrResult] = await db
      .select({ total: sql<number>`sum(mrr)` })
      .from(schema.subscriptions)
      .innerJoin(
        schema.patients,
        eq(schema.subscriptions.patientId, schema.patients.id),
      )
      .where(
        and(
          eq(schema.patients.organizationId, organizationId),
          eq(schema.subscriptions.status, 'active'),
        ),
      );

    const [activePatientsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.patients)
      .where(eq(schema.patients.organizationId, organizationId));

    const [churnCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.subscriptions)
      .innerJoin(
        schema.patients,
        eq(schema.subscriptions.patientId, schema.patients.id),
      )
      .where(
        and(
          eq(schema.patients.organizationId, organizationId),
          eq(schema.subscriptions.status, 'canceled'),
          gte(schema.subscriptions.updatedAt, sql`now() - interval '30 days'`),
        ),
      );

    const mrr = Number(mrrResult?.total || 0);
    const patients = Number(activePatientsCount?.count || 0);
    const avgRevPerPatient = patients > 0 ? Math.round(mrr / patients) : 0;
    const churnRate =
      patients > 0 ? (Number(churnCount?.count || 0) / patients) * 100 : 0;

    return {
      mrr: `$${(mrr / 100).toLocaleString()}`,
      avgRevPerPatient: `$${(avgRevPerPatient / 100).toLocaleString()}`,
      churnRate: `${churnRate.toFixed(1)}%`,
      patientLtv: `$${(avgRevPerPatient > 0 ? Math.round((avgRevPerPatient / 100) / 0.06) : 0).toLocaleString()}`, // Placeholder logic: LTV = ARPU / Churn
    };
  }

  async getRevenueTrend(organizationId: string) {
    // Simplified: return MRR for last 6 months
    // In a real app, this would be a historical snapshots table
    return [
      { month: 'Last Month', mrr: 15000 },
      { month: 'This Month', mrr: 18800 },
    ];
  }

  async getAcquisitionChannels(organizationId: string) {
    const result = await db
      .select({
        name: schema.patients.acquisitionSource,
        patients: sql<number>`count(*)`,
      })
      .from(schema.patients)
      .where(eq(schema.patients.organizationId, organizationId))
      .groupBy(schema.patients.acquisitionSource);

    return result.map((r) => ({
      name: r.name || 'Unknown',
      patients: Number(r.patients),
    }));
  }
}
