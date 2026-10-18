export type ExpiryResult =
  | { ok: true; date: Date | null }
  | { ok: false; error: 'expiry_invalid' | 'expiry_past' };

export const MIN_EXPIRY_MS = 60_000;

// Accepts only ISO-8601 UTC ("...Z"); empty input means no expiry.
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

export function parseExpiry(input: string | null | undefined, now: Date): ExpiryResult {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { ok: true, date: null };
  if (!ISO_UTC_RE.test(trimmed)) return { ok: false, error: 'expiry_invalid' };
  const date = new Date(trimmed);
  // Round-trip the date part: JS rolls 2027-02-31 over to March instead of rejecting it.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed.slice(0, 10)) {
    return { ok: false, error: 'expiry_invalid' };
  }
  if (date.getTime() < now.getTime() + MIN_EXPIRY_MS) return { ok: false, error: 'expiry_past' };
  return { ok: true, date };
}
