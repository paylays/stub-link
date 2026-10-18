import { createHmac } from 'node:crypto';

type HeaderSource = { get(name: string): string | null };

export function getClientIp(headers: HeaderSource): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return 'unknown';
}

function hmacHex(secret: string, message: string): string {
  // First 16 bytes (32 hex chars) is enough for bucketing and keeps rows small.
  return createHmac('sha256', secret).update(message).digest('hex').slice(0, 32);
}

export function creatorHash(secret: string, ip: string): string {
  return hmacHex(secret, `create\n${ip}`);
}

// utcDay is YYYY-MM-DD, so the hash rotates daily and differs per link.
export function visitorHash(
  secret: string,
  utcDay: string,
  linkId: number | string,
  ip: string,
  ua: string,
): string {
  return hmacHex(secret, `${utcDay}\n${linkId}\n${ip}\n${ua}`);
}
