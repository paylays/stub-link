'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { copy } from '@/content/copy';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

const THEME_EVENT = 'stub-theme-change';
const query = '(prefers-color-scheme: dark)';

function currentTheme(): Theme {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia(query).matches ? 'dark' : 'light';
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

export function ThemeToggle() {
  // The server snapshot is "light"; the real value lands right after hydration.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light' as Theme);

  // notFound() and error boundaries re-render <html> on the client and drop the attributes the
  // head script set, so restore them once the switch mounts.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-js', '');
    try {
      const saved = localStorage.getItem('stub-theme');
      if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  function flip() {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    // Blocked storage must not break the switch: the theme still changes for this page.
    try {
      localStorage.setItem('stub-theme', next);
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      data-theme-toggle=""
      onClick={flip}
      className={styles.toggle}
    >
      <span>{copy.theme.toggleLabel}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
