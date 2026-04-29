import { db } from '../../db';
import * as schema from '@workspace/db';
import { eq, and, desc } from 'drizzle-orm';

export class ProtocolsService {
  async getProtocols(organizationId: string) {
    return await db
      .select()
      .from(schema.clinicalProtocols)
      .where(eq(schema.clinicalProtocols.organizationId, organizationId))
      .orderBy(desc(schema.clinicalProtocols.createdAt));
  }

  async createProtocol(organizationId: string, body: any) {
    const [protocol] = await db
      .insert(schema.clinicalProtocols)
      .values({
        ...body,
        organizationId,
        updatedAt: new Date(),
      })
      .returning();
    
    return protocol;
  }
}
