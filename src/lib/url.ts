export type UrlError =
  | 'url_required'
  | 'url_invalid'
  | 'url_scheme'
  | 'url_too_long'
  | 'url_credentials'
  | 'url_own_domain';

export type UrlResult = { ok: true; href: string } | { ok: false; error: UrlError };

const MAX_LENGTH = 2048;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

export function validateTargetUrl(input: string, appUrl: string): UrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'url_required' };
  if (trimmed.length > MAX_LENGTH) return { ok: false, error: 'url_too_long' };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'url_invalid' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: 'url_scheme' };

  const host = normalizeHost(url.hostname);
  if (!host || !host.includes('.')) return { ok: false, error: 'url_invalid' };
  if (url.username || url.password) return { ok: false, error: 'url_credentials' };

  let appHost = '';
  try {
    appHost = normalizeHost(new URL(appUrl).hostname);
  } catch {
    // Unparsable APP_URL cannot match any target host.
  }
  if (appHost && host === appHost) return { ok: false, error: 'url_own_domain' };

  // The stored href is capped too: normalization can lengthen the input.
  if (url.href.length > MAX_LENGTH) return { ok: false, error: 'url_too_long' };
  return { ok: true, href: url.href };
}
