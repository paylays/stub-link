import styles from './ShortUrl.module.css';

// Renders a short link with its 7-character code in the accent color.
export function ShortUrl({ url }: { url: string }) {
  const cut = url.lastIndexOf('/') + 1;
  return (
    <>
      {url.slice(0, cut)}
      {/* Only break opportunity: after the slash, so the code never splits. */}
      <wbr />
      <span className={styles.code}>{url.slice(cut)}</span>
    </>
  );
}
