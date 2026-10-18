'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { createLinkAction } from '@/app/actions';
import { copy } from '@/content/copy';
import type { CreateLinkError, CreateLinkState } from '@/lib/types';
import styles from './CreateLinkForm.module.css';
import { LinkResult } from './LinkResult';

const IDLE: CreateLinkState = { status: 'idle' };

function fieldOf(error: CreateLinkError): 'url' | 'expiry' | 'form' {
  if (error.startsWith('url_')) return 'url';
  if (error.startsWith('expiry_')) return 'expiry';
  return 'form';
}

// datetime-local value (no zone) for "now + 1 minute" in local time.
function localMin(): string {
  const d = new Date(Date.now() + 60_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoUtc(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function CreateLinkForm({ intro }: { intro: ReactNode }) {
  const [state, formAction, pending] = useActionState(createLinkAction, IDLE);
  const [url, setUrl] = useState('');
  const [expiry, setExpiry] = useState('');
  // The action state cannot be reset, so remember which result the person dismissed.
  const [dismissed, setDismissed] = useState<CreateLinkState | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);

  const error = state.status === 'error' ? state.error : null;
  const errorField = error ? fieldOf(error) : null;

  useEffect(() => {
    if (errorField === 'url') urlRef.current?.focus();
    else if (errorField === 'expiry') expiryRef.current?.focus();
  }, [state, errorField]);

  useEffect(() => {
    if (dismissed) urlRef.current?.focus();
  }, [dismissed]);

  if (state.status === 'ok' && dismissed !== state) {
    return (
      <LinkResult
        result={state}
        onReset={() => {
          setUrl('');
          setExpiry('');
          setDismissed(state);
        }}
      />
    );
  }

  const urlErrorId = 'url-error';
  const expiryErrorId = 'expiry-error';
  const formErrorId = 'form-error';

  return (
    <>
      {intro}
      <form action={formAction} noValidate className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="url" className={styles.label}>
            {copy.home.urlLabel}
          </label>
          <div className={styles.row}>
            <div className={styles.inputWrap}>
            <input
              ref={urlRef}
              id="url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              placeholder={copy.home.urlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              readOnly={pending}
              aria-invalid={errorField === 'url' || undefined}
              aria-describedby={errorField === 'url' ? urlErrorId : undefined}
              className={styles.urlInput}
            />
              {errorField === 'url' && error && (
                <p id={urlErrorId} className={styles.error}>
                  {copy.errors[error]}
                </p>
              )}
            </div>
            <button
              type="submit"
              aria-disabled={pending}
              onClick={(e) => {
                if (pending) e.preventDefault();
              }}
              className={styles.submit}
            >
              {pending ? copy.home.submitting : copy.home.submit}
            </button>
          </div>
        </div>

        <div className={`${styles.field} ${styles.expiryField}`}>
          <label htmlFor="expiry" className={styles.label}>
            {copy.home.expiryLabel}
          </label>
          <input
            ref={expiryRef}
            id="expiry"
            name="expiresLocal"
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.min = localMin();
            }}
            readOnly={pending}
            aria-invalid={errorField === 'expiry' || undefined}
            aria-describedby={errorField === 'expiry' ? `${expiryErrorId} expiry-hint` : 'expiry-hint'}
            className={styles.expiryInput}
          />
          <input type="hidden" name="expiresAt" value={toIsoUtc(expiry)} />
          <p id="expiry-hint" className={styles.hint}>
            {copy.home.expiryHint}
          </p>
          {errorField === 'expiry' && error && (
            <p id={expiryErrorId} className={styles.error}>
              {copy.errors[error]}
            </p>
          )}
        </div>

        {errorField === 'form' && error && (
          <p id={formErrorId} role="alert" className={styles.error}>
            {copy.errors[error]}
          </p>
        )}
      </form>
    </>
  );
}
