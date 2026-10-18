import { and, count, eq, gt, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { links } from './db/schema';

export const CREATE_LIMIT_PER_HOUR = 20;

export async function isRateLimited(creatorIpHash: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(links)
    .where(and(eq(links.creatorIpHash, creatorIpHash), gt(links.createdAt, sql`now() - interval '1 hour'`)));
  return (row?.n ?? 0) >= CREATE_LIMIT_PER_HOUR;
}
