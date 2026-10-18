import { and, eq, gte, sql } from 'drizzle-orm';
import { fillDays, lastNDaysUtc } from '@/lib/days';
import { TOKEN_RE, hashToken } from '@/lib/tokens';
import type { Count, StatsView } from '@/lib/types';
import { getDb } from './db/client';
import { clicks, links } from './db/schema';
import { getEnv } from './env';

const DAYS = 30;
const TOP = 8;

function topWithOther(rows: Count[]): Count[] {
  const sorted = [...rows].sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name));
  if (sorted.length <= TOP) return sorted;
  const rest = sorted.slice(TOP).reduce((sum, r) => sum + r.clicks, 0);
  return [...sorted.slice(0, TOP), { name: 'Other', clicks: rest }];
}

export async function getStatsByToken(token: string, now: Date = new Date()): Promise<StatsView | null> {
  if (!TOKEN_RE.test(token)) return null;
  const db = getDb();
  const [link] = await db
    .select()
    .from(links)
    .where(eq(links.statsTokenHash, hashToken(token)))
    .limit(1);
  if (!link) return null;

  const days = lastNDaysUtc(DAYS, now);
  const start = new Date(`${days[0]}T00:00:00Z`);
  const inWindow = and(eq(clicks.linkId, link.id), gte(clicks.clickedAt, start));

  const breakdown = async (col: typeof clicks.deviceType | typeof clicks.browser | typeof clicks.os) =>
    topWithOther(
      (
        await db
          .select({ name: col, clicks: sql<number>`count(*)::int` })
          .from(clicks)
          .where(inWindow)
          .groupBy(col)
      ).map((r) => ({ name: r.name, clicks: r.clicks })),
    );

  const [[total], dailyRows, devices, browsers, os] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(clicks).where(eq(clicks.linkId, link.id)),
    db
      .select({
        day: sql<string>`(${clicks.clickedAt} AT TIME ZONE 'UTC')::date::text`,
        clicks: sql<number>`count(*)::int`,
        uniques: sql<number>`count(DISTINCT ${clicks.visitorHash})::int`,
      })
      .from(clicks)
      .where(inWindow)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    breakdown(clicks.deviceType),
    breakdown(clicks.browser),
    breakdown(clicks.os),
  ]);

  const state: StatsView['state'] = link.disabledAt
    ? 'disabled'
    : link.expiresAt && link.expiresAt <= now
      ? 'expired'
      : 'active';

  return {
    code: link.code,
    shortUrl: `${getEnv().appUrl}/${link.code}`,
    targetUrl: link.targetUrl,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    state,
    totalClicks: total?.n ?? 0,
    daily: fillDays(days, dailyRows),
    devices,
    browsers,
    os,
  };
}
