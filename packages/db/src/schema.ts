import { createId } from '@paralleldrive/cuid2';
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const generateId = () => createId();

export const roles = pgTable('roles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const modules = pgTable(
  'modules',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    parentId: text('parent_id').references((): any => modules.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('modules_parent_id_idx').on(table.parentId)],
);

export const permissions = pgTable(
  'permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    moduleId: text('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('permissions_module_id_idx').on(table.moduleId)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_uidx').on(
      table.roleId,
      table.permissionId,
    ),
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
);

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    roleId: text('role_id').references(() => roles.id),
    organizationId: text('organization_id').references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('users_role_id_idx').on(table.roleId),
    index('users_organization_id_idx').on(table.organizationId),
  ],
);

export const patients = pgTable(
  'patients',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .unique()
      .references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: text('date_of_birth'), // Format: YYYY-MM-DD
    gender: text('gender'), // Male, Female, Unknown
    email: text('email'),
    address1: text('address1'),
    address2: text('address2'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    phone: text('phone'),
    mrn: text('mrn'),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    isIdentityVerified: boolean('is_identity_verified').default(false).notNull(),
    latestVerificationId: text('latest_verification_id'),
    acquisitionSource: text('acquisition_source'),
    doseSpotPatientId: text('dosespot_patient_id'),
    doseSpotSyncStatus: text('dosespot_sync_status').default('pending').notNull(),
    doseSpotSyncError: text('dosespot_sync_error'),
    doseSpotLastSyncAt: timestamp('dosespot_last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('patients_organization_id_idx').on(table.organizationId),
    index('patients_dosespot_id_idx').on(table.doseSpotPatientId),
  ],
);

export const providers = pgTable(
  'providers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .unique()
      .references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    npi: text('npi').unique(),
    doseSpotClinicianId: text('dosespot_clinician_id'),
    doseSpotData: jsonb('dosespot_data').$type<Record<string, any>>(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('providers_organization_id_idx').on(table.organizationId),
    index('providers_dosespot_id_idx').on(table.doseSpotClinicianId),
  ],
);

export const consultations = pgTable(
  'consultations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id').references(() => patients.id),
    serviceKey: text('service_key').notNull(),
    intakeAnswers: jsonb('intake_answers')
      .$type<Record<string, any>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    status: text('status').default('pending_payment').notNull(),
    paymentStatus: text('payment_status').default('pending').notNull(),
    stripeSessionId: text('stripe_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('consultations_patient_id_idx').on(table.patientId)],
);

export const appointments = pgTable(
  'appointments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    providerId: text('provider_id').references(() => providers.id),
    consultationId: text('consultation_id').references(() => consultations.id),
    type: text('type').default('Telehealth').notNull(),
    status: text('status').default('pending_scheduling').notNull(),
    reason: text('reason'),
    scheduledTime: timestamp('scheduled_time', { withTimezone: true }),
    meetingUrl: text('meeting_url'),
    verificationId: text('verification_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('appointments_patient_id_idx').on(table.patientId),
    index('appointments_provider_id_idx').on(table.providerId),
    index('appointments_consultation_id_idx').on(table.consultationId),
    index('appointments_scheduled_time_idx').on(table.scheduledTime),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    action: text('action').notNull(),
    summary: text('summary').notNull(),
    actorRole: text('actor_role'),
    organizationId: text('organization_id').references(() => organizations.id),
    details: jsonb('details'),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    hash: text('hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_organization_id_idx').on(table.organizationId),
    index('audit_logs_record_idx').on(table.tableName, table.recordId),
  ],
);

export const dosespotWebhookEvents = pgTable(
  'dosespot_webhook_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    dedupeKey: text('dedupe_key').notNull().unique(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').default('pending').notNull(), // pending, processing, success, failed
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('dosespot_webhook_events_status_idx').on(table.status),
    index('dosespot_webhook_events_event_type_idx').on(table.eventType),
  ],
);

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    doseSpotPrescriptionId: integer('dosespot_prescription_id').unique(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    medicationName: text('medication_name').notNull(),
    dosage: text('dosage'),
    quantity: text('quantity'),
    refills: integer('refills').default(0).notNull(),
    status: text('status').default('Pending').notNull(),
    lastStatusUpdate: timestamp('last_status_update', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('prescriptions_patient_id_idx').on(table.patientId),
    index('prescriptions_provider_id_idx').on(table.providerId),
    index('prescriptions_dosespot_id_idx').on(table.doseSpotPrescriptionId),
  ],
);

export const soapNotes = pgTable(
  'soap_notes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    appointmentId: text('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    subjective: text('subjective'),
    objective: text('objective'),
    assessment: text('assessment'),
    plan: text('plan'),
    isLocked: boolean('is_locked').default(false).notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: text('locked_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('soap_notes_appointment_id_idx').on(table.appointmentId),
    index('soap_notes_patient_id_idx').on(table.patientId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => users.id),
    subject: text('subject'),
    body: text('body').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    threadId: text('thread_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('messages_sender_id_idx').on(table.senderId),
    index('messages_recipient_id_idx').on(table.recipientId),
    index('messages_thread_id_idx').on(table.threadId),
  ],
);

export const systemSettings = pgTable('system_settings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  uniqueIndex('system_settings_org_key_uidx').on(table.organizationId, table.key),
]);

export const shopProducts = pgTable(
  'shop_products',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').notNull().unique(),
    shortDescription: text('short_description'),
    longDescription: text('long_description'),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    inventoryLevel: integer('inventory_level').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
    images: jsonb('images').$type<string[]>().default(sql`'[]'::jsonb`),
    status: text('status').default('Draft').notNull(),
    category: text('category').notNull(),
    stripeLink: text('stripe_link'),
    iframeUrl: text('iframe_url'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('shop_products_status_idx').on(table.status),
    index('shop_products_category_idx').on(table.category),
    index('shop_products_organization_id_idx').on(table.organizationId),
  ],
);

export const shopOrders = pgTable(
  'shop_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    orderNumber: text('order_number').notNull().unique(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    total: integer('total').notNull(),
    paymentStatus: text('payment_status').notNull(),
    fulfillmentStatus: text('fulfillment_status').default('Pending').notNull(),
    stripeSessionId: text('stripe_session_id'),
    shippingAddress: jsonb('shipping_address'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('shop_orders_patient_id_idx').on(table.patientId),
    index('shop_orders_status_idx').on(table.fulfillmentStatus),
    index('shop_orders_organization_id_idx').on(table.organizationId),
  ],
);

export const shopOrderItems = pgTable('shop_order_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  orderId: text('order_id')
    .notNull()
    .references(() => shopOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => shopProducts.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
});

export const shopPartners = pgTable('shop_partners', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  category: text('category').notNull(),
  logo: text('logo'),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  affiliateUrl: text('affiliate_url'),
  status: text('status').default('Active').notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index('shop_partners_organization_id_idx').on(table.organizationId),
]);

export const shopDiscounts = pgTable('shop_discounts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  code: text('code').notNull().unique(),
  type: text('type').notNull(),
  value: integer('value').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const broadcastLogs = pgTable('broadcast_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  priority: text('priority').notNull(),
  targetFilters: jsonb('target_filters').notNull(),
  recipientCount: integer('recipient_count').notNull(),
  senderId: text('sender_id')
    .notNull()
    .references(() => users.id),
  timestamp: timestamp('timestamp', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index('broadcast_logs_organization_id_idx').on(table.organizationId),
]);

export const moderationLogs = pgTable('moderation_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  documentId: text('document_id').notNull(),
  collectionName: text('collection_name').notNull(),
  content: text('content').notNull(),
  authorName: text('author_name').notNull(),
  authorId: text('author_id').notNull(),
  aiRiskLevel: text('ai_risk_level').notNull(),
  category: text('category'),
  reason: text('reason'),
  actionTaken: text('action_taken'),
  resolved: boolean('resolved').default(false).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index('moderation_logs_organization_id_idx').on(table.organizationId),
]);

export const userSettings = pgTable('user_settings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  uniqueIndex('user_settings_user_key_uidx').on(table.userId, table.key),
]);

export const aiActionItems = pgTable(
  'ai_action_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    type: text('type').notNull(), // e.g. Lab Insight, Protocol Match
    suggestion: text('suggestion').notNull(),
    status: text('status').default('Pending Review').notNull(),
    group: text('group'), // e.g. Titration, Chronic Care
    priority: text('priority').default('medium').notNull(), // low, medium, high
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('ai_action_items_org_idx').on(table.organizationId),
    index('ai_action_items_status_idx').on(table.status),
  ],
);

export const clinicalProtocols = pgTable(
  'clinical_protocols',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    type: text('type').notNull(), // Clinical, Legal, Admin, Orders
    content: text('content'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('clinical_protocols_org_idx').on(table.organizationId)],
);

export const services = pgTable(
  'services',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    category: text('category').notNull(),
    status: text('status').default('Active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('services_org_idx').on(table.organizationId),
    index('services_category_idx').on(table.category),
  ],
);

export const imagingOrders = pgTable(
  'imaging_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    type: text('type').notNull(),
    status: text('status').default('Ordered').notNull(),
    notes: text('notes'),
    orderedAt: timestamp('ordered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('imaging_orders_patient_idx').on(table.patientId),
    index('imaging_orders_org_idx').on(table.organizationId),
  ],
);

export const socialPosts = pgTable(
  'social_posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    text: text('text').notNull(),
    status: text('status').default('draft').notNull(),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id),
    platforms: jsonb('platforms').$type<string[]>().default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('social_posts_org_idx').on(table.organizationId)],
);

export const facilities = pgTable(
  'facilities',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zipCode: text('zip_code'),
    phone: text('phone'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('facilities_org_idx').on(table.organizationId)],
);

export const vendors = pgTable(
  'vendors',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    email: text('email'),
    phone: text('phone'),
    category: text('category'),
    contractEndDate: timestamp('contract_end_date', { withTimezone: true }),
    status: text('status').default('Active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('vendors_org_idx').on(table.organizationId)],
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    status: text('status').default('Planning').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    budget: integer('budget'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('campaigns_org_idx').on(table.organizationId)],
);

export const grantProposals = pgTable(
  'grant_proposals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    agency: text('agency').notNull(),
    amount: integer('amount'),
    status: text('status').default('Draft').notNull(),
    deadline: timestamp('deadline', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('grant_proposals_org_idx').on(table.organizationId)],
);

export const timeSheets = pgTable(
  'time_sheets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    date: timestamp('date', { withTimezone: true }).notNull(),
    hours: integer('hours').notNull(),
    description: text('description'),
    status: text('status').default('Submitted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('time_sheets_user_idx').on(table.userId),
    index('time_sheets_org_idx').on(table.organizationId),
  ],
);

export const complianceDocuments = pgTable(
  'compliance_documents',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    category: text('category').notNull(),
    status: text('status').default('Draft').notNull(),
    effectiveDate: timestamp('effective_date', { withTimezone: true }),
    expirationDate: timestamp('expiration_date', { withTimezone: true }),
    version: text('version'),
    parties: jsonb('parties').$type<string[]>().default(sql`'[]'::jsonb`),
    summary: text('summary'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('compliance_documents_org_idx').on(table.organizationId),
    index('compliance_documents_category_idx').on(table.category),
  ],
);


export const vitalLogs = pgTable(
  'vital_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    value: text('value').notNull(),
    unit: text('unit'),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('vital_logs_patient_type_idx').on(table.patientId, table.type),
  ],
);

export const labOrders = pgTable(
  'lab_orders',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    testName: text('test_name').notNull(),
    status: text('status').default('Ordered').notNull(),
    orderedAt: timestamp('ordered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('lab_orders_patient_id_idx').on(table.patientId),
    index('lab_orders_status_idx').on(table.status),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    planId: text('plan_id').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    mrr: integer('mrr').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('subscriptions_patient_id_idx').on(table.patientId),
    index('subscriptions_status_idx').on(table.status),
  ],
);

export const auditTriggerSQL = sql`
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  old_data_json JSONB := NULL;
  new_data_json JSONB := NULL;
  record_id TEXT;
  hash_val TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    old_data_json = row_to_json(OLD)::JSONB;
    record_id = OLD.id;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data_json = row_to_json(OLD)::JSONB;
    new_data_json = row_to_json(NEW)::JSONB;
    record_id = NEW.id;
  ELSIF (TG_OP = 'INSERT') THEN
    new_data_json = row_to_json(NEW)::JSONB;
    record_id = NEW.id;
  END IF;

  hash_val = encode(digest(COALESCE(old_data_json::TEXT, '') || COALESCE(new_data_json::TEXT, ''), 'sha256'), 'hex');

  INSERT INTO audit_logs (id, table_name, record_id, action, old_data, new_data, hash)
  VALUES (substr(md5(random()::text), 1, 24), TG_TABLE_NAME, record_id, TG_OP, old_data_json, new_data_json, hash_val);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_audit_trigger
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
`;
