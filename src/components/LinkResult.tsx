'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { copy } from '@/content/copy';
import type { CreateLinkState } from '@/lib/types';
import styles from './LinkResult.module.css';
import { ShortUrl } from './ShortUrl';

type Result = Extract<CreateLinkState, { status: 'ok' }>;
type CopyState = 'idle' | 'copied' | 'failed';

function CopyRow({
  id,
  label,
  value,
  display,
  buttonLabel,
  announce,
  valueClass,
}: {
  id: string;
  label: string;
  value: string;
  display: ReactNode;
  buttonLabel: string;
  announce: string;
  valueClass: string;
}) {
  const [status, setStatus] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function onCopy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className={styles.copyRow}>
      <p id={`${id}-label`} className={styles.label}>
        {label}
      </p>
      <div className={styles.valueLine}>
        <p className={valueClass}>{display}</p>
        <button type="button" onClick={onCopy} aria-label={buttonLabel}
          className={`${styles.button} ${styles.copy}`}
        >
          {status === 'copied' ? copy.result.copied : copy.result.copy}
        </button>
      </div>
      {status === 'failed' && <p className={styles.failed}>{copy.result.copyFailed}</p>}
      <span role="status" aria-live="polite" className="visually-hidden">
        {status === 'copied' ? announce : ''}
      </span>
    </div>
  );
}

// Day first, 24h local time with a short zone name, matching the stats page style.
function expiryLine(expiresAt: string | null): string {
  if (!expiresAt) return copy.result.neverExpires;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  const text = `${d.getDate()} ${month} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} ${zone}`;
  return copy.result.expiresOn(text.trim());
}

export function LinkResult({ result, onReset }: { result: Result; onReset: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const qrSrc = `/api/qr/${result.code}`;
  const expiry = expiryLine(result.expiresAt);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="result-heading">
      <h1 id="result-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
        {copy.result.heading}
      </h1>

      <div className={styles.layout}>
        <div className={styles.links}>
          <CopyRow
            id="short"
            label={copy.result.shortLinkLabel}
            value={result.shortUrl}
            display={<ShortUrl url={result.shortUrl} />}
            buttonLabel={copy.result.copyShortLinkLabel}
            announce={copy.result.shortLinkCopied}
            valueClass={styles.shortValue}
          />

          <div className={styles.note}>
            <p className={styles.noteTitle}>{copy.result.warningTitle}</p>
            <p className={styles.noteBody}>{copy.result.warningBody}</p>
            <CopyRow
              id="stats"
              label={copy.result.statsLinkLabel}
              value={result.statsUrl}
              display={result.statsUrl}
              buttonLabel={copy.result.copyStatsLinkLabel}
              announce={copy.result.statsLinkCopied}
              valueClass={styles.statsValue}
            />
          </div>
        </div>

        <div className={styles.qr}>
          <p className={styles.label}>{copy.result.qrLabel}</p>
          <div className={styles.qrBox}>
            {qrFailed ? (
              <p className={styles.qrError}>{copy.result.qrError}</p>
            ) : (
              // Plain img: the route returns a ready PNG, so next/image has nothing to optimize.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt={copy.result.qrAlt(result.shortUrl)}
                width={512}
                height={512}
                className={styles.qrImg}
                onError={() => setQrFailed(true)}
              />
            )}
          </div>
          <a href={qrSrc} download={`${result.code}-qr.png`} className={styles.button}>
            {copy.result.qrDownload}
          </a>
        </div>
      </div>

      {expiry && <p className={styles.expiry}>{expiry}</p>}

      <Link
        href="/"
        className={styles.button}
        onClick={(e) => {
          e.preventDefault();
          onReset();
        }}
      >
        {copy.result.createAnother}
      </Link>
    </section>
  );
}
