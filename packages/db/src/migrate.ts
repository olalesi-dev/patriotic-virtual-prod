import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '@workspace/env';

export async function runMigrate() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  const connection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('Running migrations...');
  const start = Date.now();
  await migrate(db, { migrationsFolder: 'src/migrations' });
  const end = Date.now();
  console.log(`Migrations completed in ${end - start}ms`);

  await connection.end();
}

if (import.meta.main) {
  runMigrate().catch((err) => {
    console.error('Migration failed');
    console.error(err);
    process.exit(1);
  });
}
