export type CreateLinkError = 'url_required'|'url_invalid'|'url_scheme'|'url_too_long'|'url_credentials'|'url_own_domain'|'expiry_invalid'|'expiry_past'|'rate_limited'|'server_error';
export type CreateLinkState =
  | { status: 'idle' }
  | { status: 'error'; error: CreateLinkError }
  | { status: 'ok'; code: string; shortUrl: string; statsUrl: string; expiresAt: string | null };
export type Count = { name: string; clicks: number };
export type StatsView = {
  code: string; shortUrl: string; targetUrl: string; createdAt: string; expiresAt: string | null;
  state: 'active' | 'expired' | 'disabled'; totalClicks: number;
  daily: { day: string; clicks: number; uniques: number }[]; // 30 entries, oldest first, YYYY-MM-DD UTC
  devices: Count[]; browsers: Count[]; os: Count[];
};
