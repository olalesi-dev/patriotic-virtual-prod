import { db } from '../../db';
import * as schema from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class AiQueueService {
  async getQueue(organizationId: string) {
    return await db
      .select({
        id: schema.aiActionItems.id,
        type: schema.aiActionItems.type,
        patientName: sql<string>`concat(${schema.patients.firstName}, ' ', ${schema.patients.lastName})`,
        suggestion: schema.aiActionItems.suggestion,
        status: schema.aiActionItems.status,
        group: schema.aiActionItems.group,
        priority: schema.aiActionItems.priority,
        createdAt: schema.aiActionItems.createdAt,
      })
      .from(schema.aiActionItems)
      .innerJoin(schema.patients, eq(schema.aiActionItems.patientId, schema.patients.id))
      .where(eq(schema.aiActionItems.organizationId, organizationId))
      .orderBy(desc(schema.aiActionItems.createdAt));
  }

  async resolveItem(id: string, organizationId: string) {
    const [updated] = await db
      .update(schema.aiActionItems)
      .set({
        status: 'Resolved',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.aiActionItems.id, id),
          eq(schema.aiActionItems.organizationId, organizationId)
        )
      )
      .returning();
    
    return updated;
  }
}

import { sql } from 'drizzle-orm';
