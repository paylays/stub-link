import { toUtcDay } from '@/lib/days';
import { parseUserAgent } from '@/lib/user-agent';
import { visitorHash } from '@/lib/visitor';
import { getDb } from './db/client';
import { clicks } from './db/schema';
import { getEnv } from './env';

export async function recordClick(input: {
  linkId: number;
  ip: string;
  userAgent: string;
  now?: Date;
}): Promise<void> {
  try {
    const now = input.now ?? new Date();
    const ua = parseUserAgent(input.userAgent);
    await getDb().insert(clicks).values({
      linkId: input.linkId,
      clickedAt: now,
      visitorHash: visitorHash(getEnv().hashSecret, toUtcDay(now), input.linkId, input.ip, input.userAgent),
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
    });
  } catch (err) {
    console.error('recordClick failed:', err instanceof Error ? err.message : 'unknown error');
  }
}
