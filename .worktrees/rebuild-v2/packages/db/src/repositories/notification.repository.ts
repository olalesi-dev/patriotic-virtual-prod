import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../index';
import type { Db } from '../index';

export const notificationRepository = (db: Db) => ({
  async createMessage(values: typeof schema.notificationMessages.$inferInsert) {
    const [message] = await db
      .insert(schema.notificationMessages)
      .values(values)
      .returning();
    return message;
  },

  async addRecipient(values: typeof schema.notificationRecipients.$inferInsert) {
    const [recipient] = await db
      .insert(schema.notificationRecipients)
      .values(values)
      .returning();
    return recipient;
  },

  async createDelivery(values: typeof schema.notificationDeliveries.$inferInsert) {
    const [delivery] = await db
      .insert(schema.notificationDeliveries)
      .values(values)
      .returning();
    return delivery;
  },

  async updateDelivery(
    id: string,
    values: Partial<typeof schema.notificationDeliveries.$inferInsert>,
  ) {
    const [delivery] = await db
      .update(schema.notificationDeliveries)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.notificationDeliveries.id, id))
      .returning();
    return delivery;
  },

  async findDeliveryByProviderId(provider: string, providerMessageId: string) {
    const [delivery] = await db
      .select()
      .from(schema.notificationDeliveries)
      .where(
        and(
          eq(schema.notificationDeliveries.provider, provider),
          eq(schema.notificationDeliveries.providerMessageId, providerMessageId),
        ),
      )
      .limit(1);
    return delivery;
  },

  async logEvent(values: typeof schema.notificationEvents.$inferInsert) {
    const [event] = await db
      .insert(schema.notificationEvents)
      .values(values)
      .returning();
    return event;
  },

  async getRecentDedupeKey(dedupeKey: string, topicKey: string) {
    const [message] = await db
      .select()
      .from(schema.notificationMessages)
      .where(
        and(
          eq(schema.notificationMessages.dedupeKey, dedupeKey),
          eq(schema.notificationMessages.topicKey, topicKey),
        ),
      )
      .orderBy(desc(schema.notificationMessages.createdAt))
      .limit(1);
    return message;
  },

  async getUserPreferences(userId: string) {
    return await db
      .select()
      .from(schema.userNotificationPreferences)
      .where(eq(schema.userNotificationPreferences.userId, userId));
  },

  async upsertUserPreferences(
    userId: string,
    category: string,
    values: Partial<typeof schema.userNotificationPreferences.$inferInsert>,
  ) {
    const [existing] = await db
      .select()
      .from(schema.userNotificationPreferences)
      .where(
        and(
          eq(schema.userNotificationPreferences.userId, userId),
          eq(schema.userNotificationPreferences.category, category),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(schema.userNotificationPreferences)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.userNotificationPreferences.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(schema.userNotificationPreferences)
      .values({
        ...values,
        userId,
        category,
      } as typeof schema.userNotificationPreferences.$inferInsert)
      .returning();
    return inserted;
  },

  async getPushTokens(userId: string) {
    return await db
      .select()
      .from(schema.userPushTokens)
      .where(
        and(
          eq(schema.userPushTokens.userId, userId),
          eq(schema.userPushTokens.isActive, true),
        ),
      );
  },

  async deactivatePushToken(provider: string, token: string) {
    await db
      .update(schema.userPushTokens)
      .set({
        isActive: false,
        invalidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userPushTokens.provider, provider),
          eq(schema.userPushTokens.token, token),
        ),
      );
  },

  async findUsersByRoles(roleNames: string[]) {
    return await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        phone: schema.users.phone,
      })
      .from(schema.users)
      .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
      .where(sql`${schema.roles.name} IN (${sql.join(roleNames, sql`, `)})`);
  },

  async findUserByEmail(email: string) {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return user;
  },

  async findEventByProviderEventId(provider: string, providerEventId: string) {
    const [event] = await db
      .select()
      .from(schema.notificationEvents)
      .where(
        and(
          eq(schema.notificationEvents.provider, provider),
          eq(schema.notificationEvents.providerEventId, providerEventId),
        ),
      )
      .limit(1);
    return event;
  },

  async findDeliveryById(id: string) {
    const [delivery] = await db
      .select()
      .from(schema.notificationDeliveries)
      .where(eq(schema.notificationDeliveries.id, id))
      .limit(1);
    return delivery;
  },
});
