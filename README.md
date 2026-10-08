# Magubane Digital website

A static, multi-page site: plain HTML, CSS and vanilla JavaScript. It has no backend, no database, no cookies, no analytics, and stores nothing in the browser. A small Node script (no dependencies) stitches the shared header and footer into every page, fills in your details from one config file, and writes clean URLs (`/pricing/` → `pricing/index.html`).

```
site.config.json     ← your phone, email, domain, CIPC number etc. (all placeholders live here)
build.mjs            ← the build: node build.mjs → dist/
src/
  pages/             ← one HTML file per page; edit copy here
  partials/          ← header, footer, CTA band, service rows, packages ladder, artefacts
  assets/css/        ← main.css (design tokens at the top)
  assets/js/         ← site.js (menus), hero.js, pricing.js, quote.js
  assets/fonts/      ← Inter variable font, Latin subset (45 KB), self-hosted
  assets/logo/       ← logo.svg, logo-reversed.svg, monogram.svg, monogram.png
  static/            ← favicons and Open Graph images (copied to the site root)
tools/               ← local server, image helpers
tests/run.mjs        ← end-to-end checks
.github/workflows/   ← deploy to GitHub Pages
PLACEHOLDERS.md      ← generated list of everything still to fill
PLAN.md              ← the approved design plan
```

## Day to day

You need Node 18 or later. Nothing to install for building.

| Command | What it does |
|---|---|
| `node build.mjs` | Builds the site into `dist/` and rewrites `PLACEHOLDERS.md` |
| `node build.mjs --drafts` | Also builds draft pages (the case study) for local preview only |
| `node build.mjs --strict` | Fails if any placeholder is left. Run before launch |
| `node tools/serve.mjs` | Serves `dist/` at http://localhost:8080, the way GitHub Pages does |

The build also fails if a page is missing a title or description, two pages share a title, a description is too short or long, or a page goes over 200 KB (HTML, CSS, JS and font, excluding images).

### Filling placeholders

1. Open `site.config.json` and replace every value in `[square brackets]`.
2. In page content, placeholders are written as `[[like this]]`. Search `src/` for `[[` to find them.
3. Run `node build.mjs`. `PLACEHOLDERS.md` lists whatever is left.

Placeholders show on the site with a yellow highlight, so nothing unfinished goes live unnoticed.

### Editing pages

Each file in `src/pages/` starts with a meta block:

```html
<!--meta
{ "path": "/pricing/", "title": "…", "description": "…", "scripts": ["pricing"], "ogImage": "/og/pricing.png" }
-->
```

The rest of the file is ordinary HTML. In it you can use:

- `{{phoneDisplay}}`, `{{email}}` and other config keys (for text), `{{attr:email}}` (inside attributes)
- `{{wa}}` for a WhatsApp link with the default greeting, or `{{wa|Your own message}}`
- `<!--include:cta-->` to insert a partial from `src/partials/`
- `<!--if:workPublished--> … <!--endif:workPublished-->` for content that appears only once the case study is published

### Publishing the Lins-Wise case study

It's built but hidden: it's not in the nav, the sitemap or the home page, and it isn't deployed at all. Once you have the client's permission and the facts:

1. Fill in `src/pages/work/lins-wise-accountants.html` and `src/pages/work.html`, and the home page's "Recent work" section in `src/pages/index.html`.
2. Add screenshots with `node tools/convert-image.mjs screenshot.png 1600 lins-wise` and paste the `<picture>` snippet it prints.
3. Set `"workPublished": true` and `"linsWiseUrl"` in `site.config.json`.

### Images

All interface artefacts are HTML and CSS, so the site ships almost no images. For real photos (Neo's portrait, screenshots), run:

```
npm install                       # once, for sharp
node tools/convert-image.mjs photo.jpg 1000 neo-portrait
```

It writes AVIF and WebP to `src/assets/img/` and prints a `<picture>` element with width and height set. Replace the dashed placeholder box with it.

Open Graph images (link previews in WhatsApp, Facebook and LinkedIn) are PNG on purpose, because those apps don't read AVIF or WebP. Regenerate them after changing the domain with `npm run images`.

## Testing

```
npm install       # once: Playwright, axe-core, Lighthouse CI, sharp (dev only, never shipped)
npx playwright install chromium
npm test          # builds, serves dist/ and runs tests/run.mjs
npm run lighthouse
```

`tests/run.mjs` checks:

- every page at 320, 390, 768, 1024, 1440 and 1920 px for horizontal scroll
- one h1 per page, heading order, unique titles, descriptions, canonical URLs, PNG Open Graph images
- labelled form fields, skip link, `lang`, alt text
- text contrast against WCAG AA, plus an axe-core WCAG 2.2 AA scan when installed
- no cookies or browser storage, and no third-party requests on page load
- keyboard use of the mobile menu, the Services menu and the pricing tabs, with focus going back where it should
- the hero sequence (and that reduced motion shows the finished state), plus layout shift
- every quote form state, with FormSubmit mocked: validation, error summary, Back and Continue, success, server error, network failure, FormSubmit's `success: false`, the honeypot, the package pre-select, keyboard use and the no-JavaScript fallback
- WhatsApp links: number, pre-filled message, new tab

`npm run lighthouse` runs Lighthouse (mobile settings) on the main pages and fails below 95 for performance, accessibility and best practices.

## Deploying to GitHub Pages

### 1. Push the repository

```
git init
git add .
git commit -m "Magubane Digital website"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Turn on Pages

In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. You can follow it in the **Actions** tab.

Before the custom domain is set up, the site is at `https://<you>.github.io/<repo>/`. You don't need to change anything for that: the workflow passes GitHub's real address and sub-path to the build, and switches to your domain automatically once it's connected. (`basePath` in `site.config.json` is only for building under a sub-path on your own machine.)

### 3. Custom domain

1. Set `"domain"` in `site.config.json` (for example `magubanedigital.co.za`) and push. It's used in the terms page and for local builds; on GitHub the workflow uses whatever address Pages reports.
2. **Settings → Pages → Custom domain**: enter the domain and save.
3. At your DNS provider:
   - For the bare domain, add four **A** records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and optionally four **AAAA** records pointing to `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`.
   - For `www`, add a **CNAME** pointing to `<you>.github.io`.
4. When the DNS check passes, tick **Enforce HTTPS**. The certificate can take a little while to issue.
5. Recommended: verify the domain under your GitHub account's **Settings → Pages**, so nobody else can claim it.

**About the CNAME file:** with the GitHub Actions deployment used here, the custom domain is stored in the repository settings, and GitHub doesn't use a `CNAME` file. If you ever switch to "Deploy from a branch", add a file called `CNAME` containing just your domain to `src/static/`, and the build will copy it to the site root.

Check the published IP addresses against GitHub's "Managing a custom domain for your GitHub Pages site" page before you set them. They rarely change, but that page is the source.

### 4. Activate FormSubmit

The quote form sends to FormSubmit by AJAX. Until it's activated, nothing reaches you.

1. Set `"formsubmitId"` to your email address in `site.config.json`, then push.
2. On the **live** site, send one test quote request. FormSubmit emails you an activation link. The site will show its "didn't send" state for this first try; that's expected.
3. Click the activation link.
4. FormSubmit then gives you a random string to use instead of your email address. Put it in `"formsubmitId"` and push. This keeps your address out of the page source.
5. Send another test request and check it arrives.

The form includes a honeypot field (`_honey`) for spam, and uses FormSubmit's table email template. If FormSubmit is down, visitors get buttons that open WhatsApp or email with their answers already written out.

**Privacy:** FormSubmit receives what people type into the form, so it's named as an operator in the POPIA notice. Confirm where it stores data and fill that in on `/privacy/`.

## Notes and limits

- **GitHub Pages terms.** GitHub says Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business". A brochure site that sells nothing on-page is a grey area. If you want no ambiguity, `dist/` deploys unchanged to Cloudflare Pages or Netlify (build command `node build.mjs`, output folder `dist`).
- **Structured data** uses `ProfessionalService` (a type of `LocalBusiness`) with the three packages as offers. Fields still holding placeholders are left out automatically.
- **Fonts:** one variable Inter file (SIL Open Font License, see `src/assets/fonts/Inter-LICENSE.txt`). Its optical-size axis gives the Inter Display letterforms at heading sizes.
- **Motion:** the home hero's setup sequence is the only automatic animation. It plays once, when the example is in view, and is skipped for visitors who prefer reduced motion.
