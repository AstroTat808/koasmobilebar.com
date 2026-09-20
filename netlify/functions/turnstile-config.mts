export default async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const siteKey = Netlify.env.get('TURNSTILE_SITE_KEY') || Netlify.env.get('PUBLIC_TURNSTILE_SITE_KEY');
  if (!siteKey) {
    return Response.json({ error: 'Turnstile is not configured' }, { status: 503 });
  }

  return Response.json({
    siteKey,
    action: 'mobile_bar_inquiry',
    crmHandoffConfigured: Boolean(
      String(Netlify.env.get('KOA_MOBILE_BAR_INGEST_SECRET') || '').trim() ||
      String(Netlify.env.get('TURNSTILE_SECRET_KEY') || '').trim()
    )
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
};

export const config = {
  path: '/api/turnstile-config'
};
