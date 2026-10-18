// Resolves the test DB URL and refuses anything that is not clearly a test database.
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) throw new Error('Refusing to run integration tests: database name must end with _test');
  return url;
}
