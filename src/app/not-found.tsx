import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { copy } from '@/content/copy';
import styles from './not-found.module.css';

export const metadata: Metadata = {
  title: copy.notFound.metaTitle,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
    <SiteHeader width="narrow" />
    <main className={styles.main}>
      <h1 className={styles.title}>{copy.notFound.title}</h1>
      <p className={styles.body}>{copy.notFound.body}</p>
      <Link href="/" className={styles.link}>
        {copy.notFound.homeLink}
      </Link>
    </main>
    </>
  );
}
