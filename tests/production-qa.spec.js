const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.turnstile={render:()=>1,reset:()=>{}};'
  }));
});

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
  await page.route('**/api/turnstile-config', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error:'test' }) }));
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
  await expect(form.locator('[data-estimate-total]')).toHaveText('Select a package');
  await form.locator('select[name="package"]').selectOption('mobile-big-island');
  await expect(form.locator('[data-estimate-total]')).toContainText('$');

  const active = page.locator('.package.is-selected');
  await expect(active).toHaveCount(1);
});


test('inquiry requires Turnstile before submit', async ({ page }) => {
  await page.route('**/api/turnstile-config', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error:'test' }) }));
  await page.goto('/', { waitUntil: 'networkidle' });
  const form = page.locator('[data-mobile-quote-form]');
  await expect(form.locator('[data-turnstile]')).toBeVisible();
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await expect(form.locator('[data-crm-status]')).toContainText(/verification/i);
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

test('package cards are directly selectable and sync with calculator', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const form=page.locator('[data-mobile-quote-form]');
  const select=form.locator('select[name="package"]');
  await expect(select).toHaveValue('');
  await expect(page.locator('.package.is-selected')).toHaveCount(0);

  const cardIds = await page.locator('.package-grid .package[data-package-id]').evaluateAll(nodes => nodes.map(node => node.dataset.packageId));
  expect(cardIds).toEqual(['mobile-big-island','mobile-maui','mobile-oahu']);
  await expect(page.locator('.package.featured')).toHaveAttribute('data-package-id','mobile-big-island');
  await expect(select.locator('option[value="mobile-big-island"]')).toHaveText('Big Island Package — $2,500');
  await expect(select.locator('option[value="mobile-maui"]')).toHaveText('Maui Package — $2,000');
  await expect(select.locator('option[value="mobile-oahu"]')).toHaveText('Oahu Package — $1,500');

  for (const id of ['mobile-big-island','mobile-maui','mobile-oahu']) {
    await page.locator('[data-package-id="' + id + '"]').click();
    await expect(select).toHaveValue(id);
    await expect(page.locator('.package.is-selected')).toHaveCount(1);
    await expect(page.locator('[data-package-id="' + id + '"]')).toHaveClass(/is-selected/);
    await expect(page.locator('[data-package-id="' + id + '"] .package-request')).toHaveAttribute('aria-pressed','true');
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


test('mobile quote layout stays stacked and inside the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only responsive audit');

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const inquiry = page.locator('#inquire');
    await inquiry.scrollIntoViewIfNeeded();

    const metrics = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const copy = document.querySelector('#inquire .inquiry-copy').getBoundingClientRect();
      const form = document.querySelector('#inquire form').getBoundingClientRect();
      const calculator = document.querySelector('#inquire .quote-calculator').getBoundingClientRect();
      const brand = document.querySelector('.site-header .brand').getBoundingClientRect();
      const menu = document.querySelector('.site-header .menu').getBoundingClientRect();

      const candidates = [...document.querySelectorAll(
        '#inquire h2,#inquire h3,#inquire p,#inquire a,#inquire button,#inquire input,#inquire select,#inquire textarea,#inquire label,#inquire form,#inquire .quote-calculator,#inquire .estimate-panel'
      )];

      const clipped = candidates.flatMap(el => {
        if (el.closest('.hidden')) return [];
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width < 1 || rect.height < 1) return [];
        if (rect.left < -2 || rect.right > viewportWidth + 2) {
          return [{
            element: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().replace(/\s+/g, '.') : ''),
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            viewportWidth
          }];
        }
        return [];
      });

      return {
        copyLeft: copy.left,
        copyBottom: copy.bottom,
        formLeft: form.left,
        formTop: form.top,
        formRight: form.right,
        calculatorRight: calculator.right,
        brandRight: brand.right,
        menuLeft: menu.left,
        menuRight: menu.right,
        viewportWidth,
        clipped
      };
    });

    expect(metrics.formTop, 'quote form should stack below intro at ' + width + 'px').toBeGreaterThan(metrics.copyBottom + 12);
    expect(Math.abs(metrics.formLeft - metrics.copyLeft), 'stacked columns align at ' + width + 'px').toBeLessThanOrEqual(2);
    expect(metrics.formRight, 'form fits viewport at ' + width + 'px').toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.calculatorRight, 'calculator fits viewport at ' + width + 'px').toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.brandRight, 'brand must not collide with menu at ' + width + 'px').toBeLessThanOrEqual(metrics.menuLeft - 4);
    expect(metrics.menuRight, 'menu fits viewport at ' + width + 'px').toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.clipped, 'no clipped inquiry content at ' + width + 'px').toEqual([]);
  }
});


test('site-wide mobile visual audit at 320, 390 and 430', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only site audit');
  test.setTimeout(120000);

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });

    for (const path of pages) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const audit = await page.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const visible = el => {
          if (el.closest('.hidden') || el.closest('[hidden]')) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
        };

        const content = [...document.querySelectorAll('main h1,main h2,main h3,main p,main a,main button,main input,main select,main textarea,main label,main summary,main article,main figure,main form,footer a,footer p')].filter(visible);
        const clipped = content.flatMap(el => {
          const intentionalScroller = el.closest('.filters');
          if (intentionalScroller) {
            const scrollerStyle = getComputedStyle(intentionalScroller);
            const horizontallyScrollable = /auto|scroll/.test(scrollerStyle.overflowX) && intentionalScroller.scrollWidth > intentionalScroller.clientWidth;
            if (horizontallyScrollable) return [];
          }
          const rect = el.getBoundingClientRect();
          if (rect.left < -2 || rect.right > viewportWidth + 2) {
            return [{
              tag: el.tagName.toLowerCase(),
              className: String(el.className || ''),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              viewportWidth
            }];
          }
          return [];
        });

        const touchSelectors = '.menu,.btn,.filter-btn,.package-request,input:not([type="checkbox"]):not([type="radio"]),select,textarea,.calculator-addons label';
        const smallTargets = [...document.querySelectorAll(touchSelectors)].filter(visible).flatMap(el => {
          const rect = el.getBoundingClientRect();
          if (rect.height < 42 || rect.width < 42) {
            return [{
              tag: el.tagName.toLowerCase(),
              className: String(el.className || ''),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }];
          }
          return [];
        });

        const header = document.querySelector('.site-header');
        let headerCollision = null;
        if (header) {
          const brand = header.querySelector('.brand');
          const menu = header.querySelector('.menu');
          if (brand && menu && visible(brand) && visible(menu)) {
            const b = brand.getBoundingClientRect();
            const m = menu.getBoundingClientRect();
            if (b.right > m.left - 4) headerCollision = { brandRight: Math.round(b.right), menuLeft: Math.round(m.left) };
          }
        }

        return { clipped, smallTargets, headerCollision };
      });

      expect(audit.clipped, path + ' clipped content at ' + width + 'px').toEqual([]);
      expect(audit.smallTargets, path + ' undersized primary controls at ' + width + 'px').toEqual([]);
      expect(audit.headerCollision, path + ' header collision at ' + width + 'px').toBeNull();
    }
  }
});

test('mobile live estimate stays synchronized with full estimate', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only quote interaction');
  await page.goto('/', { waitUntil: 'networkidle' });
  const form=page.locator('[data-mobile-quote-form]');
  await expect(form.locator('[data-mobile-estimate-total]')).toHaveText('Select a package');
  await form.locator('select[name="package"]').selectOption('mobile-maui');
  await expect(form.locator('[data-mobile-estimate-total]')).toHaveText(await form.locator('[data-estimate-total]').innerText());
  await form.locator('input[name="guest-count"]').fill('125');
  await expect(form.locator('[data-mobile-estimate-total]')).toHaveText(await form.locator('[data-estimate-total]').innerText());
  await expect(form.locator('.mobile-estimate-dock')).toHaveClass(/has-package/);
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
  const baselineVersion = 'v2.7';
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
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}[data-turnstile]{display:none!important}' });
    await page.evaluate(() => {
      const form=document.querySelector('[data-mobile-quote-form]');
      if(!form)return;
      const submit=form.querySelector('button[type="submit"]');
      if(submit)submit.disabled=false;
      const status=form.querySelector('[data-crm-status]');
      if(status){status.textContent='Submitting creates a Mobile Bar inquiry in the Koa\'s Events CRM and does not reserve your date.';delete status.dataset.state;}
      form.querySelectorAll('.is-updated').forEach(el=>el.classList.remove('is-updated'));
      form.querySelectorAll('.quote-calculator').forEach(el=>{el.scrollLeft=0;});
      if(document.scrollingElement)document.scrollingElement.scrollLeft=0;
      document.documentElement.scrollLeft=0;
      document.body.scrollLeft=0;
      window.scrollTo({left:0,top:window.scrollY,behavior:'instant'});
    });
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
