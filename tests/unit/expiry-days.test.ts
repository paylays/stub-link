import { describe, expect, it } from 'vitest';
import { MIN_EXPIRY_MS, parseExpiry } from '@/lib/expiry';
import { fillDays, lastNDaysUtc, toUtcDay } from '@/lib/days';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('parseExpiry', () => {
  it('MIN_EXPIRY_MS is 60s', () => expect(MIN_EXPIRY_MS).toBe(60_000));

  it.each([null, undefined, '', '   '])('no expiry for %j', (v) => {
    expect(parseExpiry(v, NOW)).toEqual({ ok: true, date: null });
  });

  it.each([
    'tomorrow',
    '2026-13-45T00:00Z',
    '2026-07-01',
    '2026-07-01T10:00:00+07:00',
    '2026-07-01T10:00:00',
  ])('expiry_invalid for %j', (v) => {
    expect(parseExpiry(v, NOW)).toEqual({ ok: false, error: 'expiry_invalid' });
  });

  it('expiry_invalid for impossible date 2027-02-31', () => {
    expect(parseExpiry('2027-02-31T10:00:00Z', NOW)).toEqual({ ok: false, error: 'expiry_invalid' });
  });

  it('expiry_past for past dates', () => {
    expect(parseExpiry('2020-01-01T00:00:00Z', NOW)).toEqual({ ok: false, error: 'expiry_past' });
  });

  it('expiry_past when under 60 s ahead, ok at exactly 60 s', () => {
    expect(parseExpiry('2026-06-15T12:00:59.999Z', NOW)).toEqual({ ok: false, error: 'expiry_past' });
    expect(parseExpiry('2026-06-15T12:00:00Z', NOW)).toEqual({ ok: false, error: 'expiry_past' });
    expect(parseExpiry('2026-06-15T12:01:00Z', NOW)).toEqual({ ok: true, date: new Date('2026-06-15T12:01:00Z') });
  });

  it('accepts valid future ISO with trimming and minute precision', () => {
    expect(parseExpiry(' 2026-12-31T23:59:59.123Z ', NOW)).toEqual({
      ok: true,
      date: new Date('2026-12-31T23:59:59.123Z'),
    });
    expect(parseExpiry('2026-12-31T23:59Z', NOW)).toEqual({ ok: true, date: new Date('2026-12-31T23:59:00Z') });
  });
});

describe('days', () => {
  it('toUtcDay formats UTC', () => {
    expect(toUtcDay(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01');
  });

  it('lastNDaysUtc: 30 entries, oldest first, ends at today', () => {
    const d = lastNDaysUtc(30, NOW);
    expect(d).toHaveLength(30);
    expect(d[29]).toBe('2026-06-15');
    expect(d[0]).toBe('2026-05-17');
    expect(d.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))).toBe(true);
    expect([...d].sort()).toEqual(d);
    expect(new Set(d).size).toBe(30);
  });

  it('crosses month, year and leap boundaries', () => {
    expect(lastNDaysUtc(5, new Date('2026-03-02T10:00:00Z'))).toEqual([
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(lastNDaysUtc(3, new Date('2026-01-01T00:00:00Z'))).toEqual(['2025-12-30', '2025-12-31', '2026-01-01']);
    expect(lastNDaysUtc(3, new Date('2024-03-01T00:00:00Z'))).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('just after UTC midnight is the new day; just before is the old day', () => {
    expect(lastNDaysUtc(2, new Date('2026-06-15T00:00:01Z'))).toEqual(['2026-06-14', '2026-06-15']);
    expect(lastNDaysUtc(2, new Date('2026-06-14T23:59:59.999Z'))).toEqual(['2026-06-13', '2026-06-14']);
  });

  it('fillDays zero-fills and keeps existing rows', () => {
    const days = lastNDaysUtc(30, NOW);
    const out = fillDays(days, [
      { day: '2026-06-10', clicks: 5, uniques: 3 },
      { day: '2000-01-01', clicks: 9, uniques: 9 },
    ]);
    expect(out).toHaveLength(30);
    expect(out.map((r) => r.day)).toEqual(days);
    expect(out.find((r) => r.day === '2026-06-10')).toEqual({ day: '2026-06-10', clicks: 5, uniques: 3 });
    expect(out.filter((r) => r.clicks === 0 && r.uniques === 0)).toHaveLength(29);
  });

  it('fillDays with no rows is all zeros', () => {
    expect(fillDays(['2026-01-01'], [])).toEqual([{ day: '2026-01-01', clicks: 0, uniques: 0 }]);
  });
});
