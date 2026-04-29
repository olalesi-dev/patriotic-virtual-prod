import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@workspace/env/index';
import * as schema from './schema';
import * as identitySchema from './identity-verifications';
import * as notificationSchema from './notifications';
import * as notificationEventSchema from './notification-events';

export const seedDatabase = async () => {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('Connecting to database...');
  const connection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection, {
    schema: {
      ...schema,
      ...identitySchema,
      ...notificationSchema,
      ...notificationEventSchema,
    },
  });

  try {
    console.log('Clearing existing data...');
    await db.delete(schema.rolePermissions);
    await db.delete(schema.permissions);
    await db.delete(schema.modules);
    await db.delete(schema.messages);
    await db.delete(schema.soapNotes);
    await db.delete(schema.vitalLogs);
    await db.delete(schema.labOrders);
    await db.delete(schema.subscriptions);
    await db.delete(notificationEventSchema.notificationEvents);
    await db.delete(notificationSchema.inAppNotifications);
    await db.delete(notificationSchema.notificationDeliveries);
    await db.delete(notificationSchema.notificationRecipients);
    await db.delete(notificationSchema.notificationMessages);
    await db.delete(notificationEventSchema.userPushTokens);
    await db.delete(notificationEventSchema.userNotificationPreferences);
    await db.delete(identitySchema.identityVerifications);
    await db.delete(schema.auditLogs);
    await db.delete(schema.appointments);
    await db.delete(schema.users);
    await db.delete(schema.providers);
    await db.delete(schema.patients);
    await db.delete(schema.roles);
    await db.delete(schema.organizations);

    console.log('Seeding default organization...');
    const [defaultOrg] = await db
      .insert(schema.organizations)
      .values({
        id: 'default-org-id',
        name: 'Default Organization',
      })
      .onConflictDoUpdate({
        target: [schema.organizations.id],
        set: { name: 'Default Organization' },
      })
      .returning();

    console.log('Seeding modules and permissions...');
    const modulesToInsert = [
      { name: 'Dashboard', key: 'dashboard', sortOrder: 1 },
      { name: 'Patients', key: 'patients', sortOrder: 2 },
      { name: 'Appointments', key: 'appointments', sortOrder: 3 },
      { name: 'Billing', key: 'billing', sortOrder: 4 },
      { name: 'Admin Center', key: 'admin_center', sortOrder: 5 },
      { name: 'E-Prescribing', key: 'eprescribing', sortOrder: 6 },
      { name: 'Analytics', key: 'analytics', sortOrder: 7 },
    ];

    const insertedModules = await db
      .insert(schema.modules)
      .values(modulesToInsert)
      .returning();

    const adminCenterModule = insertedModules.find(
      (m) => m.key === 'admin_center',
    )!;

    const analyticsModule = insertedModules.find((m) => m.key === 'analytics')!;

    const subModulesToInsert = [
      {
        name: 'Users',
        key: 'admin:users',
        parentId: adminCenterModule.id,
        sortOrder: 1,
      },
      {
        name: 'Roles & Permissions',
        key: 'admin:roles',
        parentId: adminCenterModule.id,
        sortOrder: 2,
      },
      {
        name: 'Clinical Dashboard',
        key: 'analytics:clinical',
        parentId: analyticsModule.id,
        sortOrder: 1,
      },
      {
        name: 'Business Dashboard',
        key: 'analytics:business',
        parentId: analyticsModule.id,
        sortOrder: 2,
      },
      {
        name: 'Google Analytics',
        key: 'analytics:google',
        parentId: analyticsModule.id,
        sortOrder: 3,
      },
    ];

    const insertedSubModules = await db
      .insert(schema.modules)
      .values(subModulesToInsert)
      .returning();

    const allModules = [...insertedModules, ...insertedSubModules];

    const permissionsToInsert = [
      {
        name: 'View Dashboard',
        key: 'dashboard:read',
        moduleId: allModules.find((m) => m.key === 'dashboard')!.id,
      },
      {
        name: 'View Patients',
        key: 'patients:read',
        moduleId: allModules.find((m) => m.key === 'patients')!.id,
      },
      {
        name: 'Manage Patients',
        key: 'patients:write',
        moduleId: allModules.find((m) => m.key === 'patients')!.id,
      },
      {
        name: 'View Appointments',
        key: 'appointments:read',
        moduleId: allModules.find((m) => m.key === 'appointments')!.id,
      },
      {
        name: 'Manage Appointments',
        key: 'appointments:write',
        moduleId: allModules.find((m) => m.key === 'appointments')!.id,
      },
      {
        name: 'View Billing',
        key: 'billing:read',
        moduleId: allModules.find((m) => m.key === 'billing')!.id,
      },
      {
        name: 'View Users',
        key: 'admin:users:read',
        moduleId: allModules.find((m) => m.key === 'admin:users')!.id,
      },
      {
        name: 'Manage Users',
        key: 'admin:users:write',
        moduleId: allModules.find((m) => m.key === 'admin:users')!.id,
      },
      {
        name: 'View Roles',
        key: 'admin:roles:read',
        moduleId: allModules.find((m) => m.key === 'admin:roles')!.id,
      },
      {
        name: 'Launch DoseSpot',
        key: 'dosespot:sso',
        moduleId: allModules.find((m) => m.key === 'eprescribing')!.id,
      },
      {
        name: 'Sync DoseSpot Patients',
        key: 'dosespot:patients:sync',
        moduleId: allModules.find((m) => m.key === 'eprescribing')!.id,
      },
      {
        name: 'View Clinical Analytics',
        key: 'analytics:clinical:read',
        moduleId: allModules.find((m) => m.key === 'analytics:clinical')!.id,
      },
      {
        name: 'View Business Analytics',
        key: 'analytics:business:read',
        moduleId: allModules.find((m) => m.key === 'analytics:business')!.id,
      },
      {
        name: 'View Google Analytics',
        key: 'analytics:google:read',
        moduleId: allModules.find((m) => m.key === 'analytics:google')!.id,
      },
    ];

    const insertedPermissions = await db
      .insert(schema.permissions)
      .values(permissionsToInsert)
      .returning();

    console.log('Seeding roles...');
    const roleNames = [
      'SuperAdmin',
      'Admin',
      'Provider',
      'Staff',
      'Radiologist',
      'Patient',
    ];

    const insertedRoles = await db
      .insert(schema.roles)
      .values(roleNames.map((name) => ({ name })))
      .returning();

    console.log('Mapping permissions to roles...');
    const superAdminRole = insertedRoles.find((r) => r.name === 'SuperAdmin')!;
    const adminRole = insertedRoles.find((r) => r.name === 'Admin')!;
    const providerRole = insertedRoles.find((r) => r.name === 'Provider')!;

    // SuperAdmin gets everything
    const superAdminRolePermissions = insertedPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    }));

    // Admin gets almost everything
    const adminRolePermissions = insertedPermissions
      .filter((p) => !p.key.startsWith('admin:roles'))
      .map((p) => ({
        roleId: adminRole.id,
        permissionId: p.id,
      }));

    // Provider gets patient and appointment access
    const providerRolePermissions = insertedPermissions
      .filter(
        (p) =>
          p.key.startsWith('patients') ||
          p.key.startsWith('appointments') ||
          p.key.startsWith('dashboard') ||
          p.key.startsWith('dosespot') ||
          p.key === 'analytics:clinical:read',
      )
      .map((p) => ({
        roleId: providerRole.id,
        permissionId: p.id,
      }));

    await db
      .insert(schema.rolePermissions)
      .values([
        ...superAdminRolePermissions,
        ...adminRolePermissions,
        ...providerRolePermissions,
      ]);

    console.log('Seeding users...');
    const usersToInsert = insertedRoles.map((role) => ({
      email: `${role.name.toLowerCase()}@example.com`,
      name: `${role.name} User`,
      emailVerified: true,
      phone: role.name === 'Patient' ? '+15555550100' : undefined,
      roleId: role.id,
      organizationId: defaultOrg.id,
    }));

    const insertedUsers = await db.insert(schema.users).values(usersToInsert).returning();
    const patientUser = insertedUsers.find((user) => user.email === 'patient@example.com');
    const providerUser = insertedUsers.find(
      (user) => user.email === 'provider@example.com',
    );

    console.log('Seeding patient and provider...');
    const [patient] = await db
      .insert(schema.patients)
      .values({
        firstName: 'Patient',
        lastName: 'User',
        phone: '+15555550100',
        userId: patientUser?.id,
        organizationId: defaultOrg.id,
      })
      .returning();

    const [provider] = await db
      .insert(schema.providers)
      .values({
        firstName: 'Provider',
        lastName: 'User',
        npi: '1234567890',
        userId: providerUser?.id,
        organizationId: defaultOrg.id,
      })
      .returning();

    console.log('Seeding appointment...');
    await db.insert(schema.appointments).values({
      patientId: patient.id,
      providerId: provider.id,
      scheduledTime: new Date(Date.now() + 86_400_000),
    });

    console.log('Seeding analytics data...');
    await db.insert(schema.vitalLogs).values([
      { patientId: patient.id, type: 'weight', value: '185', unit: 'lbs', recordedAt: new Date(Date.now() - 30 * 86_400_000) },
      { patientId: patient.id, type: 'weight', value: '180', unit: 'lbs', recordedAt: new Date(Date.now() - 15 * 86_400_000) },
      { patientId: patient.id, type: 'weight', value: '175', unit: 'lbs', recordedAt: new Date() },
    ]);

    await db.insert(schema.labOrders).values([
      { patientId: patient.id, providerId: provider.id, testName: 'CBC with Differential', status: 'Completed', completedAt: new Date() },
      { patientId: patient.id, providerId: provider.id, testName: 'Metabolic Panel', status: 'Overdue' },
    ]);

    await db.insert(schema.subscriptions).values([
      { patientId: patient.id, planId: 'weight_loss_monthly', status: 'active', mrr: 12900, stripeSubscriptionId: 'sub_mock_123' },
    ]);

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error('Seeding script failed');
    console.error(error);
    process.exit(1);
  });
}
