import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, CODE_RE, generateCode } from '@/lib/codes';
import { TOKEN_RE, generateStatsToken, hashToken } from '@/lib/tokens';

describe('codes', () => {
  it('CODE_LENGTH is 7', () => expect(CODE_LENGTH).toBe(7));

  it('generateCode yields 7 chars of [A-Za-z0-9]', () => {
    for (let i = 0; i < 500; i++) {
      const c = generateCode();
      expect(c).toHaveLength(7);
      expect(c).toMatch(/^[A-Za-z0-9]+$/);
      expect(CODE_RE.test(c)).toBe(true);
    }
  });

  it('generateCode is not constant', () => {
    expect(new Set(Array.from({ length: 50 }, generateCode)).size).toBeGreaterThan(40);
  });

  it.each(['abcDEF1', '0000000', 'ZZZZZZZ'])('CODE_RE accepts %s', (c) => expect(CODE_RE.test(c)).toBe(true));
  it.each(['', 'abcdef', 'abcdefgh', 'abc-def', 'abc def', 'abcdéf1', 'abcDEF1\n', '../etc'])(
    'CODE_RE rejects %j',
    (c) => expect(CODE_RE.test(c)).toBe(false),
  );
});

describe('tokens', () => {
  it('generateStatsToken matches TOKEN_RE and is 43 chars', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateStatsToken();
      expect(t).toHaveLength(43);
      expect(TOKEN_RE.test(t)).toBe(true);
    }
  });

  it('tokens are unique', () => {
    expect(new Set(Array.from({ length: 100 }, generateStatsToken)).size).toBe(100);
  });

  it('TOKEN_RE rejects wrong length or chars', () => {
    expect(TOKEN_RE.test('a'.repeat(42))).toBe(false);
    expect(TOKEN_RE.test('a'.repeat(44))).toBe(false);
    expect(TOKEN_RE.test('a'.repeat(42) + '+')).toBe(false);
    expect(TOKEN_RE.test('a'.repeat(42) + '=')).toBe(false);
  });

  it('hashToken is deterministic 64-char hex and differs per token', () => {
    const a = generateStatsToken();
    const b = generateStatsToken();
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toBe(hashToken(b));
    expect(hashToken(a)).not.toBe(a);
  });
});
