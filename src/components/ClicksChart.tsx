import { copy } from '@/content/copy';
import type { StatsView } from '@/lib/types';
import styles from './ClicksChart.module.css';

type Day = StatsView['daily'][number];

const number = new Intl.NumberFormat('en');

// Day first with an English short month; en-GB prints "Sept".
function dayLabel(day: string, withYear = false): string {
  const d = new Date(`${day}T00:00:00Z`);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d);
  return `${d.getUTCDate()} ${month}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
}

// Rounds up to 1, 2 or 5 times a power of ten so the axis shows a clean top value.
function niceMax(value: number): number {
  if (value <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (step * pow >= value) return step * pow;
  }
  return 10 * pow;
}

type Size = { width: number; height: number; gap: number };

// Two geometries (phone and wide) so the plot keeps its proportions as the SVG scales to its box.
const PHONE: Size = { width: 300, height: 192, gap: 2 };
const WIDE: Size = { width: 900, height: 240, gap: 4 };

function Plot({ days, size, className }: { days: Day[]; size: Size; className: string }) {
  const { width, height, gap } = size;
  const top = 6;
  const bottom = 6;
  const plotH = height - top - bottom;
  const baseline = top + plotH;
  const peak = niceMax(Math.max(1, ...days.map((d) => Math.max(d.clicks, d.uniques))));
  const slot = width / days.length;
  const barW = Math.max(1, slot - gap);
  const y = (v: number) => top + plotH * (1 - v / peak);
  const cx = (i: number) => slot * i + slot / 2;
  const points = days.map((d, i) => `${cx(i).toFixed(1)},${y(d.uniques).toFixed(1)}`).join(' ');
  const mid = Math.floor(days.length / 2);
  const peakText = number.format(peak);
  const pct = (v: number) => `${((y(v) / height) * 100).toFixed(2)}%`;

  return (
    <div className={className}>
      <div className={styles.plot} style={{ paddingLeft: `calc(${peakText.length}ch + var(--space-2))` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} aria-hidden="true" focusable="false">
          <line x1={0} x2={width} y1={y(peak)} y2={y(peak)} className={styles.grid} />
          {peak >= 2 && <line x1={0} x2={width} y1={y(peak / 2)} y2={y(peak / 2)} className={styles.grid} />}

          {days.map((d, i) =>
            d.clicks > 0 ? (
              <rect
                key={d.day}
                x={(slot * i + gap / 2).toFixed(1)}
                y={y(d.clicks).toFixed(1)}
                width={barW.toFixed(1)}
                height={(baseline - y(d.clicks)).toFixed(1)}
                className={styles.bar}
              />
            ) : null,
          )}

          <line x1={0} x2={width} y1={baseline} y2={baseline} className={styles.baseline} />

          <polyline points={points} className={styles.halo} />
          <polyline points={points} className={styles.line} />
          {days.map((d, i) => (
            <circle key={`h-${d.day}`} cx={cx(i)} cy={y(d.uniques)} r={5} className={styles.dotHalo} />
          ))}
          {days.map((d, i) => (
            <circle key={`d-${d.day}`} cx={cx(i)} cy={y(d.uniques)} r={3} className={styles.dot} />
          ))}
        </svg>
        <span className={styles.yLabel} style={{ top: pct(0) }} aria-hidden="true">
          0
        </span>
        <span className={styles.yLabel} style={{ top: pct(peak) }} aria-hidden="true">
          {peakText}
        </span>
      </div>
      <div
        className={styles.xLabels}
        style={{ marginLeft: `calc(${peakText.length}ch + var(--space-2))` }}
        aria-hidden="true"
      >
        <span>{dayLabel(days[0].day)}</span>
        <span>{dayLabel(days[mid].day)}</span>
        <span>{dayLabel(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}

export function ClicksChart({ daily }: { daily: Day[] }) {
  const s = copy.stats;
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{s.chartTitle}</figcaption>

      <ul className={styles.legend}>
        <li>
          <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" focusable="false">
            <rect x="3" y="2" width="10" height="10" className={styles.bar} />
          </svg>
          {s.clicksLabel}
        </li>
        <li>
          <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
            <line x1="0" x2="24" y1="6" y2="6" className={styles.line} />
            <circle cx="12" cy="6" r="3" className={styles.dot} />
          </svg>
          {s.dailyUniquesLabel}
        </li>
      </ul>

      <Plot days={daily} size={PHONE} className={styles.phone} />
      <Plot days={daily} size={WIDE} className={styles.wide} />

      <div className="visually-hidden">
      <table>
        <caption>{s.chartTableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{s.tableDayHeader}</th>
            <th scope="col">{s.clicksLabel}</th>
            <th scope="col">{s.dailyUniquesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.day}>
              <th scope="row">{dayLabel(d.day, true)}</th>
              <td>{number.format(d.clicks)}</td>
              <td>{number.format(d.uniques)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <p className={styles.note}>{s.daysInUtcNote}</p>
      <p className={styles.note}>{s.uniquesNote}</p>
    </figure>
  );
}
