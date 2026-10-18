import { CreateLinkForm } from '@/components/CreateLinkForm';
import { SiteHeader } from '@/components/SiteHeader';
import { copy } from '@/content/copy';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
    <SiteHeader width="home" />
    <main className={styles.main}>
      <CreateLinkForm
        intro={
          <header className={styles.intro}>
            <h1 className={styles.heading}>{copy.home.headline}</h1>
            <p className={styles.lead}>{copy.home.intro}</p>
          </header>
        }
      />
    </main>
    </>
  );
}
