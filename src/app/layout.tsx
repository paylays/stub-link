import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { THEME_HEAD_SCRIPT } from '@/components/theme-script';
import { copy } from '@/content/copy';
import './globals.css';

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_HEAD_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
