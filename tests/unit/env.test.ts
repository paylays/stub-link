import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv } from '@/server/env';

describe('getEnv APP_URL', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@localhost:5433/x_test');
    vi.stubEnv('HASH_SECRET', 'x'.repeat(40));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['localhost:3000', 'ftp://x.com'])('rejects %s', (v) => {
    vi.stubEnv('APP_URL', v);
    expect(() => getEnv()).toThrow(/APP_URL must be an absolute http\(s\) URL/);
  });

  it('accepts http://localhost:3000/ and strips the trailing slash', () => {
    vi.stubEnv('APP_URL', 'http://localhost:3000/');
    expect(getEnv().appUrl).toBe('http://localhost:3000');
  });
});
