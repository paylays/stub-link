import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const links = pgTable(
  'links',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    code: varchar('code', { length: 7 }).notNull().unique(),
    targetUrl: text('target_url').notNull(),
    statsTokenHash: varchar('stats_token_hash', { length: 64 }).notNull().unique(),
    creatorIpHash: varchar('creator_ip_hash', { length: 32 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('links_target_url_len', sql`char_length(${t.targetUrl}) <= 2048`),
    index('links_creator_ip_created_idx').on(t.creatorIpHash, t.createdAt),
  ],
);

export const clicks = pgTable(
  'clicks',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    linkId: bigint('link_id', { mode: 'number' })
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
    visitorHash: varchar('visitor_hash', { length: 32 }).notNull(),
    deviceType: varchar('device_type', { length: 16 }).notNull(),
    browser: varchar('browser', { length: 64 }).notNull(),
    os: varchar('os', { length: 64 }).notNull(),
  },
  (t) => [index('clicks_link_clicked_idx').on(t.linkId, t.clickedAt)],
);
