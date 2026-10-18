import { describe, expect, it } from 'vitest';
import { isBot, isPrefetch, parseUserAgent } from '@/lib/user-agent';

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CUBOT =
  'Mozilla/5.0 (Linux; Android 12; CUBOT KINGKONG 5 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

describe('parseUserAgent', () => {
  it('desktop Chrome', () => {
    expect(parseUserAgent(CHROME)).toEqual({ deviceType: 'desktop', browser: 'Chrome', os: 'Windows' });
  });
  it('iPhone Safari', () => {
    expect(parseUserAgent(IPHONE)).toEqual({ deviceType: 'mobile', browser: 'Safari', os: 'iOS' });
  });
  it('Android tablet', () => {
    const r = parseUserAgent(ANDROID_TABLET);
    expect(r.deviceType).toBe('tablet');
    expect(r.os).toBe('Android');
    expect(r.browser).toBe('Chrome');
  });
  it('unknown string', () => {
    expect(parseUserAgent('???')).toEqual({ deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' });
  });
  it('empty string does not throw', () => {
    expect(parseUserAgent('')).toEqual({ deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' });
  });
});

describe('isBot', () => {
  it.each([
    ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
    ['facebookexternalhit', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
    ['WhatsApp', 'WhatsApp/2.23.20.0 A'],
    ['curl', 'curl/8.4.0'],
    ['python-requests', 'python-requests/2.31.0'],
    [
      'HeadlessChrome',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36',
    ],
    ['empty', ''],
    ['whitespace', '   '],
  ])('bot: %s', (_n, ua) => expect(isBot(ua)).toBe(true));

  it.each([
    ['desktop Chrome', CHROME],
    ['Firefox', FIREFOX],
    ['iPhone Safari', IPHONE],
  ])('human: %s', (_n, ua) => expect(isBot(ua)).toBe(false));

  it('human: Cubot phone', () => expect(isBot(CUBOT)).toBe(false));
});

describe('isPrefetch', () => {
  const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
  it.each([
    [{ 'sec-purpose': 'prefetch' }],
    [{ 'sec-purpose': 'prefetch;prerender' }],
    [{ purpose: 'prefetch' }],
    [{ 'x-purpose': 'preview' }],
    [{ 'x-moz': 'prefetch' }],
  ])('true for %j', (o) => expect(isPrefetch(h(o))).toBe(true));

  it('false with no headers or unrelated values', () => {
    expect(isPrefetch(h({}))).toBe(false);
    expect(isPrefetch(h({ purpose: 'navigate' }))).toBe(false);
    expect(isPrefetch(h({ 'sec-purpose': 'navigate' }))).toBe(false);
  });
});
