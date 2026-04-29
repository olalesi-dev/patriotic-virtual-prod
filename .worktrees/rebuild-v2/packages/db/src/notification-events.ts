import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { notificationDeliveries } from './notifications';
import { generateId, users } from './schema';

const jsonObjectDefault = sql`'{}'::jsonb`;

export const notificationEvents = pgTable(
  'notification_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    deliveryId: text('delivery_id').references(() => notificationDeliveries.id, {
      onDelete: 'set null',
    }),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    providerMessageId: text('provider_message_id'),
    providerRecipientEmail: text('provider_recipient_email'),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .default(jsonObjectDefault)
      .notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('notification_events_provider_event_uidx').on(
      table.provider,
      table.providerEventId,
    ),
    index('notification_events_delivery_id_idx').on(table.deliveryId),
    index('notification_events_provider_message_idx').on(
      table.providerMessageId,
    ),
    index('notification_events_recipient_email_idx').on(
      table.providerRecipientEmail,
    ),
    index('notification_events_occurred_at_idx').on(table.occurredAt),
  ],
);

export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    emailEnabled: boolean('email_enabled').default(false).notNull(),
    smsEnabled: boolean('sms_enabled').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_notification_preferences_user_category_uidx').on(
      table.userId,
      table.category,
    ),
    index('user_notification_preferences_user_id_idx').on(table.userId),
  ],
);

export const userPushTokens = pgTable(
  'user_push_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').default('fcm').notNull(),
    token: text('token').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_push_tokens_provider_token_uidx').on(
      table.provider,
      table.token,
    ),
    index('user_push_tokens_user_active_idx').on(table.userId, table.isActive),
  ],
);
