# Koa's Mobile Bar

Premium mobile bar and professional bartender service for events across Hawaiʻi Island.

**Production:** https://koasmobilebar.com  
**Netlify project:** `koasmobilebar`  
**Repository:** `AstroTat808/koasmobilebar.com`

## Brand

Koa's Mobile Bar uses a vintage horse-trailer bar with a refined Hawaiʻi-inspired visual system built around deep forest green, warm ivory, copper and gold.

Primary brand assets:

- `/koa-mobile-bar-logo.webp` — full logo
- `/koa-mobile-bar-icon.png` — circular botanical K medallion source
- `/favicon-16x16.png`
- `/favicon-32x32.png`
- `/favicon-48x48.png`
- `/apple-touch-icon.png`
- `/favicon-192x192.png`
- `/favicon-512x512.png`
- `/site.webmanifest`

The favicon size routes are generated through Netlify Image CDN from the master icon.

## Site Architecture

Core pages:

- `/` — homepage, packages, inclusions, add-ons, quote calculator and inquiry form
- `/services/` — service overview
- `/birthdays/`
- `/corporate-events/`
- `/graduations/`
- `/private-parties/`
- `/weddings/`
- `/bartender-service/`
- `/gallery/`
- `/service-areas/`
- `/service-areas/hilo/`
- `/service-areas/kona/`
- `/service-areas/waimea/`
- `/service-areas/puna/`
- `/privacy.html`
- `/terms.html`
- `/thank-you.html`

## Published Service Pricing

The website currently publishes these Mobile Bar package starting prices:

| Package | Starting Price | Service Focus |
| --- | ---: | --- |
| Oahu | $1,200 | Beer, champagne and wine |
| Maui | $1,500 | Oahu package plus two signature drinks |
| Big Island | $1,800 | Fuller cocktail service |

Standard service baseline:

- Up to 100 guests
- Four hours of service
- Additional guests: $8 each
- Additional service hour: $200
- Bartender labor: $40/hour per bartender
- Travel beyond the included radius: $1.50 per round-trip mile
- Glassware: $1.50 per piece
- Champagne Toast: starting at $70
- Dry-bar model: client supplies alcohol

The homepage quote calculator reflects the currently published rules and identifies custom-priced enhancements separately.

## CRM Integration

The Mobile Bar inquiry form sends lead and quote-estimate data to the Koa's Events CRM endpoint:

`https://www.koasevents.com/api/crm/inquiries`

Captured information includes:

- Contact information
- Event date and alternative date
- Event type and location
- Guest count
- Package selection
- Service hours
- Bartenders
- Mileage
- Gratuity mode
- Glassware
- Selected add-ons
- Estimated total
- Estimate line items
- Referral source
- Notes and priorities

The site also keeps the Netlify form submission path as a resilient inquiry fallback.

## Front-End Structure

This is a lightweight static website.

- `index.html` and page-specific HTML files contain content and structured metadata.
- `styles.css` contains the global responsive design system.
- `app.js` contains navigation, gallery, quote-calculator and CRM-interaction behavior.
- `netlify.toml` defines deployment, security headers and favicon Image CDN routes.

Responsive QA targets:

- 390 × 844 mobile
- 768 × 1024 tablet
- 1440 × 1000 desktop
- 1920 × 1080 desktop

## Production Visual QA

The repository includes an automated **Production Visual QA** workflow:

`.github/workflows/production-visual-qa.yml`

It runs on:

- Pull requests
- Pushes to `main`
- Manual workflow dispatch

### Browser QA

Playwright checks:

- Every major public page loads successfully
- Desktop, tablet and mobile layouts
- Horizontal overflow
- Header/footer presence
- JavaScript and console errors
- Internal links
- Favicon and manifest endpoints
- Canonical and social metadata
- Quote calculator behavior
- Package-card-to-calculator interaction
- Mobile navigation behavior
- Accessibility with axe
- Reference screenshots for high-signal pages

QA artifacts are retained in GitHub Actions for 14 days.

### Visual Regression Baselines

The approved screenshot suite is currently **v2.1** and contains 101 responsive reference images covering every public page plus high-value interaction states: package selection, configured calculator, partial inquiry form, expanded FAQ, gallery lightbox/filtering, and mobile navigation. Browser QA compares future changes against these committed baselines.

### Lighthouse Gate

Lighthouse CI checks:

- Performance ≥ 80
- Accessibility ≥ 90
- Best Practices ≥ 90
- SEO ≥ 90
- Largest Contentful Paint warning above 4 seconds
- Cumulative Layout Shift warning above 0.1

### Release Certification

The workflow includes a final **Release Certification** job.

- **GO** — Browser QA and Lighthouse gates passed
- **NO-GO** — one or more required QA jobs failed

For the strongest release control, configure GitHub branch protection/rulesets so **Release Certification** is a required status check before merging into `main`. Netlify should remain configured to deploy production from `main`.

## Running QA Locally

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Start a local static server:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Run browser QA against the local site:

```bash
BASE_URL=http://127.0.0.1:4173 npm run qa
```

Run QA against production:

```bash
npm run qa:prod
```

Run Lighthouse CI:

```bash
npm run qa:lighthouse
```

## Deployment

Netlify production deploys are connected to the repository's `main` branch.

Current production domain:

`https://koasmobilebar.com`

The `netlify.toml` publish directory is the repository root because the site is static HTML/CSS/JavaScript.

## SEO

The site includes:

- Canonical URLs
- Meta descriptions
- Open Graph metadata
- Homepage social preview image
- Structured data
- `robots.txt`
- `sitemap.xml`
- Dedicated Hawaiʻi Island service-area pages
- Event-specific landing pages
- Mobile/Apple favicon support and web manifest

## Design Principles

When modifying the site:

1. Preserve the premium editorial aesthetic.
2. Prefer real Koa's Mobile Bar imagery over generic stock photography.
3. Keep typography and spacing consistent across all service and location pages.
4. Maintain accessible contrast, keyboard focus states and touch-target sizes.
5. Keep mobile layouts intentional rather than simply stacking desktop content.
6. Do not hard-code new pricing without updating the quote calculator, FAQs and CRM payload together.
7. Run Production Visual QA before considering a release complete.

## Related Koa's Brand

Koa's Mobile Bar is part of the broader Koa's Events operation. Mobile Bar inquiries are intentionally centralized in the Koa's Events CRM so leads, notes, quotes and future client operations can live in one system.
