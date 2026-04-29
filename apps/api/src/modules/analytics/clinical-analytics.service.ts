import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

export class ClinicalAnalyticsService {
  async getSummaryStats(organizationId: string) {
    const [activePatientsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.patients)
      .where(eq(schema.patients.organizationId, organizationId));

    // Lab compliance: completed labs / total labs
    const [completedLabs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.labOrders)
      .where(
        and(
          eq(schema.labOrders.status, 'Completed'),
          // Filter by org via join if needed
        ),
      );

    const [totalLabs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.labOrders);

    const compliance =
      Number(totalLabs?.count || 0) > 0
        ? (Number(completedLabs?.count || 0) / Number(totalLabs.count)) * 100
        : 100;

    return {
      activePatients: Number(activePatientsCount?.count || 0).toString(),
      avgWeightLoss: '8.2%', // Placeholder for complex calc
      labCompliance: `${Math.round(compliance)}%`,
      titrationOnSchedule: '74%', // Placeholder
    };
  }

  async getWeightLossTrend(organizationId: string) {
    // Placeholder trend data
    return [
      { month: 'Month 1', avgLoss: 2.1 },
      { month: 'Month 2', avgLoss: 4.5 },
      { month: 'Month 3', avgLoss: 6.8 },
      { month: 'Month 4', avgLoss: 8.2 },
    ];
  }

  async getOverdueLabs(organizationId: string) {
    return await db
      .select({
        name: sql<string>`concat(${schema.patients.firstName}, ' ', ${schema.patients.lastName})`,
        mrn: schema.patients.mrn,
        status: schema.labOrders.status,
        orderedAt: schema.labOrders.orderedAt,
      })
      .from(schema.labOrders)
      .innerJoin(schema.patients, eq(schema.labOrders.patientId, schema.patients.id))
      .where(
        and(
          eq(schema.patients.organizationId, organizationId),
          eq(schema.labOrders.status, 'Overdue'),
        ),
      )
      .limit(5);
  }
}
