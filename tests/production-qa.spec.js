const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const pages = [
  '/',
  '/services/',
  '/birthdays/',
  '/corporate-events/',
  '/graduations/',
  '/private-parties/',
  '/weddings/',
  '/bartender-service/',
  '/gallery/',
  '/service-areas/',
  '/service-areas/hilo/',
  '/service-areas/kona/',
  '/service-areas/waimea/',
  '/service-areas/puna/',
  '/privacy.html',
  '/terms.html',
  '/thank-you.html'
];

for (const path of pages) {
  test(path + ' renders without layout or console failures', async ({ page, request }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    const response = await page.goto(path, { waitUntil: 'networkidle' });
    expect(response, 'page response').not.toBeNull();
    expect(response.status(), 'HTTP status').toBeLessThan(400);

    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'no horizontal overflow').toBeTruthy();

    const h1 = page.locator('h1').first();
    if (await h1.count()) await expect(h1).toBeVisible();

    if (!path.includes('privacy') && !path.includes('terms') && !path.includes('thank-you')) {
      await expect(page.locator('.site-header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    }

    expect(errors.filter(e => !/favicon|Failed to load resource.*404/i.test(e)), 'console/page errors').toEqual([]);
  });
}

test('homepage metadata, favicon package and quote calculator', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://koasmobilebar.com/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /mobile bar/i);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /mobile-bar-hero/i);

  for (const asset of ['/koa-mobile-bar-icon.png','/site.webmanifest']) {
    const r = await request.get(asset);
    expect(r.status(), asset).toBeLessThan(400);
  }
  const faviconConfig = require('fs').readFileSync('netlify.toml','utf8');
  for (const asset of ['/favicon-16x16.png','/favicon-32x32.png','/favicon-48x48.png','/apple-touch-icon.png','/favicon-192x192.png','/favicon-512x512.png']) {
    expect(faviconConfig, asset + ' Netlify route').toContain('from = "' + asset + '"');
  }

  const form = page.locator('[data-mobile-quote-form]');
  await expect(form).toBeVisible();
  await expect(form.locator('[data-estimate-total]')).toContainText('$');
  await form.locator('select[name="package"]').selectOption('mobile-big-island');
  await expect(form.locator('[data-estimate-total]')).not.toContainText('$0');

  const active = page.locator('.package.is-selected');
  await expect(active).toHaveCount(1);
});

test('internal links return non-error responses', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('a[href]').evaluateAll(nodes => [...new Set(nodes.map(a => a.getAttribute('href')).filter(Boolean))]);
  const base = process.env.BASE_URL || 'https://koasmobilebar.com';
  const baseOrigin = new URL(base).origin;
  for (const href of hrefs) {
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const url = new URL(href, base);
    if (url.origin !== baseOrigin) continue;
    const r = await request.get(url.href);
    expect(r.status(), href).toBeLessThan(400);
  }
});

test('homepage accessibility has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(v => ['serious','critical'].includes(v.impact));
  expect(blocking).toEqual([]);
});

test('mobile navigation opens, closes and remains usable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only interaction');
  await page.goto('/', { waitUntil: 'networkidle' });
  const menu = page.locator('.menu');
  await menu.click();
  await expect(page.locator('#nav')).toHaveClass(/open/);
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav')).not.toHaveClass(/open/);
});

test('visual reference screenshots', async ({ page }, testInfo) => {
  for (const path of pages) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: 'qa-artifacts/' + testInfo.project.name + '-' + path.replace(/\W+/g,'-').replace(/^-|-$/g,'') + '.png',
      fullPage: true
    });
  }
});


const fs = require('fs');
const visualBaselineDir = 'tests/production-qa.spec.js-snapshots';

test.describe('visual regression @visual', () => {
  const baselineVersion = 'v2';
  const baselineMarker = visualBaselineDir + '/.baseline-version';
  const approved = fs.existsSync(visualBaselineDir) && fs.existsSync(baselineMarker) && fs.readFileSync(baselineMarker,'utf8').trim() === baselineVersion;
  test.skip(!approved && process.env.BOOTSTRAP_VISUAL !== '1', 'Approved visual baselines have not been bootstrapped for ' + baselineVersion + '.');

  const visualPages = [
    ['home','/'],
    ['services','/services/'],
    ['birthdays','/birthdays/'],
    ['corporate-events','/corporate-events/'],
    ['graduations','/graduations/'],
    ['private-parties','/private-parties/'],
    ['weddings','/weddings/'],
    ['bartender-service','/bartender-service/'],
    ['gallery','/gallery/'],
    ['service-areas','/service-areas/'],
    ['service-area-hilo','/service-areas/hilo/'],
    ['service-area-kona','/service-areas/kona/'],
    ['service-area-waimea','/service-areas/waimea/'],
    ['service-area-puna','/service-areas/puna/'],
    ['privacy','/privacy.html'],
    ['terms','/terms.html'],
    ['thank-you','/thank-you.html']
  ];

  async function stabilize(page) {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  }

  for (const [name,path] of visualPages) {
    test(name + ' approved baseline', async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await stabilize(page);
      await expect(page).toHaveScreenshot(name + '.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.005
      });
    });
  }

  for (const packageId of ['mobile-oahu','mobile-maui','mobile-big-island']) {
    test('package selection ' + packageId + ' baseline', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.locator('[data-package-id="' + packageId + '"]').click();
      await stabilize(page);
      await expect(page.locator('#packages')).toHaveScreenshot('package-' + packageId + '.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.005
      });
    });
  }

  test('calculator configured baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const form=page.locator('[data-mobile-quote-form]');
    await form.locator('select[name="package"]').selectOption('mobile-big-island');
    await form.locator('input[name="guest-count"]').fill('150');
    await form.locator('input[name="service-hours"]').fill('6');
    await form.locator('input[name="bartender-count"]').fill('2');
    await form.locator('input[name="one-way-miles"]').fill('42');
    await form.locator('select[name="gratuity"]').selectOption('nojar-25');
    await form.locator('input[name="glassware-count"]').fill('100');
    await form.locator('input[name="addon-champagne-toast"]').check();
    await form.locator('input[name="addon-custom"][value="Champagne Tower Wall"]').check();
    await stabilize(page);
    await expect(form.locator('.quote-calculator')).toHaveScreenshot('calculator-configured.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('partially completed inquiry form baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const form=page.locator('[data-mobile-quote-form]');
    await form.locator('select[name="package"]').selectOption('mobile-oahu');
    await form.locator('input[name="first-name"]').fill('Sample');
    await form.locator('input[name="last-name"]').fill('Customer');
    await form.locator('input[name="email"]').fill('sample@example.com');
    await form.locator('input[name="phone"]').fill('808-555-0100');
    await form.locator('input[name="event-location"]').fill('Hilo, Hawaiʻi');
    await form.locator('select[name="event-type"]').selectOption({ label:'Birthday' });
    await form.locator('textarea[name="details"]').fill('Tropical birthday celebration with a simple beer and wine menu.');
    await stabilize(page);
    await expect(form).toHaveScreenshot('inquiry-form-partial.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('open FAQ baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#faq details').first().locator('summary').click();
    await stabilize(page);
    await expect(page.locator('#faq')).toHaveScreenshot('faq-open.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('gallery lightbox baseline', async ({ page }) => {
    await page.goto('/gallery/', { waitUntil: 'networkidle' });
    await page.locator('[data-lightbox]').first().click();
    await expect(page.locator('#lightbox')).toHaveClass(/open/);
    await stabilize(page);
    await expect(page.locator('#lightbox')).toHaveScreenshot('gallery-lightbox.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('gallery category filter baseline', async ({ page }) => {
    await page.goto('/gallery/', { waitUntil: 'networkidle' });
    await page.locator('.filter-btn[data-filter="actual"]').click();
    await stabilize(page);
    await expect(page.locator('.gallery-page')).toHaveScreenshot('gallery-filter-mobile-bar.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('mobile navigation open baseline', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only visual state');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.menu').click();
    await stabilize(page);
    await expect(page.locator('.site-header')).toHaveScreenshot('mobile-menu-open.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });
});
