import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@workspace/env';
import * as schema from './schema';
import * as identitySchema from './identity-verifications';

export async function seedDatabase() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('Connecting to database...');
  const connection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection, { schema: { ...schema, ...identitySchema } });

  try {
    console.log('Clearing existing data...');
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
        name: 'Default Organization',
      })
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

    console.log('Seeding users...');
    const usersToInsert = insertedRoles.map((role) => ({
      email: `${role.name.toLowerCase()}@example.com`,
      name: `${role.name} User`,
      emailVerified: true,
      roleId: role.id,
      organizationId: defaultOrg.id,
    }));

    await db.insert(schema.users).values(usersToInsert);

    console.log('Seeding patient and provider...');
    const [patient] = await db
      .insert(schema.patients)
      .values({
        firstName: 'Patient',
        lastName: 'User',
        organizationId: defaultOrg.id,
      })
      .returning();

    const [provider] = await db
      .insert(schema.providers)
      .values({
        firstName: 'Provider',
        lastName: 'User',
        npi: '1234567890',
        organizationId: defaultOrg.id,
      })
      .returning();

    console.log('Seeding appointment...');
    await db.insert(schema.appointments).values({
      patientId: patient.id,
      providerId: provider.id,
      scheduledTime: new Date(Date.now() + 86400000), // Tomorrow
    });

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (import.meta.main) {
  seedDatabase().catch((err) => {
    console.error('Seeding script failed');
    console.error(err);
    process.exit(1);
  });
}
