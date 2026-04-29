import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@workspace/env';
import { dbSchema } from '@workspace/db';

const connectionString = (env.DATABASE_URL?.trim()) ? env.DATABASE_URL : "postgres://dummy:dummy@localhost/dummy";
const connection = postgres(connectionString);

export const db = drizzle(connection, {
  schema: dbSchema,
});
