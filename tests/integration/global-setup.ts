import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { testDatabaseUrl } from './db-url';

export default async function setup() {
  const client = postgres(testDatabaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  } finally {
    await client.end();
  }
}
