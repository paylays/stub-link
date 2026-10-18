'use server';

import { headers } from 'next/headers';
import type { CreateLinkState } from '@/lib/types';
import { getClientIp } from '@/lib/visitor';
import { getEnv } from '@/server/env';
import { createLink } from '@/server/links';

export async function createLinkAction(
  _prev: CreateLinkState,
  formData: FormData,
): Promise<CreateLinkState> {
  const url = formData.get('url');
  const expiresAt = formData.get('expiresAt');
  const expiresLocal = formData.get('expiresLocal');
  const expiresValue = typeof expiresAt === 'string' ? expiresAt.trim() : '';
  // Only expiresLocal arrived, so client JS did not run. Refuse rather than store a link that never expires.
  if (!expiresValue && typeof expiresLocal === 'string' && expiresLocal.trim()) {
    return { status: 'error', error: 'expiry_invalid' };
  }
  const result = await createLink({
    url: typeof url === 'string' ? url : '',
    expiresAt: typeof expiresAt === 'string' ? expiresAt : null,
    ip: getClientIp(await headers()),
  });
  if (!result.ok) return { status: 'error', error: result.error };

  const { appUrl } = getEnv();
  return {
    status: 'ok',
    code: result.code,
    shortUrl: `${appUrl}/${result.code}`,
    statsUrl: `${appUrl}/stats/${result.token}`,
    expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null,
  };
}
