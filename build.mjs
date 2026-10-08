#!/usr/bin/env node
// Magubane Digital static site build. Zero dependencies (Node 18+).
//
//   node build.mjs            build to dist/
//   node build.mjs --drafts   also build draft pages (for local preview only)
//   node build.mjs --strict   fail if any placeholder is still unfilled
//
// Pages live in src/pages as HTML fragments that start with a <!--meta {json} --> block.
// The build wraps each fragment in the shared layout (head, header, footer), fills
// values from site.config.json, and writes clean URLs (folder/index.html).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));
const DRAFTS = args.has('--drafts');
const STRICT = args.has('--strict');

const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const isPlaceholder = (v) => typeof v === 'string' && /^\[.*\]$/.test(v.trim());
const configGaps = Object.entries(cfg).filter(([k, v]) => !k.startsWith('_') && isPlaceholder(v)).map(([k, v]) => ({ key: k, hint: v }));

// In GitHub Actions, the Pages workflow passes the real origin and base path (they change
// automatically once a custom domain is set). Locally, site.config.json decides.
const base = (process.env.BASE_PATH ?? cfg.basePath ?? '').replace(/\/$/, '');
const origin = (process.env.SITE_ORIGIN || (isPlaceholder(cfg.domain) ? 'https://example.co.za' : `https://${cfg.domain}`)).replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const read = (p) => readFileSync(p, 'utf8');
const partial = (name) => read(join(SRC, 'partials', `${name}.html`));

const waLink = (text) => `https://wa.me/${encodeURIComponent(cfg.phoneIntl)}?text=${encodeURIComponent(text || cfg.whatsappGreeting)}`;

// ---------- assets (copied with content hashes for cache-busting) ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const assetVersion = {};
for (const file of walk(join(SRC, 'assets'))) {
  const rel = relative(SRC, file).split('\\').join('/');
  const out = join(DIST, rel);
  mkdirSync(dirname(out), { recursive: true });
  if (extname(file) === '.css') {
    // Light minification: comments and whitespace only (safe for this stylesheet)
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,])\s*/g, '$1').replace(/;}/g, '}').trim();
    writeFileSync(out, css);
  } else {
    copyFileSync(file, out);
  }
  assetVersion['/' + rel] = hash(readFileSync(out));
}
// Root-level static files (favicon, icons, og images, robots extras)
if (existsSync(join(SRC, 'static'))) {
  for (const file of walk(join(SRC, 'static'))) {
    const rel = relative(join(SRC, 'static'), file);
    const out = join(DIST, rel);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(file, out);
  }
}

// ---------- templating ----------
const flags = { workPublished: !!cfg.workPublished || DRAFTS, partnersPublished: !!cfg.partnersPublished || DRAFTS };

function render(html, page) {
  // includes (recursive)
  for (let i = 0; i < 5 && html.includes('<!--include:'); i++) {
    html = html.replace(/<!--include:([\w-]+)-->/g, (_, n) => partial(n));
  }
  // conditionals
  html = html.replace(/<!--if:(\w+)-->([\s\S]*?)<!--endif:\1-->/g, (_, f, body) => (flags[f] ? body : ''));
  html = html.replace(/<!--ifnot:(\w+)-->([\s\S]*?)<!--endifnot:\1-->/g, (_, f, body) => (flags[f] ? '' : body));
  // WhatsApp links: {{wa}} or {{wa|custom message}}
  html = html.replace(/\{\{wa(?:\|([^}]*))?\}\}/g, (_, msg) => esc(waLink(msg)));
  // raw attribute values: {{attr:key}}
  html = html.replace(/\{\{attr:(\w+)\}\}/g, (_, k) => esc(cfg[k] ?? ''));
  // page values: {{page:key}}
  html = html.replace(/\{\{page:(\w+)\}\}/g, (_, k) => esc(page[k] ?? ''));
  // text values: {{key}} (placeholders are highlighted)
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (k === 'year') return String(new Date().getFullYear());
    if (k === 'origin') return origin;
    if (k === 'siteurl') return origin + base;
    const v = cfg[k];
    if (v === undefined) throw new Error(`Unknown config key {{${k}}} in ${page.src}`);
    return isPlaceholder(v) ? `<span class="ph">${esc(v)}</span>` : esc(v);
  });
  // inline content placeholders: [[text]]
  html = html.replace(/\[\[([\s\S]*?)\]\]/g, (_, t) => `<span class="ph">[${t}]</span>`);
  return html;
}

function withBase(html) {
  if (!base) return html;
  return html.replace(/(href|src|action|content)="\/(?!\/)/g, `$1="${base}/`);
}

function versionAssets(html) {
  return html.replace(/(href|src)="(\/assets\/[^"?#]+\.(?:css|js|svg|png|webp|avif))"/g, (m, attr, p) => (assetVersion[p] ? `${attr}="${p}?v=${assetVersion[p]}"` : m));
}

function markCurrent(html, path) {
  // aria-current on exact matches; section highlight for parents
  return html.replace(/<a([^>]*?) href="([^"]+)"([^>]*)>/g, (m, pre, href, post) => {
    if (/data-nocurrent/.test(pre + post)) return m;
    if (href === path) return `<a${pre} href="${href}"${post} aria-current="page">`;
    if (href !== '/' && href.endsWith('/') && path.startsWith(href) && /data-section/.test(pre + post)) {
      return `<a${pre} href="${href}"${post} data-current-section>`;
    }
    return m;
  });
}

// ---------- structured data ----------
function jsonLd(p) {
  const clean = (v) => (isPlaceholder(v) ? undefined : v);
  const biz = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': origin + base + '/#business',
    name: cfg.name,
    legalName: clean(cfg.legalName),
    url: origin + base + '/',
    logo: origin + base + '/assets/logo/monogram.png',
    image: origin + base + '/og/default.png',
    email: clean(cfg.email),
    telephone: isPlaceholder(cfg.phoneIntl) ? undefined : '+' + cfg.phoneIntl,
    founder: { '@type': 'Person', name: cfg.founder },
    areaServed: { '@type': 'Country', name: 'South Africa' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: clean(cfg.city),
      addressRegion: clean(cfg.province),
      addressCountry: 'ZA',
    },
    description: 'ICT services for South African schools, public bodies and businesses: software, cloud and Microsoft 365, managed IT support, networks, cybersecurity and POPIA, education technology, hardware supply and ICT consulting.',
    knowsAbout: ['Software development', 'Microsoft 365', 'Managed IT support', 'Network installation', 'Cybersecurity', 'POPIA', 'Education technology', 'ICT governance'],
    makesOffer: [
      ['Launch', 11500, null], ['Growth Partner', 15000, 750], ['Premium', 26500, 1650],
    ].map(([name, once, monthly]) => ({
      '@type': 'Offer',
      name: `${name} small business package`,
      priceCurrency: 'ZAR',
      price: once,
      description: monthly ? `From R${once.toLocaleString('en-US')} once-off plus R${monthly.toLocaleString('en-US')} a month, excluding VAT` : `From R${once.toLocaleString('en-US')} once-off, excluding VAT`,
    })),
  };
  return JSON.parse(JSON.stringify(biz)); // drops undefined fields
}

// ---------- pages ----------
const pages = [];
for (const file of walk(join(SRC, 'pages')).filter((f) => extname(f) === '.html')) {
  const raw = read(file);
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Missing <!--meta--> block in ${file}`);
  const meta = JSON.parse(m[1]);
  meta.src = relative(ROOT, file);
  meta.body = raw.slice(m[0].length);
  if (meta.requires && !flags[meta.requires]) continue;
  if (meta.draft && !DRAFTS) continue;
  pages.push(meta);
}

const problems = [];
const titles = new Map();
for (const p of pages) {
  for (const k of ['title', 'description', 'path']) if (!p[k]) problems.push(`${p.src}: missing "${k}"`);
  if (titles.has(p.title)) problems.push(`${p.src}: title duplicates ${titles.get(p.title)}`);
  titles.set(p.title, p.src);
  if (p.description && (p.description.length < 70 || p.description.length > 165)) problems.push(`${p.src}: description is ${p.description.length} characters (aim for 70 to 165)`);
}

const layout = partial('layout');
const phReport = [];
const weights = [];

for (const p of pages) {
  const page = {
    ...p,
    canonical: origin + base + p.path,
    ogImage: origin + base + (p.ogImage || '/og/default.png'),
    robots: p.noindex || p.draft ? 'noindex, follow' : 'index, follow',
    scripts: (p.scripts || []).map((s) => `<script src="/assets/js/${s}.js" defer></script>`).join('\n'),
    bodyClass: p.bodyClass || '',
    ogAlt: p.ogAlt || p.title.split(' | ')[0],
  };
  let html = layout.replace('<!--content-->', p.body);
  html = render(html, page);
  // page-level values that can contain HTML (scripts / jsonld) were escaped; restore them
  html = html.replace('<!--scripts-->', page.scripts);
  html = html.replace('<!--jsonld-->', p.jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonLd(p)).replace(/</g, '\\u003c')}</script>` : '');
  html = markCurrent(html, p.path);
  html = versionAssets(html);
  html = withBase(html);

  const out = p.path === '/404.html' ? join(DIST, '404.html') : join(DIST, p.path, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);

  // placeholder report (strip tags inside each placeholder)
  const found = [...html.matchAll(/<span class="ph">([\s\S]*?)<\/span>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"'));
  const contentOnly = [...new Set(found)].filter((t) => !configGaps.some((g) => esc(g.hint) === esc(t) || g.hint === t));
  if (contentOnly.length) phReport.push({ path: p.path, items: contentOnly });

  // page weight (HTML + CSS + JS + preloaded font), excluding images
  const refs = [...html.matchAll(/(?:href|src)="([^"?]*\/assets\/[^"?]+\.(?:css|js|woff2))/g)].map((x) => x[1].slice(x[1].indexOf('/assets/')));
  const bytes = Buffer.byteLength(html) + [...new Set(refs)].reduce((s, r) => s + statSync(join(DIST, r)).size, 0);
  weights.push({ path: p.path, kb: +(bytes / 1024).toFixed(1) });
  if (bytes > 200 * 1024) problems.push(`${p.path}: ${(bytes / 1024).toFixed(1)} KB exceeds the 200 KB budget`);
}

// ---------- redirects for moved pages (GitHub Pages has no server redirects) ----------
const redirects = existsSync(join(ROOT, 'redirects.json')) ? JSON.parse(read(join(ROOT, 'redirects.json'))) : {};
for (const [from, to] of Object.entries(redirects)) {
  if (pages.some((p) => p.path === from)) continue; // a real page wins
  const target = base + to;
  const out = join(DIST, from, 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `<!doctype html><html lang="en-ZA"><head><meta charset="utf-8"><title>Moved | Magubane Digital</title><meta name="robots" content="noindex"><link rel="canonical" href="${origin}${target}"><meta http-equiv="refresh" content="0; url=${target}"></head><body><p>This page has moved to <a href="${target}">${origin}${target}</a>.</p></body></html>\n`);
}

// ---------- sitemap + robots ----------
const indexable = pages.filter((p) => !p.noindex && !p.draft && p.path !== '/404.html');
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${origin}${base}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}${base}/sitemap.xml\n`);
writeFileSync(join(DIST, '.nojekyll'), '');

// ---------- placeholder report ----------
const md = [
  '# Placeholders still to fill',
  '',
  `Generated by \`node build.mjs\` on ${today}. Fill these, rebuild, and this list shrinks.`,
  '',
  '## In site.config.json (used across every page)',
  '',
  ...(configGaps.length ? configGaps.map((g) => `- [ ] \`${g.key}\`: ${g.hint}`) : ['- None. All config values are filled.']),
  '',
  '## In page content (edit the file in src/pages)',
  '',
  ...(phReport.length
    ? phReport.flatMap((r) => [`### ${r.path}`, '', ...r.items.map((t) => `- [ ] ${t}`), ''])
    : ['- None.']),
  '',
  '## Decisions still open',
  '',
  `- [ ] Lins-Wise case study: confirm client permission, supply facts, then set \`"workPublished": true\` in site.config.json (currently ${cfg.workPublished ? 'published' : 'hidden'}).`,
  '- [ ] Replace the portrait placeholder on /about/ with a real photo (see README: Images).',
  '',
].join('\n');
writeFileSync(join(ROOT, 'PLACEHOLDERS.md'), md);

// ---------- summary ----------
console.log(`Built ${pages.length} pages to dist/${DRAFTS ? ' (including drafts)' : ''}`);
console.log(`Heaviest page: ${weights.sort((a, b) => b.kb - a.kb)[0].path} at ${weights[0].kb} KB (budget 200 KB, excluding images)`);
const phCount = configGaps.length + phReport.reduce((s, r) => s + r.items.length, 0);
console.log(phCount ? `${phCount} placeholders still to fill. See PLACEHOLDERS.md` : 'No placeholders left.');
if (problems.length) {
  console.error('\nProblems:\n' + problems.map((x) => '  - ' + x).join('\n'));
  process.exit(1);
}
if (STRICT && phCount) {
  console.error('\n--strict: placeholders remain.');
  process.exit(1);
}
