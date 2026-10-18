import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { CHROME_UA, rawSql } from './helpers';

const pending: Promise<unknown>[] = vi.hoisted(() => []);

vi.mock('next/server', async (orig) => {
  const actual = await orig<typeof import('next/server')>();
  return { ...actual, after: (cb: () => unknown) => pending.push(Promise.resolve().then(cb)) };
});

import { GET, HEAD } from '@/app/[code]/route';
import { createLink } from '@/server/links';

const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const req = (code: string, headers: Record<string, string> = {}, method = 'GET') =>
  new NextRequest(`http://localhost/${code}`, { method, headers });
const clickCount = async () => Number((await rawSql()`select count(*)::int as n from clicks`)[0].n);

async function mk(url = 'https://example.com/target') {
  const r = await createLink({ url, ip: '1.1.1.1' });
  if (!r.ok) throw new Error(r.error);
  return r.code;
}

describe('redirect route', () => {
  it('A4: desktop Chrome gets 302, no-store, one click', async () => {
    const code = await mk();
    const res = await GET(req(code, { 'user-agent': CHROME_UA, 'x-forwarded-for': '9.9.9.9' }), ctx(code));
    await Promise.all(pending);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://example.com/target');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await clickCount()).toBe(1);
  });

  it.each([
    ['HEAD', 'HEAD', { 'user-agent': CHROME_UA }],
    ['bot UA', 'GET', { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }],
    ['sec-purpose prefetch', 'GET', { 'user-agent': CHROME_UA, 'sec-purpose': 'prefetch' }],
    ['empty UA', 'GET', { 'user-agent': '' }],
    ['missing UA', 'GET', {}],
  ])('A4: %s gives 302 and no click', async (_n, method, headers) => {
    const code = await mk();
    const r = req(code, headers, method);
    const res = await (method === 'HEAD' ? HEAD(r, ctx(code)) : GET(r, ctx(code)));
    await Promise.all(pending);
    expect(res.status).toBe(302);
    expect(await clickCount()).toBe(0);
  });

  it('A5: expired link gives 410 html, no click', async () => {
    const code = await mk();
    await rawSql()`update links set expires_at = now() - interval '1 minute' where code = ${code}`;
    const res = await GET(req(code, { 'user-agent': CHROME_UA }), ctx(code));
    await Promise.all(pending);
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await clickCount()).toBe(0);
  });

  it('A5: disabled link gives 410 html, no click', async () => {
    const code = await mk();
    await rawSql()`update links set disabled_at = now() where code = ${code}`;
    const res = await GET(req(code, { 'user-agent': CHROME_UA }), ctx(code));
    await Promise.all(pending);
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await clickCount()).toBe(0);
  });

  it.each(['Zz9Zz9Z', 'abc', 'abcdefgh', 'abc-def', ''])('A5: code %j gives 404, no click', async (code) => {
    const res = await GET(req(code || 'x', { 'user-agent': CHROME_UA }), ctx(code));
    await Promise.all(pending);
    expect(res.status).toBe(404);
    expect(await clickCount()).toBe(0);
  });
});
