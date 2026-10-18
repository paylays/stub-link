// Read lazily so `next build` works without env vars.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

function parseAppUrl(input: string): string {
  const raw = input.trim();
  const message = 'APP_URL must be an absolute http(s) URL';
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(message);
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) {
    throw new Error(message);
  }
  return raw.replace(/\/+$/, '');
}

export function getEnv() {
  const hashSecret = required('HASH_SECRET');
  if (hashSecret.length < 32) throw new Error('HASH_SECRET must be at least 32 characters');
  return {
    databaseUrl: required('DATABASE_URL'),
    appUrl: parseAppUrl(required('APP_URL')),
    hashSecret,
  };
}
