import type { Config } from '@netlify/functions';

const ALLOWED_EVENTS = new Set([
  'page_view','cta_click','package_card_click','comparison_package_click',
  'comparison_guest_count_change','quote_package_select','estimate_configured',
  'event_details_started','security_complete','submit_attempt',
  'quote_submit_success','quote_submit_error','quote_abandon'
]);
const ALLOWED_PACKAGES = new Set(['mobile-oahu','mobile-maui','mobile-big-island','mobile-custom']);

function clean(value: unknown, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

function ingestSecret() {
  const dedicated = clean(Netlify.env.get('KOA_MOBILE_BAR_INGEST_SECRET'), 300);
  if (dedicated) return dedicated;
  const turnstile = clean(Netlify.env.get('TURNSTILE_SECRET_KEY'), 300);
  return turnstile ? 'koa-mobile-bar-ingest-v1:' + turnstile : '';
}

function base64Url(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function signedHeaders(req: Request, context: any) {
  const secret = ingestSecret();
  if (!secret) throw new Error('INGEST_SECRET_NOT_CONFIGURED');
  const ip = clean(
    context?.ip ||
      req.headers.get('x-nf-client-connection-ip') ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      '',
    120,
  ).toLowerCase();
  const fingerprint = (await hmac(secret, 'network|' + ip)).slice(0, 24);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmac(secret, 'v1|' + timestamp + '|' + fingerprint + '|koa-mobile-bar-analytics');
  return {
    'X-Koa-Mobile-Source': fingerprint,
    'X-Koa-Mobile-Timestamp': timestamp,
    'X-Koa-Mobile-Signature': signature,
  };
}

function sameOriginAllowed(req: Request) {
  const origin = req.headers.get('origin') || '';
  if (!origin) return true;
  return new Set([
    new URL(req.url).origin,
    'https://koasmobilebar.com',
    'https://www.koasmobilebar.com',
  ]).has(origin);
}

export default async (req: Request, context: any) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!sameOriginAllowed(req)) {
    return Response.json({ error: 'Cross-site analytics capture is not allowed.' }, { status: 403 });
  }

  const raw = await req.text();
  if (raw.length > 8_000) {
    return Response.json({ error: 'Analytics event is too large.' }, { status: 413 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid analytics event.' }, { status: 400 });
  }

  const type = clean(body?.type, 64);
  const sessionId = clean(body?.sessionId, 100);
  if (!ALLOWED_EVENTS.has(type) || !/^[a-zA-Z0-9-]{12,100}$/.test(sessionId)) {
    return Response.json({ error: 'Invalid analytics event.' }, { status: 400 });
  }

  const packageValue = clean(body?.packageId, 80);
  const packageId = ALLOWED_PACKAGES.has(packageValue) ? packageValue : '';
  const guestCount = Number(body?.guestCount);
  const estimatedTotal = Number(body?.estimatedTotal);

  const payload = {
    eventId: clean(body?.eventId, 100),
    sessionId,
    type,
    page: clean(body?.page, 180),
    referrerHost: clean(body?.referrerHost, 180),
    stage: clean(body?.stage, 64),
    packageId,
    placement: clean(body?.placement, 80),
    guestCount: Number.isFinite(guestCount) ? Math.max(0, Math.min(1000, Math.round(guestCount))) : 0,
    estimatedTotal: Number.isFinite(estimatedTotal)
      ? Math.max(0, Math.min(1_000_000, Math.round(estimatedTotal * 100) / 100))
      : 0,
    recordId: clean(body?.recordId, 100),
    clientAt: clean(body?.clientAt, 60),
  };

  const forward = async () => {
    const headers = await signedHeaders(req, context);
    const response = await fetch('https://www.koasevents.com/api/crm/mobile-bar-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) console.error('Mobile Bar analytics ingest rejected', response.status);
  };

  context.waitUntil(
    forward().catch((error: unknown) => console.error('Mobile Bar analytics forward failed', error)),
  );

  return Response.json(
    { ok: true },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  );
};

export const config: Config = {
  path: '/api/mobile-bar-analytics',
  rateLimit: {
    windowLimit: 90,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};
