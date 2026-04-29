import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { generateId, organizations, users } from './schema';

const jsonObjectDefault = sql`'{}'::jsonb`;

export const notificationMessages = pgTable(
  'notification_messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    topicKey: text('topic_key').notNull(),
    entityId: text('entity_id').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    status: text('status').default('queued').notNull(),
    priority: text('priority').notNull(),
    category: text('category').notNull(),
    organizationId: text('organization_id').references(() => organizations.id),
    containsPhi: boolean('contains_phi').default(false).notNull(),
    requiresAudit: boolean('requires_audit').default(true).notNull(),
    actorId: text('actor_id').references(() => users.id),
    actorName: text('actor_name'),
    source: text('source'),
    templateData: jsonb('template_data')
      .$type<Record<string, unknown>>()
      .default(jsonObjectDefault)
      .notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(jsonObjectDefault)
      .notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'notification_messages_status_check',
      sql`${table.status} in ('queued', 'cancelled', 'completed', 'skipped')`,
    ),
    check(
      'notification_messages_priority_check',
      sql`${table.priority} in ('critical', 'high', 'medium', 'low')`,
    ),
    index('notification_messages_dedupe_created_idx').on(
      table.dedupeKey,
      table.createdAt,
    ),
    index('notification_messages_entity_idx').on(table.topicKey, table.entityId),
    index('notification_messages_org_idx').on(table.organizationId),
    index('notification_messages_scheduled_idx').on(
      table.status,
      table.scheduledFor,
    ),
  ],
);

export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    messageId: text('message_id')
      .notNull()
      .references(() => notificationMessages.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').notNull(),
    userId: text('user_id').references(() => users.id),
    email: text('email'),
    phone: text('phone'),
    displayName: text('display_name').notNull(),
    role: text('role'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('notification_recipients_message_recipient_uidx').on(
      table.messageId,
      table.recipientId,
    ),
    index('notification_recipients_user_id_idx').on(table.userId),
    index('notification_recipients_recipient_id_idx').on(table.recipientId),
  ],
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    messageRecipientId: text('message_recipient_id')
      .notNull()
      .references(() => notificationRecipients.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(),
    status: text('status').default('queued').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    providerResponseCode: text('provider_response_code'),
    taskName: text('task_name'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(jsonObjectDefault)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'notification_deliveries_channel_check',
      sql`${table.channel} in ('email', 'sms', 'in_app')`,
    ),
    check(
      'notification_deliveries_status_check',
      sql`${table.status} in ('queued', 'processing', 'sent', 'delivered', 'retry_scheduled', 'failed', 'bounced', 'cancelled', 'skipped')`,
    ),
    index('notification_deliveries_recipient_idx').on(table.messageRecipientId),
    index('notification_deliveries_provider_message_idx').on(
      table.providerMessageId,
    ),
    index('notification_deliveries_task_name_idx').on(table.taskName),
    index('notification_deliveries_status_scheduled_idx').on(
      table.status,
      table.scheduledFor,
    ),
  ],
);

export const inAppNotifications = pgTable(
  'in_app_notifications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    deliveryId: text('delivery_id')
      .notNull()
      .unique()
      .references(() => notificationDeliveries.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').notNull(),
    actorId: text('actor_id').references(() => users.id),
    actorName: text('actor_name'),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    href: text('href'),
    read: boolean('read').default(false).notNull(),
    priority: text('priority').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(jsonObjectDefault)
      .notNull(),
    source: text('source').default('app').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('in_app_notifications_recipient_created_idx').on(
      table.recipientId,
      table.createdAt,
    ),
    index('in_app_notifications_recipient_read_idx').on(
      table.recipientId,
      table.read,
    ),
  ],
);
