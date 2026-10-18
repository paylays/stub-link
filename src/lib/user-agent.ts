import Bowser from 'bowser';

type HeaderSource = { get(name: string): string | null };

export type ParsedUserAgent = {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'unknown';
  browser: string;
  os: string;
};

const BOT_RE =
  /((?<!cu)bot|crawler|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|headless|lighthouse|curl|wget|python-requests|go-http-client|okhttp|axios|node-fetch)/i;

const DEVICE_TYPES = new Set(['desktop', 'mobile', 'tablet', 'tv']);

export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua.trim()) return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' };
  const result = Bowser.parse(ua);
  const platform = result.platform.type;
  return {
    deviceType: platform && DEVICE_TYPES.has(platform) ? (platform as ParsedUserAgent['deviceType']) : 'unknown',
    browser: (result.browser.name || 'Unknown').slice(0, 64),
    os: (result.os.name || 'Unknown').slice(0, 64),
  };
}

export function isBot(ua: string): boolean {
  if (!ua.trim()) return true;
  if (Bowser.parse(ua).platform.type === 'bot') return true;
  return BOT_RE.test(ua);
}

export function isPrefetch(headers: HeaderSource): boolean {
  if (headers.get('sec-purpose')?.toLowerCase().includes('prefetch')) return true;
  if (headers.get('purpose')?.toLowerCase() === 'prefetch') return true;
  if (/^(preview|prefetch)$/i.test(headers.get('x-purpose')?.trim() ?? '')) return true;
  if (headers.get('x-moz')?.toLowerCase() === 'prefetch') return true;
  return false;
}
