// Generates Open Graph images (1200x630 PNG; WhatsApp and Facebook need PNG or JPEG),
// favicons and the PNG logo used in structured data.
// Needs dev dependencies: npm install, then `npm run images`.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = readFileSync(join(ROOT, 'src/assets/fonts/inter-var-latin.woff2')).toString('base64');
const mono = readFileSync(join(ROOT, 'src/assets/logo/monogram.svg'), 'utf8');
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const domain = /^\[/.test(cfg.domain) ? '' : cfg.domain;

const cards = [
  ['default', 'Websites, business email and IT setup for small businesses', 'Done properly, and looked after every month.'],
  ['websites', 'Websites', 'Custom, mobile-first, fast. WhatsApp and enquiry forms built in.'],
  ['website-care-plans', 'Website care plans', 'Hosting, monitoring, renewals and monthly updates.'],
  ['business-email', 'Business email on your own domain', 'Microsoft 365 with SPF, DKIM and DMARC set up properly.'],
  ['google-business-profile', 'Google Business Profile', 'Show up on Google Maps and local search.'],
  ['domains-and-dns', 'Domains and DNS', 'Registration, renewals and the records behind your site and email.'],
  ['custom-software-and-automation', 'Custom software and automation', 'Small tools that take repetitive admin off your desk.'],
  ['pricing', 'Packages and prices', 'From R11,500 once-off. Every project gets a written quotation.'],
  ['contact', 'Request a quote', 'Four short steps, or chat to Neo on WhatsApp.'],
  ['about', 'About Magubane Digital', 'Run by Neo Magubane, software engineer.'],
];

const html = (title, sub) => `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#F5F6F8;font-family:Inter;color:#0E1530;font-optical-sizing:auto;position:relative;overflow:hidden}
.wrap{position:absolute;inset:72px 80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:18px;font-weight:650;font-size:30px;letter-spacing:-.01em}
.brand svg{width:56px;height:56px}
h1{margin-top:auto;font-size:${title.length > 40 ? 64 : 76}px;line-height:1.04;letter-spacing:-.03em;font-weight:650;max-width:960px}
p{margin-top:24px;font-size:30px;color:#4A5170;max-width:900px;line-height:1.35}
.dom{position:absolute;right:80px;top:84px;font-size:24px;color:#4A5170}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#0E1530}
.bar i{position:absolute;right:80px;bottom:14px;width:28px;height:28px;background:#2F52F5}
</style></head><body><div class="wrap"><div class="brand">${mono}Magubane Digital</div><h1>${title}</h1><p>${sub}</p></div>
<div class="dom">${domain}</div><div class="bar"><i></i></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
mkdirSync(join(ROOT, 'src/static/og'), { recursive: true });
for (const [slug, title, sub] of cards) {
  await page.setContent(html(title, sub));
  await page.waitForTimeout(100);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(join(ROOT, `src/static/og/${slug}.png`));
}
await browser.close();

// Icons from the monogram
const svg = Buffer.from(mono);
await sharp(svg, { density: 600 }).resize(32, 32).png().toFile(join(ROOT, 'src/static/favicon-32.png'));
// Apple touch icon: full-bleed ink square (iOS rounds the corners itself)
const appleSvg = Buffer.from(mono.replace('rx="10.5"', 'rx="0"'));
await sharp(appleSvg, { density: 600 }).resize(180, 180).png().toFile(join(ROOT, 'src/static/apple-touch-icon.png'));
await sharp(svg, { density: 600 }).resize(512, 512).png().toFile(join(ROOT, 'src/assets/logo/monogram.png'));
console.log(`Wrote ${cards.length} OG images and icons`);
