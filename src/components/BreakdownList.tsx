import { copy } from '@/content/copy';
import type { Count } from '@/lib/types';
import styles from './BreakdownList.module.css';

const number = new Intl.NumberFormat('en');

type Props = {
  heading: string;
  items: Count[];
  // Maps a stored value to its display name; omitted for browsers and operating systems.
  names?: Readonly<Record<string, string>>;
};

export function BreakdownList({ heading, items, names }: Props) {
  const total = items.reduce((sum, i) => sum + i.clicks, 0);

  return (
    <section className={styles.block}>
      <h3 className={styles.heading}>{heading}</h3>
      <p className={styles.period}>{copy.stats.breakdownPeriod}</p>

      {total === 0 ? (
        <p className={styles.empty}>{copy.stats.emptyLast30}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const name =
              item.name === 'Other'
                ? copy.stats.other
                : item.name === 'Unknown'
                  ? copy.stats.deviceNames.unknown
                  : (names?.[item.name] ?? item.name);
            const share = (item.clicks / total) * 100;
            return (
              <li key={item.name} className={styles.row}>
                <span className={styles.name}>{name}</span>
                <span className={styles.count}>{number.format(item.clicks)}</span>
                <span className={styles.track} aria-hidden="true">
                  <span className={styles.fill} style={{ width: `${share.toFixed(1)}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
