import Link from 'next/link';
import { copy } from '@/content/copy';
import styles from './SiteHeader.module.css';
import { ThemeToggle } from './ThemeToggle';

type Width = 'home' | 'stats' | 'narrow';

// Each page renders its own header so it lines up with that page's column.
export function SiteHeader({ width }: { width: Width }) {
  return (
    <header className={`${styles.header} ${styles[width]}`}>
      {width === 'home' ? (
        <span className={styles.wordmark}>{copy.appName}</span>
      ) : (
        <Link href="/" className={styles.wordmark}>
          {copy.appName}
        </Link>
      )}
      <ThemeToggle />
    </header>
  );
}
