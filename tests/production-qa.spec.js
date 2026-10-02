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
  '/blog/',
  '/blog/how-many-bartenders-wedding-big-island/',
  '/blog/wedding-bar-shopping-list-hawaii/',
  '/blog/mobile-bar-big-island-wedding-venue/',
  '/blog/bartender-only-vs-mobile-bar-big-island/',
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

test('blog cards keep readable copy separate from photography', async ({ page }) => {
  await page.goto('/blog/', { waitUntil: 'networkidle' });
  const cards = page.locator('.blog-card');
  await expect(cards).toHaveCount(4);

  for (const card of await cards.all()) {
    const image = card.locator('img');
    const copy = card.locator('.blog-card-copy');
    await expect(image).toBeVisible();
    await expect(copy).toBeVisible();

    const [imageBox, copyBox] = await Promise.all([image.boundingBox(), copy.boundingBox()]);
    expect(imageBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(copyBox.y, 'copy begins at or below image bottom').toBeGreaterThanOrEqual(imageBox.y + imageBox.height - 1);

    const styles = await copy.evaluate(el => {
      const s = getComputedStyle(el);
      return { backgroundColor: s.backgroundColor, color: s.color };
    });
    expect(styles.backgroundColor, 'copy panel has an opaque background').not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.color, 'copy panel text is light').toMatch(/rgb\((?:24[0-9]|25[0-5]),\s*(?:24[0-9]|25[0-5]),\s*(?:24[0-9]|25[0-5])\)/);
  }
});

test('Planning Guides hub exposes premium editorial metadata', async ({ page }) => {
  await page.goto('/blog/', { waitUntil: 'networkidle' });
  await expect(page.locator('.featured-guide')).toHaveCount(1);
  await expect(page.locator('.featured-guide .blog-read-time')).toContainText('min read');
  await expect(page.locator('.blog-grid .blog-card')).toHaveCount(4);
  await expect(page.locator('.blog-grid .blog-read-time')).toHaveCount(4);
  await expect(page.locator('.blog-grid .blog-topic')).toHaveCount(4);
});

const planningGuideArticles = [
  '/blog/how-many-bartenders-wedding-big-island/',
  '/blog/wedding-bar-shopping-list-hawaii/',
  '/blog/mobile-bar-big-island-wedding-venue/',
  '/blog/bartender-only-vs-mobile-bar-big-island/'
];

for (const path of planningGuideArticles) {
  test(path + ' preserves readable article typography', async ({ page }, testInfo) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('.article-body')).toBeVisible();
    await expect(page.locator('.article-meta')).toContainText('min read');

    const metrics = await page.evaluate(() => {
      const body = document.querySelector('.article-body');
      const heading = document.querySelector('.article-hero h1');
      const bodyStyle = getComputedStyle(body);
      const headingStyle = getComputedStyle(heading);
      return {
        bodyFontSize: parseFloat(bodyStyle.fontSize),
        bodyLineHeight: parseFloat(bodyStyle.lineHeight),
        headingFontSize: parseFloat(headingStyle.fontSize),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      };
    });

    expect(metrics.bodyFontSize, 'article body remains legible').toBeGreaterThanOrEqual(16);
    expect(metrics.bodyLineHeight / metrics.bodyFontSize, 'article line height remains comfortable').toBeGreaterThanOrEqual(1.65);
    expect(metrics.scrollWidth, 'article does not overflow horizontally').toBeLessThanOrEqual(metrics.viewportWidth + 2);
    if (testInfo.project.name.startsWith('mobile-')) {
      expect(metrics.headingFontSize, 'mobile article headline stays compact').toBeLessThanOrEqual(54);
    }
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

test('package cards keep a shared baseline, equal height and internal rhythm', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const cards = page.locator('.package-grid > .package');
  await expect(cards).toHaveCount(3);
  const viewportWidth = await page.evaluate(() => window.innerWidth);

  const readGeometry = () => cards.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const tag = node.querySelector('.tag')?.getBoundingClientRect();
    const price = node.querySelector('.price')?.getBoundingClientRect();
    const title = node.querySelector('h3')?.getBoundingClientRect();
    const list = node.querySelector('ul')?.getBoundingClientRect();
    const cta = node.querySelector('.package-request')?.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      width: rect.width,
      transform: style.transform,
      backgroundImage: style.backgroundImage,
      borderTopColor: style.borderTopColor,
      tagTop: tag?.top,
      priceTop: price?.top,
      titleTop: title?.top,
      listTop: list?.top,
      upgradeTop: node.querySelector('.package-upgrade')?.getBoundingClientRect().top,
      upgradeBottom: node.querySelector('.package-upgrade')?.getBoundingClientRect().bottom,
      ctaBottom: cta?.bottom
    };
  }));

  const expectDesktopAlignment = metrics => {
    const delta = key => Math.max(...metrics.map(x => x[key])) - Math.min(...metrics.map(x => x[key]));
    expect(delta('top'), 'desktop cards share the same top baseline').toBeLessThanOrEqual(1);
    expect(delta('height'), 'desktop cards stay exactly equal in height').toBeLessThanOrEqual(1);
    expect(delta('bottom'), 'desktop cards share the same bottom baseline').toBeLessThanOrEqual(1);
    expect(delta('tagTop'), 'package labels align').toBeLessThanOrEqual(1);
    expect(delta('priceTop'), 'package prices align').toBeLessThanOrEqual(1);
    expect(delta('titleTop'), 'package titles align').toBeLessThanOrEqual(1);
    expect(delta('upgradeTop'), 'package comparison callouts align').toBeLessThanOrEqual(1);
    expect(delta('upgradeBottom'), 'package comparison callouts keep equal height').toBeLessThanOrEqual(1);
    expect(delta('listTop'), 'package feature lists align').toBeLessThanOrEqual(1);
    expect(delta('ctaBottom'), 'package request buttons align').toBeLessThanOrEqual(1);
    for (const metric of metrics) expect(metric.transform, 'desktop package card has no persistent transform').toBe('none');
  };

  let metrics = await readGeometry();

  if (viewportWidth > 900) {
    expectDesktopAlignment(metrics);

    const select = page.locator('[data-mobile-quote-form] select[name="package"]');
    for (const packageId of ['mobile-big-island','mobile-maui','mobile-oahu']) {
      await select.selectOption(packageId);
      metrics = await readGeometry();
      expectDesktopAlignment(metrics);
    }

    for (let i = 0; i < 3; i += 1) {
      await cards.nth(i).hover();
      metrics = await readGeometry();
      expectDesktopAlignment(metrics);
    }
    await page.mouse.move(0, 0);
  } else {
    expect(Math.max(...metrics.map(x => x.left)) - Math.min(...metrics.map(x => x.left)), 'stacked cards stay left aligned').toBeLessThanOrEqual(1);
    expect(Math.max(...metrics.map(x => x.width)) - Math.min(...metrics.map(x => x.width)), 'stacked cards keep equal widths').toBeLessThanOrEqual(1);
    for (const metric of metrics) expect(metric.transform, 'stacked package card has no persistent transform').toBe('none');
  }

  expect(metrics[0].backgroundImage, 'featured package keeps a premium visual treatment').not.toBe('none');
  expect(metrics[0].borderTopColor, 'featured package keeps a distinct premium border').not.toBe(metrics[1].borderTopColor);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'package section does not create horizontal overflow').toBeTruthy();
});

test('service event and service-area landing pages share the luxury conversion system', async ({ page }) => {
  const paths=['/services/','/bartender-service/','/birthdays/','/corporate-events/','/graduations/','/private-parties/','/weddings/','/wedding-bartenders/','/service-areas/','/service-areas/hilo/','/service-areas/kona/','/service-areas/puna/','/service-areas/waimea/','/service-areas/hilo/wedding-bartenders/','/service-areas/kona/wedding-bartenders/'];
  for(const path of paths){
    await page.goto(path,{waitUntil:'domcontentloaded'});
    await expect(page.locator('body')).toHaveClass(/luxury-landing/);
    await expect(page.locator('[data-landing-proof]')).toBeVisible();
    await expect(page.locator('[data-landing-proof]')).toContainText('From $1,500');
  }
});

test('comparison guest count updates all package subtotals and calculator guest count', async ({ page }) => {
  await page.goto('/',{waitUntil:'networkidle'});
  const compare=page.locator('[data-compare-guest-count]');
  await expect(compare).toBeVisible();
  await compare.fill('125');
  await expect(page.locator('[data-compare-total="mobile-oahu"]')).toHaveText('$1,750');
  await expect(page.locator('[data-compare-total="mobile-maui"]')).toHaveText('$2,300');
  await expect(page.locator('[data-compare-total="mobile-big-island"]')).toHaveText('$2,875');
  await expect(page.locator('[data-mobile-quote-form] input[name="guest-count"]')).toHaveValue('125');
});

test('conversion events distinguish package-card and comparison interactions', async ({ page }) => {
  const events=[];
  await page.route('**/api/mobile-bar-analytics',async route=>{
    if(route.request().method()==='POST'){
      const body=route.request().postData();
      if(body) events.push(JSON.parse(body));
    }
    await route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'});
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-package-id="mobile-maui"] .package-request').click();
  await page.locator('[data-select-package="mobile-oahu"]').click();
  await page.locator('[data-compare-guest-count]').fill('125');
  await page.waitForTimeout(650);
  const location=page.locator('[data-mobile-quote-form] input[name="event-location"]');
  await location.focus();
  await page.waitForTimeout(100);
  expect(events.some(event=>event.type==='package_card_click'&&event.packageId==='mobile-maui')).toBeTruthy();
  expect(events.some(event=>event.type==='comparison_package_click'&&event.packageId==='mobile-oahu')).toBeTruthy();
  expect(events.some(event=>event.type==='comparison_guest_count_change'&&event.guestCount===125)).toBeTruthy();
  expect(events.some(event=>event.type==='event_details_started')).toBeTruthy();
  expect(events.every(event=>!('email' in event)&&!('phone' in event)&&!('name' in event))).toBeTruthy();
});

test('homepage luxury pass and package comparison are structurally complete', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.locator('body')).toHaveClass(/home/);
  await expect(page.locator('.hero-proof span')).toHaveCount(3);
  await expect(page.locator('.package-recommended')).toContainText('Recommended start');
  await expect(page.locator('[data-package-comparison]')).toBeVisible();
  await expect(page.locator('.package-table tbody tr')).toHaveCount(23);
  await expect(page.locator('.package-table')).toContainText('Additional guests');
  await expect(page.locator('.package-table')).toContainText('$10 / guest');
  await expect(page.locator('.package-table')).toContainText('$12 / guest');
  await expect(page.locator('.package-table')).toContainText('$15 / guest');
  await expect(page.locator('.package-table')).toContainText('Mixed cocktail service');
  await expect(page.locator('.package-table')).toContainText('Planning consultation & alcohol shopping list');
  await expect(page.locator('.package-table')).toContainText('$65 / hour / bartender');
  await expect(page.locator('.faq')).toContainText('$2.00 per mile');
  await expect(page.locator('.faq')).toContainText('$150 long-distance logistics fee');
});

test('pricing conversion handoff and guest guidance stay synchronized', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const form=page.locator('[data-mobile-quote-form]');
  const select=form.locator('select[name="package"]');
  const guidance=form.locator('[data-guest-guidance]');
  const handoff=form.locator('[data-package-handoff]');

  await page.locator('[data-package-id="mobile-maui"] .package-request').click();
  await expect(select).toHaveValue('mobile-maui');
  await expect(handoff).toContainText('Maui Package selected');
  await expect(handoff).toContainText('Recommended start');
  await expect(guidance).toContainText('100 guests are within the 100 guests included');

  await form.locator('input[name="guest-count"]').fill('125');
  await expect(guidance).toContainText('25 guests above the included 100');
  await expect(guidance).toContainText('$300.00');

  await page.locator('[data-select-package="mobile-oahu"]').click();
  await expect(select).toHaveValue('mobile-oahu');
  await expect(handoff).toContainText('Oahu Package selected');
  await expect(guidance).toContainText('$250.00');
});

test('package comparison communicates exactly what each tier adds', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.locator('[data-package-id="mobile-oahu"] [data-package-upgrade="foundation"]')).toContainText('Foundation menu');
  await expect(page.locator('[data-package-id="mobile-oahu"] [data-package-upgrade="foundation"]')).toContainText('Beer · champagne · wine');

  await expect(page.locator('[data-package-id="mobile-maui"] [data-package-upgrade="signature-drinks"]')).toContainText('Adds over Oahu');
  await expect(page.locator('[data-package-id="mobile-maui"] [data-package-upgrade="signature-drinks"]')).toContainText('2 signature drinks');

  await expect(page.locator('[data-package-id="mobile-big-island"] [data-package-upgrade="mixed-cocktails"]')).toContainText('Adds over Maui');
  await expect(page.locator('[data-package-id="mobile-big-island"] [data-package-upgrade="mixed-cocktails"]')).toContainText('Mixed cocktail service');

  const foundation = page.locator('.package-foundation');
  await expect(foundation).toContainText('Included with every package');
  await expect(foundation).toContainText('100');
  await expect(foundation).toContainText('4 hrs');
  await expect(foundation).toContainText('20 mi');

  await expect(page.locator('.package-grid .is-upgrade')).toHaveCount(2);
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

  await form.locator('select[name="package"]').selectOption('mobile-oahu');
  await form.locator('input[name="guest-count"]').fill('110');
  await expect(form.locator('[data-estimate-lines]')).toContainText('Additional guests over 100');
  await expect(form.locator('[data-estimate-lines]')).toContainText('$100');

  await form.locator('select[name="package"]').selectOption('mobile-maui');
  await expect(form.locator('[data-estimate-lines]')).toContainText('$120');

  await form.locator('select[name="package"]').selectOption('mobile-big-island');
  await expect(form.locator('[data-estimate-lines]')).toContainText('$150');
  await form.locator('input[name="addon-soda-station"]').check();
  await expect(form.locator('[data-estimate-lines]')).toContainText('Soda Station');
  await expect(form.locator('[data-estimate-lines]')).toContainText('$440');
  await form.locator('input[name="addon-soda-station"]').uncheck();
  await form.locator('input[name="guest-count"]').fill('100');

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
          const intentionalScroller = el.closest('.filters,.package-table-wrap');
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
  const baselineVersion = 'v3.5';
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

  async function stabilize(page, { isolateComponent=false } = {}) {
    const isolationCss=isolateComponent ? '.site-header{visibility:hidden!important}' : '';
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}[data-turnstile]{display:none!important}' + isolationCss });
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let lastX=window.scrollX,lastY=window.scrollY,stableFrames=0,totalFrames=0;
        const tick=()=>{
          const x=window.scrollX,y=window.scrollY;
          if(Math.abs(x-lastX)<.5 && Math.abs(y-lastY)<.5) stableFrames+=1;
          else stableFrames=0;
          lastX=x;lastY=y;totalFrames+=1;
          if(stableFrames>=8 || totalFrames>=180) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      if(document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
      const form=document.querySelector('[data-mobile-quote-form]');
      if(form){
        const submit=form.querySelector('button[type="submit"]');
        if(submit)submit.disabled=false;
        const status=form.querySelector('[data-crm-status]');
        if(status){status.textContent='Submitting creates a Mobile Bar inquiry in the Koa\'s Events CRM and does not reserve your date.';delete status.dataset.state;}
        form.querySelectorAll('.is-updated').forEach(el=>el.classList.remove('is-updated'));
        form.querySelectorAll('.quote-calculator').forEach(el=>{el.scrollLeft=0;});
      }
      if(document.scrollingElement)document.scrollingElement.scrollLeft=0;
      document.documentElement.scrollLeft=0;
      document.body.scrollLeft=0;
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
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
      await stabilize(page, { isolateComponent:true });
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
    await form.locator('select[name="glassware-type"]').selectOption('premium');
    await form.locator('input[name="addon-champagne-toast"]').check();
    await form.locator('input[name="addon-champagne-tower"]').check();
    await stabilize(page, { isolateComponent:true });
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
    await stabilize(page, { isolateComponent:true });
    await expect(form).toHaveScreenshot('inquiry-form-partial.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('open FAQ baseline', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#faq details').first().locator('summary').click();
    await stabilize(page, { isolateComponent:true });
    await expect(page.locator('#faq')).toHaveScreenshot('faq-open.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('gallery lightbox baseline', async ({ page }) => {
    await page.goto('/gallery/', { waitUntil: 'networkidle' });
    await page.locator('[data-lightbox]').first().click();
    await expect(page.locator('#lightbox')).toHaveClass(/open/);
    await stabilize(page, { isolateComponent:true });
    await expect(page.locator('#lightbox')).toHaveScreenshot('gallery-lightbox.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005
    });
  });

  test('gallery category filter baseline', async ({ page }) => {
    await page.goto('/gallery/', { waitUntil: 'networkidle' });
    await page.locator('.filter-btn[data-filter="actual"]').click();
    await stabilize(page, { isolateComponent:true });
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
