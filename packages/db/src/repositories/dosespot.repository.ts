import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../index';
import type { Db } from '../index';

export const dosespotRepository = (db: Db) => ({
  async createWebhookEvent(values: typeof schema.dosespotWebhookEvents.$inferInsert) {
    const [event] = await db
      .insert(schema.dosespotWebhookEvents)
      .values(values)
      .returning();
    return event;
  },

  async findWebhookEventByDedupeKey(dedupeKey: string) {
    const [event] = await db
      .select()
      .from(schema.dosespotWebhookEvents)
      .where(eq(schema.dosespotWebhookEvents.dedupeKey, dedupeKey))
      .limit(1);
    return event;
  },

  async updateWebhookEvent(
    id: string,
    values: Partial<typeof schema.dosespotWebhookEvents.$inferInsert>,
  ) {
    const [event] = await db
      .update(schema.dosespotWebhookEvents)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.dosespotWebhookEvents.id, id))
      .returning();
    return event;
  },

  async upsertPrescription(values: typeof schema.prescriptions.$inferInsert) {
    const [existing] = await db
      .select()
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.doseSpotPrescriptionId, values.doseSpotPrescriptionId!))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.prescriptions)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.prescriptions.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(schema.prescriptions)
      .values(values)
      .returning();
    return inserted;
  },

  async findProviderByDoseSpotId(doseSpotClinicianId: string) {
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.doseSpotClinicianId, doseSpotClinicianId))
      .limit(1);
    return provider;
  },

  async findPatientByDoseSpotId(doseSpotPatientId: string) {
    const [patient] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.doseSpotPatientId, doseSpotPatientId))
      .limit(1);
    return patient;
  },
});
