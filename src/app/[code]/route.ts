import { after, type NextRequest } from 'next/server';
import { renderStatusPage, type StatusKind } from '@/components/status-page';
import { CODE_RE } from '@/lib/codes';
import { isBot, isPrefetch } from '@/lib/user-agent';
import { getClientIp } from '@/lib/visitor';
import { recordClick } from '@/server/clicks';
import { getLinkByCode } from '@/server/links';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

function statusResponse(kind: StatusKind, status: 404 | 410, head: boolean): Response {
  return new Response(head ? null : renderStatusPage(kind), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handle(req: NextRequest, ctx: Ctx, head: boolean): Promise<Response> {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) return statusResponse('not-found', 404, head);

  let link;
  try {
    link = await getLinkByCode(code);
  } catch (err) {
    console.error('redirect lookup failed:', err instanceof Error ? err.message : 'unknown error');
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!link) return statusResponse('not-found', 404, head);
  if (link.disabledAt) return statusResponse('disabled', 410, head);
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return statusResponse('expired', 410, head);

  if (!head) {
    const userAgent = req.headers.get('user-agent') ?? '';
    if (!isBot(userAgent) && !isPrefetch(req.headers)) {
      const ip = getClientIp(req.headers);
      after(() => recordClick({ linkId: link.id, ip, userAgent }));
    }
  }

  return new Response(null, {
    status: 302,
    headers: { Location: link.targetUrl, 'Cache-Control': 'private, no-store' },
  });
}

export function GET(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx, false);
}

export function HEAD(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx, true);
}
