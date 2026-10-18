import { eq } from 'drizzle-orm';
import { generateCode } from '@/lib/codes';
import { parseExpiry } from '@/lib/expiry';
import { generateStatsToken, hashToken } from '@/lib/tokens';
import type { CreateLinkError } from '@/lib/types';
import { validateTargetUrl } from '@/lib/url';
import { creatorHash } from '@/lib/visitor';
import { getDb } from './db/client';
import { links } from './db/schema';
import { getEnv } from './env';
import { isRateLimited } from './rate-limit';

const MAX_ATTEMPTS = 5;

export type CreateLinkInput = { url: string; expiresAt?: string | null; ip: string };
export type CreateLinkOptions = { now?: Date; genCode?: () => string };
export type CreateLinkResult =
  | { ok: true; code: string; token: string; expiresAt: Date | null }
  | { ok: false; error: CreateLinkError };

export async function createLink(
  input: CreateLinkInput,
  opts: CreateLinkOptions = {},
): Promise<CreateLinkResult> {
  const now = opts.now ?? new Date();
  const genCode = opts.genCode ?? generateCode;
  try {
    const env = getEnv();
    const url = validateTargetUrl(input.url, env.appUrl);
    if (!url.ok) return { ok: false, error: url.error };
    const expiry = parseExpiry(input.expiresAt, now);
    if (!expiry.ok) return { ok: false, error: expiry.error };

    const ipHash = creatorHash(env.hashSecret, input.ip);
    if (await isRateLimited(ipHash)) return { ok: false, error: 'rate_limited' };

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const code = genCode();
      const token = generateStatsToken();
      const rows = await getDb()
        .insert(links)
        .values({
          code,
          targetUrl: url.href,
          statsTokenHash: hashToken(token),
          creatorIpHash: ipHash,
          expiresAt: expiry.date,
        })
        .onConflictDoNothing()
        .returning({ id: links.id });
      if (rows.length > 0) return { ok: true, code, token, expiresAt: expiry.date };
    }
    return { ok: false, error: 'server_error' };
  } catch (err) {
    console.error('createLink failed:', err instanceof Error ? err.message : 'unknown error');
    return { ok: false, error: 'server_error' };
  }
}

export type LinkRow = {
  id: number;
  targetUrl: string;
  expiresAt: Date | null;
  disabledAt: Date | null;
};

export async function getLinkByCode(code: string): Promise<LinkRow | null> {
  const [row] = await getDb()
    .select({
      id: links.id,
      targetUrl: links.targetUrl,
      expiresAt: links.expiresAt,
      disabledAt: links.disabledAt,
    })
    .from(links)
    .where(eq(links.code, code))
    .limit(1);
  return row ?? null;
}
