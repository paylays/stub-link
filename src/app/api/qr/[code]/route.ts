import type { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { CODE_RE } from '@/lib/codes';
import { getEnv } from '@/server/env';

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) return new Response('Not found', { status: 404 });
  try {
    const png = await QRCode.toBuffer(`${getEnv().appUrl}/${code}`, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (err) {
    console.error('qr failed:', err instanceof Error ? err.message : 'unknown error');
    return new Response('Server error', { status: 500 });
  }
}
