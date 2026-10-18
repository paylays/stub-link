import { describe, expect, it } from 'vitest';
import { creatorHash, getClientIp, visitorHash } from '@/lib/visitor';

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

describe('getClientIp', () => {
  it('prefers x-real-ip', () => {
    expect(getClientIp(h({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
  });
  it('uses first x-forwarded-for entry, trimmed', () => {
    expect(getClientIp(h({ 'x-forwarded-for': ' 2.2.2.2 , 3.3.3.3' }))).toBe('2.2.2.2');
  });
  it('falls through blank x-real-ip', () => {
    expect(getClientIp(h({ 'x-real-ip': '  ', 'x-forwarded-for': '2.2.2.2' }))).toBe('2.2.2.2');
  });
  it('returns unknown with no headers or blank values', () => {
    expect(getClientIp(h({}))).toBe('unknown');
    expect(getClientIp(h({ 'x-forwarded-for': '' }))).toBe('unknown');
    expect(getClientIp(h({ 'x-forwarded-for': ' , 1.1.1.1' }))).toBe('unknown');
  });
});

describe('visitorHash', () => {
  const S = 'secret';
  const base = () => visitorHash(S, '2026-01-01', 1, '1.1.1.1', 'UA');

  it('is stable and 32 hex chars', () => {
    expect(base()).toBe(base());
    expect(base()).toMatch(/^[0-9a-f]{32}$/);
  });
  it('treats numeric and string link id alike', () => {
    expect(visitorHash(S, '2026-01-01', '1', '1.1.1.1', 'UA')).toBe(base());
  });
  it('changes with day, link id, ip, ua, secret', () => {
    const vals = [
      visitorHash(S, '2026-01-02', 1, '1.1.1.1', 'UA'),
      visitorHash(S, '2026-01-01', 2, '1.1.1.1', 'UA'),
      visitorHash(S, '2026-01-01', 1, '1.1.1.2', 'UA'),
      visitorHash(S, '2026-01-01', 1, '1.1.1.1', 'UA2'),
      visitorHash('other', '2026-01-01', 1, '1.1.1.1', 'UA'),
    ];
    expect(new Set([base(), ...vals]).size).toBe(6);
  });
});

describe('creatorHash', () => {
  it('is 32 hex, stable, and differs from visitorHash for same ip', () => {
    const c = creatorHash('secret', '1.1.1.1');
    expect(c).toMatch(/^[0-9a-f]{32}$/);
    expect(c).toBe(creatorHash('secret', '1.1.1.1'));
    expect(c).not.toBe(visitorHash('secret', '2026-01-01', 1, '1.1.1.1', ''));
    expect(c).not.toBe(creatorHash('secret', '1.1.1.2'));
  });
});
