import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { BreakdownList } from '@/components/BreakdownList';
import { ClicksChart } from '@/components/ClicksChart';
import { ShortUrl } from '@/components/ShortUrl';
import { SiteHeader } from '@/components/SiteHeader';
import { copy } from '@/content/copy';
import { getStatsByToken } from '@/server/stats';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

// Shared by metadata and the page so the lookup runs once per request.
const load = cache(getStatsByToken);

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  let stats = null;
  let failed = false;
  try {
    stats = await load(token);
  } catch {
    // The page body rethrows the cached error into error.tsx; the title must still be set.
    failed = true;
  }
  return {
    title: stats || failed ? copy.stats.metaTitle : copy.notFound.metaTitle,
    robots: { index: false, follow: false },
  };
}

const number = new Intl.NumberFormat('en');

function utc(iso: string): string {
  const d = new Date(iso);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export default async function StatsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stats = await load(token);
  if (!stats) notFound();

  const s = copy.stats;
  const last30 = stats.daily.reduce((sum, d) => sum + d.clicks, 0);
  const qrSrc = `/api/qr/${stats.code}`;
  const targetIsWeb = /^https?:\/\//i.test(stats.targetUrl);

  return (
    <>
    <SiteHeader width="stats" />
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>{s.heading}</h1>
        <p className={styles.muted}>{s.bookmarkNote}</p>
      </header>

      <section className={styles.identity} aria-label={s.shortLinkLabel}>
        <div>
          <p className={styles.label}>{s.shortLinkLabel}</p>
          <p className={styles.mono}>
            <ShortUrl url={stats.shortUrl} />
          </p>
        </div>
        <div>
          <p className={styles.label}>{s.targetLabel}</p>
          <p className={styles.monoSmall}>
            {targetIsWeb ? (
              <a href={stats.targetUrl} rel="noreferrer" className={styles.targetLink}>
                {stats.targetUrl}
              </a>
            ) : (
              stats.targetUrl
            )}
          </p>
        </div>
      </section>

      <dl className={styles.facts}>
        <div>
          <dt className={styles.label}>{s.createdLabel}</dt>
          <dd>{utc(stats.createdAt)}</dd>
        </div>
        <div>
          <dt className={styles.label}>{s.expiresLabel}</dt>
          <dd>{stats.expiresAt ? utc(stats.expiresAt) : s.neverExpires}</dd>
        </div>
        <div className={styles.stateItem}>
          <dt className={styles.label}>{s.stateLabel}</dt>
          <dd>
            <strong className={styles.state}>{s.states[stats.state]}</strong>
            <span className={styles.muted}>{s.stateNotes[stats.state]}</span>
          </dd>
        </div>
      </dl>
      <p className={styles.muted}>{s.timesInUtc}</p>

      <section className={styles.total} aria-labelledby="total-label">
        <p id="total-label" className={styles.label}>
          {s.totalClicksLabel}
        </p>
        <p className={styles.totalNumber}>{number.format(stats.totalClicks)}</p>
        <p className={styles.muted}>{s.totalClicksNote}</p>
      </section>

      {stats.totalClicks === 0 ? (
        <section className={styles.empty}>
          <h2 className={styles.sectionHeading}>{s.emptyTitle}</h2>
          <p>{s.emptyBody}</p>
        </section>
      ) : last30 === 0 ? (
        <section className={styles.empty}>
          <h2 className={styles.sectionHeading}>{s.last30DaysHeading}</h2>
          <p>{s.emptyLast30}</p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>{s.last30DaysHeading}</h2>
            <ClicksChart daily={stats.daily} />
          </section>

          <div className={styles.breakdowns}>
            <BreakdownList heading={s.devicesHeading} items={stats.devices} names={s.deviceNames} />
            <BreakdownList heading={s.browsersHeading} items={stats.browsers} />
            <BreakdownList heading={s.osHeading} items={stats.os} />
          </div>
        </>
      )}

      <section className={styles.qr}>
        <p className={styles.label}>{s.qrLabel}</p>
        {/* Plain img: the route returns a ready PNG, so next/image has nothing to optimize. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt={s.qrAlt(stats.shortUrl)} width={512} height={512} className={styles.qrImg} />
        <a href={qrSrc} download={`${stats.code}-qr.png`} className={styles.button}>
          {s.qrDownload}
        </a>
      </section>
    </main>
    </>
  );
}
