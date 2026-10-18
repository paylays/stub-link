import { beforeEach } from 'vitest';
import { rawSql } from './helpers';
import { testDatabaseUrl } from './db-url';

if (process.env.DATABASE_URL !== testDatabaseUrl()) {
  throw new Error('DATABASE_URL must equal TEST_DATABASE_URL in integration tests');
}

beforeEach(async () => {
  await rawSql()`TRUNCATE links, clicks RESTART IDENTITY CASCADE`;
});
