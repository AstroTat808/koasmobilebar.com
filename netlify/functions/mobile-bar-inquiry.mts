import type { Config } from '@netlify/functions';

const PACKAGE_PRICES = {
  'mobile-oahu': 1500,
  'mobile-maui': 2000,
  'mobile-big-island': 2500,
  'mobile-custom': 0
};

const PACKAGE_NAMES = {
  'mobile-oahu': 'Oahu Package',
  'mobile-maui': 'Maui Package',
  'mobile-big-island': 'Big Island Package',
  'mobile-custom': 'Custom / bartender-only'
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function calculateQuote(packageId, inquiry = {}) {
  const base = PACKAGE_PRICES[packageId];
  if (base === undefined) throw new Error('Invalid package');

  const guests = Math.round(clampNumber(inquiry.guestCount, 1, 1000, 100));
  const hours = clampNumber(inquiry.serviceHours, 1, 16, 4);
  const bartenders = Math.round(clampNumber(inquiry.bartenderCount, 1, 10, 1));
  const oneWayMiles = clampNumber(inquiry.oneWayMiles, 0, 500, 0);
  const glassware = Math.round(clampNumber(inquiry.glasswareCount, 0, 2000, 0));
  const gratuityMode = ['later','tipjar-10','nojar-25'].includes(inquiry.gratuityMode) ? inquiry.gratuityMode : 'later';

  const extraGuests = Math.max(0, guests - 100) * 8;
  const extraHours = Math.max(0, hours - 4) * 200;
  const labor = hours * bartenders * 40;
  const travel = Math.max(0, oneWayMiles - 20) * 2 * 1.5;
  const gratuityRate = gratuityMode === 'tipjar-10' ? .10 : gratuityMode === 'nojar-25' ? .25 : 0;
  const gratuity = labor * gratuityRate;
  const glasswareTotal = glassware * 1.5;
  const toast = inquiry.champagneToast ? 70 : 0;

  const lines = [
    { id:'package', description:PACKAGE_NAMES[packageId], quantity:1, unitPrice:base, amount:base, custom:packageId === 'mobile-custom' },
    ...(extraGuests ? [{ id:'extra-guests', description:'Additional guests over 100', quantity:Math.max(0, guests-100), unitPrice:8, amount:extraGuests, custom:false }] : []),
    ...(extraHours ? [{ id:'extra-hours', description:'Additional service hours over 4', quantity:Math.max(0, hours-4), unitPrice:200, amount:extraHours, custom:false }] : []),
    { id:'bartender-labor', description:'Bartender labor', quantity:bartenders, unitPrice:hours*40, amount:labor, custom:false },
    ...(travel ? [{ id:'travel', description:'Travel beyond 20-mile included radius (round trip)', quantity:Math.max(0,(oneWayMiles-20)*2), unitPrice:1.5, amount:travel, custom:false }] : []),
    ...(gratuity ? [{ id:'gratuity', description:gratuityMode === 'tipjar-10' ? 'Bartender gratuity (10% + tip jar)' : 'Bartender gratuity (25% + no tip jar)', quantity:1, unitPrice:gratuity, amount:gratuity, custom:false }] : []),
    ...(glassware ? [{ id:'glassware', description:'Glassware', quantity:glassware, unitPrice:1.5, amount:glasswareTotal, custom:false }] : []),
    ...(toast ? [{ id:'champagne-toast', description:'Champagne Toast', quantity:1, unitPrice:70, amount:70, custom:false }] : [])
  ];

  return {
    guests, hours, bartenders, oneWayMiles, glassware, gratuityMode,
    lines,
    total: Math.round(lines.reduce((sum, line) => sum + Number(line.amount || 0), 0) * 100) / 100
  };
}

function allowedHostname(hostname) {
  const configured = Netlify.env.get('TURNSTILE_ALLOWED_HOSTNAMES');
  const allowed = (configured || 'koasmobilebar.com,www.koasmobilebar.com')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  const host = String(hostname || '').toLowerCase();
  return allowed.some(rule => rule.startsWith('.') ? host.endsWith(rule) : host === rule);
}

function ingestSecret() {
  const dedicated = String(Netlify.env.get('KOA_MOBILE_BAR_INGEST_SECRET') || '').trim();
  if (dedicated) return dedicated;

  const turnstile = String(Netlify.env.get('TURNSTILE_SECRET_KEY') || '').trim();
  return turnstile ? `koa-mobile-bar-ingest-v1:${turnstile}` : '';
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

async function signedSourceHeaders(req, context) {
  const secret = ingestSecret();
  if (!secret) throw new Error('INGEST_SECRET_NOT_CONFIGURED');

  const ip = String(
    context?.ip ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    ''
  ).trim();

  const fingerprint = (await hmac(secret, 'network|' + ip.toLowerCase())).slice(0, 24);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmac(secret, 'v1|' + timestamp + '|' + fingerprint + '|koa-mobile-bar-inquiry');

  return {
    'X-Koa-Mobile-Source': fingerprint,
    'X-Koa-Mobile-Timestamp': timestamp,
    'X-Koa-Mobile-Signature': signature
  };
}

async function verifyTurnstile(token, remoteIp) {
  const secret = Netlify.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) throw new Error('TURNSTILE_NOT_CONFIGURED');

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) throw new Error('TURNSTILE_VERIFY_UNAVAILABLE');
  return response.json();
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const origin = req.headers.get('origin') || '';
  if (origin) {
    const requestOrigin = new URL(req.url).origin;
    const allowedOrigins = new Set([
      requestOrigin,
      'https://koasmobilebar.com',
      'https://www.koasmobilebar.com',
    ]);
    if (!allowedOrigins.has(origin)) {
      return Response.json({ error: 'Cross-site inquiry submission is not allowed.' }, { status: 403 });
    }
  }

  const rawBody = await req.text();
  if (rawBody.length > 60_000) {
    return Response.json({ error: 'Inquiry is too large.' }, { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (body.honeypot) {
    return Response.json({ ok: true }, { status: 200 });
  }

  if (!body.turnstileToken) {
    return Response.json({ error: 'Security verification is required.' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyTurnstile(body.turnstileToken, context?.ip);
  } catch (error) {
    const configurationError = error instanceof Error && error.message === 'TURNSTILE_NOT_CONFIGURED';
    return Response.json(
      { error: configurationError ? 'Security verification is not configured.' : 'Security verification is temporarily unavailable.' },
      { status: configurationError ? 503 : 502 }
    );
  }

  if (!verification.success ||
      verification.action !== 'mobile_bar_inquiry' ||
      !allowedHostname(verification.hostname)) {
    return Response.json({ error: 'Security verification failed. Please try again.' }, { status: 403 });
  }

  const packageId = String(body.packageId || '');
  let quote;
  try {
    quote = calculateQuote(packageId, body.inquiry || {});
  } catch {
    return Response.json({ error: 'Choose a valid Mobile Bar package.' }, { status: 400 });
  }

  const customer = body.customer || {};
  const inquiry = body.inquiry || {};
  if (!customer.name || !customer.email || !customer.phone || !customer.eventDate || !inquiry.eventLocation || !inquiry.eventType) {
    return Response.json({ error: 'Complete all required inquiry fields.' }, { status: 400 });
  }

  const crmPayload = {
    formName: 'koa-mobile-bar-inquiry',
    honeypot: '',
    packageId,
    customer: {
      name: String(customer.name).slice(0, 160),
      email: String(customer.email).slice(0, 254),
      phone: String(customer.phone).slice(0, 80),
      eventDate: String(customer.eventDate).slice(0, 32),
      notes: String(customer.notes || '').slice(0, 5000)
    },
    inquiry: {
      service: 'mobile-bar',
      eventType: String(inquiry.eventType).slice(0, 120),
      guestCount: quote.guests,
      budget: String(inquiry.budget || '').slice(0, 120),
      mobileBarPackage: packageId,
      eventLocation: String(inquiry.eventLocation).slice(0, 300),
      priorities: String(inquiry.priorities || '').slice(0, 5000),
      source: String(inquiry.source || '').slice(0, 200),
      referralSource: String(inquiry.referralSource || '').slice(0, 200),
      alternativeDate: String(inquiry.alternativeDate || '').slice(0, 32),
      contactMethod: String(inquiry.contactMethod || '').slice(0, 80),
      serviceHours: quote.hours,
      oneWayMiles: quote.oneWayMiles,
      bartenderCount: quote.bartenders,
      gratuityMode: quote.gratuityMode,
      glasswareCount: quote.glassware,
      estimatedTotal: quote.total,
      estimateLineItems: quote.lines,
      customAddOns: Array.isArray(inquiry.customAddOns) ? inquiry.customAddOns.slice(0, 20).map(value => String(value).slice(0, 120)) : [],
      calculatorVersion: 'mobile-bar-v1'
    }
  };

  let sourceHeaders;
  try {
    sourceHeaders = await signedSourceHeaders(req, context);
  } catch {
    return Response.json({ error: 'Secure inquiry routing is temporarily unavailable.' }, { status: 503 });
  }

  const crmResponse = await fetch('https://www.koasevents.com/api/crm/inquiries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Koa-Inquiry-Capture': '1',
      ...sourceHeaders
    },
    body: JSON.stringify(crmPayload),
    signal: AbortSignal.timeout(12_000)
  });

  const crmResult = await crmResponse.json().catch(() => ({}));
  if (!crmResponse.ok || !crmResult.id) {
    console.error('Koa Events CRM rejected Mobile Bar inquiry', crmResponse.status);
    return Response.json({ error: 'Your inquiry could not be saved. Please try again.' }, { status: 502 });
  }

  return Response.json({
    ok: true,
    id: crmResult.id,
    deduplicated: Boolean(crmResult.deduplicated),
    notificationConfigured: Boolean(crmResult.notificationConfigured),
  });
};

export const config: Config = {
  path: '/api/mobile-bar-inquiry',
  rateLimit: {
    windowLimit: 8,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};
