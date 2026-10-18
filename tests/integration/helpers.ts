import postgres from 'postgres';
import { testDatabaseUrl } from './db-url';

let sql: ReturnType<typeof postgres> | undefined;

export function rawSql() {
  sql ??= postgres(testDatabaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
  return sql;
}

export const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
