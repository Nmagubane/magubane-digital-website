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
  ['default', 'ICT services for schools, government and business', 'Software, cloud, networks, devices, security and support. B-BBEE Level 1.'],
  ['software-and-digital', 'Software and digital', 'Systems, portals, integrations, reporting and websites, built in-house.'],
  ['cloud-and-microsoft-365', 'Cloud and Microsoft 365', 'Accounts, email, device management and migrations, set up properly.'],
  ['managed-it-support', 'Managed IT support', 'Service desk, on-site support and response times in writing.'],
  ['networks-and-connectivity', 'Networks and connectivity', 'LAN, Wi-Fi, firewalls and structured cabling, tested and documented.'],
  ['cybersecurity-and-popia', 'Cybersecurity and POPIA', 'Assessments, backup, policies and awareness training.'],
  ['education-technology', 'Education technology', 'Smart classrooms, labs, learning platforms and teacher training.'],
  ['hardware-and-licence-supply', 'Hardware and licence supply', 'Devices, network equipment and licences, delivered ready to use.'],
  ['ict-consulting-and-governance', 'ICT consulting and governance', 'ICT plans, audits, policy and project management.'],
  ['sector-education', 'ICT for schools and colleges', 'Smart classrooms, labs, platforms, devices and support.'],
  ['sector-government', 'ICT for government', 'Systems, support, networks, security and governance.'],
  ['sector-business', 'ICT for business', 'Managed support, Microsoft 365, security and automation.'],
  ['procurement', 'Procurement information', 'CSD, B-BBEE, company registration and how to send an RFQ.'],
  ['how-we-work', 'How we deliver ICT projects', 'Survey, specification, delivery, testing, handover and support.'],
  ['small-business', 'Small business packages', 'Website, email and Google profile. From R11,500 excluding VAT.'],
  ['contact', 'Request a quote', 'Send your requirement or RFQ, or chat to Neo on WhatsApp.'],
  ['about', 'About Magubane Digital', 'A 100% black-owned ICT company founded by Neo Magubane.'],
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
