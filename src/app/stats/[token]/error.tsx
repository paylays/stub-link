'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { copy } from '@/content/copy';
import styles from './page.module.css';

// reset() only re-renders the client tree and never refetches, so a reload is the real retry.
export default function StatsError() {
  return (
    <>
    <SiteHeader width="stats" />
    <main className={styles.main}>
      <h1 className={styles.title}>{copy.stats.errorTitle}</h1>
      <p>{copy.stats.errorBody}</p>
      <button type="button" onClick={() => window.location.reload()} className={`${styles.button} ${styles.retry}`}>
        {copy.stats.errorRetry}
      </button>
    </main>
    </>
  );
}
