import { describe, expect, it, vi } from 'vitest';
import { CHROME_UA, rawSql } from './helpers';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '7.7.7.7' }),
}));

import { createLinkAction } from '@/app/actions';
import { recordClick } from '@/server/clicks';
import { CREATE_LIMIT_PER_HOUR } from '@/server/rate-limit';
import { createLink, getLinkByCode } from '@/server/links';
import { getStatsByToken } from '@/server/stats';

const TARGET = 'https://example.com/page';

describe('rate limit (A3)', () => {
  it('21st create from one IP is rate_limited; other IP unaffected', async () => {
    expect(CREATE_LIMIT_PER_HOUR).toBe(20);
    for (let i = 0; i < 20; i++) expect((await createLink({ url: TARGET, ip: '2.2.2.2' })).ok).toBe(true);
    expect(await createLink({ url: TARGET, ip: '2.2.2.2' })).toEqual({ ok: false, error: 'rate_limited' });
    expect((await createLink({ url: TARGET, ip: '3.3.3.3' })).ok).toBe(true);
  });
});

describe('code collisions', () => {
  it('retries after two collisions then succeeds', async () => {
    const first = await createLink({ url: TARGET, ip: '1.1.1.1' });
    if (!first.ok) throw new Error('setup');
    const seq = [first.code, first.code, 'FRESH12'];
    const r = await createLink({ url: TARGET, ip: '1.1.1.1' }, { genCode: () => seq.shift()! });
    expect(r.ok && r.code).toBe('FRESH12');
    expect(await getLinkByCode('FRESH12')).not.toBeNull();
  });

  it('always-colliding genCode gives server_error after 5 attempts', async () => {
    const first = await createLink({ url: TARGET, ip: '1.1.1.1' });
    if (!first.ok) throw new Error('setup');
    const gen = vi.fn(() => first.code);
    const r = await createLink({ url: TARGET, ip: '1.1.1.1' }, { genCode: gen });
    expect(r).toEqual({ ok: false, error: 'server_error' });
    expect(gen).toHaveBeenCalledTimes(5);
  });
});

describe('privacy (A7)', () => {
  it('no plaintext token, IP or UA stored', async () => {
    const ip = '203.0.113.77';
    const r = await createLink({ url: TARGET, ip });
    if (!r.ok) throw new Error('setup');
    const link = await getLinkByCode(r.code);
    await recordClick({ linkId: link!.id, ip, userAgent: CHROME_UA });
    const sql = rawSql();
    const dump = JSON.stringify([await sql`select * from links`, await sql`select * from clicks`]);
    expect(dump).not.toContain(r.token);
    expect(dump).not.toContain(ip);
    expect(dump).not.toContain(CHROME_UA);
    expect(dump).not.toContain('Mozilla/5.0');
  });
});

describe('stats (A8 and shape)', () => {
  async function mk() {
    const r = await createLink({ url: TARGET, ip: '1.1.1.1' });
    if (!r.ok) throw new Error('setup');
    const link = (await getLinkByCode(r.code))!;
    return { ...r, id: link.id };
  }

  it('3 clicks same visitor same day: clicks=3 uniques=1; next day is new unique', async () => {
    const { token, id } = await mk();
    const now = new Date('2026-10-18T12:00:00Z');
    for (let i = 0; i < 3; i++) {
      await recordClick({ linkId: id, ip: '4.4.4.4', userAgent: CHROME_UA, now: new Date(now.getTime() + i * 1000) });
    }
    await recordClick({ linkId: id, ip: '4.4.4.4', userAgent: CHROME_UA, now: new Date('2026-10-19T01:00:00Z') });

    const stats = await getStatsByToken(token, new Date('2026-10-19T12:00:00Z'));
    expect(stats!.daily.find((d) => d.day === '2026-10-18')).toEqual({ day: '2026-10-18', clicks: 3, uniques: 1 });
    expect(stats!.daily.find((d) => d.day === '2026-10-19')).toEqual({ day: '2026-10-19', clicks: 1, uniques: 1 });
    expect(stats!.totalClicks).toBe(4);
  });

  it('numeric counts, 30 daily entries', async () => {
    const { token, id } = await mk();
    await recordClick({ linkId: id, ip: '4.4.4.4', userAgent: CHROME_UA });
    const s = (await getStatsByToken(token))!;
    expect(s.daily).toHaveLength(30);
    expect(typeof s.totalClicks).toBe('number');
    for (const d of s.daily) {
      expect(typeof d.clicks).toBe('number');
      expect(typeof d.uniques).toBe('number');
    }
    for (const c of [...s.devices, ...s.browsers, ...s.os]) expect(typeof c.clicks).toBe('number');
  });

  it('breakdown caps at top 8 plus Other', async () => {
    const { token, id } = await mk();
    const sql = rawSql();
    for (let i = 0; i < 10; i++) {
      await sql`insert into clicks (link_id, visitor_hash, device_type, browser, os)
        values (${id}, ${'v' + i}, 'desktop', ${'Browser' + i}, ${'OS' + i})`;
    }
    const s = (await getStatsByToken(token))!;
    expect(s.browsers).toHaveLength(9);
    expect(s.browsers[8]).toEqual({ name: 'Other', clicks: 2 });
    expect(s.os).toHaveLength(9);
    expect(s.os[8]).toEqual({ name: 'Other', clicks: 2 });
    expect(s.devices).toEqual([{ name: 'desktop', clicks: 10 }]);
  });

  it('unknown and malformed tokens return null', async () => {
    expect(await getStatsByToken('A'.repeat(43))).toBeNull();
    expect(await getStatsByToken('short')).toBeNull();
    expect(await getStatsByToken('!'.repeat(43))).toBeNull();
  });
});

describe('createLinkAction', () => {
  const fd = (url: string) => {
    const f = new FormData();
    f.set('url', url);
    return f;
  };

  it('valid URL returns ok with shortUrl and statsUrl', async () => {
    const appUrl = process.env.APP_URL!.replace(/\/+$/, '');
    const s = await createLinkAction({ status: 'idle' }, fd(TARGET));
    if (s.status !== 'ok') throw new Error(JSON.stringify(s));
    expect(s.shortUrl).toBe(`${appUrl}/${s.code}`);
    expect(s.statsUrl).toContain(`${appUrl}/stats/`);
    expect(s.statsUrl.split('/stats/')[1]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('javascript: scheme returns url_scheme', async () => {
    expect(await createLinkAction({ status: 'idle' }, fd('javascript:alert(1)'))).toEqual({
      status: 'error',
      error: 'url_scheme',
    });
  });

  it('A2: rejected inputs insert no row', async () => {
    const appUrl = process.env.APP_URL!.replace(/\/+$/, '');
    const bad = [
      'javascript:alert(1)',
      `${appUrl}/abc`,
      'https://user:pw@example.com/x',
      `https://example.com/${'a'.repeat(2100)}`,
    ];
    for (const u of bad) {
      const s = await createLinkAction({ status: 'idle' }, fd(u));
      expect(s.status).toBe('error');
    }
    const [{ count }] = await rawSql()`select count(*)::int as count from links`;
    expect(count).toBe(0);
  });

  describe('expiry fields', () => {
    const form = (fields: Record<string, string>) => {
      const f = fd(TARGET);
      for (const [k, v] of Object.entries(fields)) f.set(k, v);
      return f;
    };
    const rows = async () => {
      const [{ count }] = await rawSql()`select count(*)::int as count from links`;
      return count as number;
    };

    it('empty expiresAt with non-empty expiresLocal gives expiry_invalid and no row', async () => {
      const s = await createLinkAction({ status: 'idle' }, form({ expiresAt: '', expiresLocal: '2099-01-01T10:00' }));
      expect(s).toEqual({ status: 'error', error: 'expiry_invalid' });
      expect(await rows()).toBe(0);
    });

    it('both empty creates a link without expiry', async () => {
      const s = await createLinkAction({ status: 'idle' }, form({ expiresAt: '', expiresLocal: '' }));
      expect(s.status).toBe('ok');
      if (s.status === 'ok') expect(s.expiresAt).toBeNull();
      expect(await rows()).toBe(1);
    });

    it('valid ISO expiresAt with expiresLocal creates a link with that expiry', async () => {
      const iso = '2099-01-01T10:00:00.000Z';
      const s = await createLinkAction({ status: 'idle' }, form({ expiresAt: iso, expiresLocal: '2099-01-01T17:00' }));
      expect(s.status).toBe('ok');
      if (s.status === 'ok') expect(s.expiresAt).toBe(iso);
      expect(await rows()).toBe(1);
    });
  });
});
