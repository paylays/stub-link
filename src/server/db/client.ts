import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '../env';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

// Singleton on globalThis so dev HMR does not open a new pool per reload.
const globalForDb = globalThis as unknown as { __shortlinkDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__shortlinkDb) {
    const client = postgres(getEnv().databaseUrl, { prepare: false, max: 5 });
    globalForDb.__shortlinkDb = drizzle(client, { schema });
  }
  return globalForDb.__shortlinkDb;
}
