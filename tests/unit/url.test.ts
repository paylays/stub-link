import { describe, expect, it } from 'vitest';
import { validateTargetUrl } from '@/lib/url';

const APP = 'https://short.example.com';
const err = (input: string, app = APP) => validateTargetUrl(input, app);

describe('validateTargetUrl', () => {
  it.each([
    ['javascript:alert(1)', 'url_scheme'],
    ['data:text/html,<h1>x</h1>', 'url_scheme'],
    ['ftp://files.example.com/a', 'url_scheme'],
    ['file:///etc/passwd', 'url_scheme'],
  ])('rejects scheme %s', (input, error) => {
    expect(err(input)).toEqual({ ok: false, error });
  });

  it.each([
    'https://short.example.com/abc',
    'HTTPS://SHORT.EXAMPLE.COM/abc',
    'https://short.example.com./abc',
    'HTTPS://Short.Example.COM.:443/abc',
  ])('rejects own domain %s', (input) => {
    expect(err(input)).toEqual({ ok: false, error: 'url_own_domain' });
  });

  it('matches own domain when APP_URL has uppercase host and trailing dot', () => {
    expect(err('https://short.example.com/x', 'HTTPS://SHORT.EXAMPLE.COM./')).toEqual({
      ok: false,
      error: 'url_own_domain',
    });
  });

  it('does not reject other hosts or subdomains of the app domain', () => {
    expect(err('https://other.example.com/')).toMatchObject({ ok: true });
    expect(err('https://a.short.example.com/')).toMatchObject({ ok: true });
  });

  it('rejects credentials', () => {
    expect(err('https://bank.com@evil.com')).toEqual({ ok: false, error: 'url_credentials' });
    expect(err('https://user:pass@evil.com/')).toEqual({ ok: false, error: 'url_credentials' });
  });

  it('rejects length over 2048', () => {
    const long = 'https://example.com/' + 'a'.repeat(2049);
    expect(err(long)).toEqual({ ok: false, error: 'url_too_long' });
  });

  it('accepts length exactly 2048', () => {
    const base = 'https://example.com/';
    const url = base + 'a'.repeat(2048 - base.length);
    expect(url.length).toBe(2048);
    expect(err(url)).toMatchObject({ ok: true });
  });

  it('rejects when normalized href exceeds 2048', () => {
    const base = 'https://example.com/';
    // each double quote becomes %22, growing the href past the cap
    const url = base + ' '.repeat(0) + 'a'.repeat(2000) + '"'.repeat(20);
    expect(url.length).toBeLessThanOrEqual(2048);
    expect(err(url)).toEqual({ ok: false, error: 'url_too_long' });
  });

  it.each(['not a url', 'http://', 'https//example.com', '://x.com', 'example.com'])(
    'rejects unparsable %j',
    (input) => {
      expect(err(input)).toEqual({ ok: false, error: 'url_invalid' });
    },
  );

  it.each(['', '   ', '\t\n'])('rejects empty/whitespace %j', (input) => {
    expect(err(input)).toEqual({ ok: false, error: 'url_required' });
  });

  it.each(['http://localhost', 'http://intranet', 'http://localhost:3000/x', 'http://intranet./'])(
    'rejects hostname without a dot %s',
    (input) => {
      expect(err(input)).toEqual({ ok: false, error: 'url_invalid' });
    },
  );

  it('localhost APP_URL: HTTP://LOCALHOST:3000. is rejected as dotless host', () => {
    expect(err('HTTP://LOCALHOST:3000.', 'http://localhost:3000')).toEqual({ ok: false, error: 'url_invalid' });
  });

  it('accepts http and https and returns the normalized href', () => {
    expect(err('http://example.com')).toEqual({ ok: true, href: 'http://example.com/' });
    expect(err('  HTTPS://Example.COM/Path?q=1#h  ')).toEqual({ ok: true, href: 'https://example.com/Path?q=1#h' });
    expect(err('https://example.com:8443/a b')).toEqual({ ok: true, href: 'https://example.com:8443/a%20b' });
  });

  it('survives an unparsable APP_URL', () => {
    expect(err('https://example.com/', 'not a url')).toMatchObject({ ok: true });
  });
});
