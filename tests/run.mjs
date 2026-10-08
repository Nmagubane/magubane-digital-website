// End-to-end checks for the built site. Run: npm test (builds, serves dist/ and runs these).
// Uses Playwright's Chromium. FormSubmit is mocked, so no real emails are sent.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8091;
const BASE = `http://localhost:${PORT}`;
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));

const PAGES = ['/', '/services/', '/services/websites/', '/services/website-care-plans/', '/services/business-email/',
  '/services/google-business-profile/', '/services/domains-and-dns/', '/services/custom-software-and-automation/',
  '/pricing/', '/about/', '/contact/', '/contact/sent/', '/privacy/', '/terms/'];
if (cfg.workPublished) PAGES.push('/work/', '/work/lins-wise-accountants/');
const WIDTHS = [320, 390, 768, 1024, 1440, 1920];

let failures = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { failures++; console.log('  FAIL ' + msg); } };
const section = (t) => console.log('\n' + t);

const server = spawn(process.execPath, [join(ROOT, 'tools/serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch();

try {
  // ---------- every page ----------
  section('Pages: structure, SEO, privacy, overflow');
  const titles = new Set();
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const foreign = [];
    page.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) foreign.push(r.url()); });
    const res = await page.goto(BASE + path);
    ok(res.status() === 200, `${path} returns 200`);
    const info = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || '',
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      og: document.querySelector('meta[property="og:image"]')?.content || '',
      lang: document.documentElement.lang,
      skip: document.querySelector('a.skip-link')?.getAttribute('href'),
      imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      wa: document.querySelector('.wa-float')?.href || '',
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter((h) => h.offsetParent !== null || h.classList.contains('visually-hidden')).map((h) => +h.tagName[1]),
      unlabelled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((el) => el.name !== '_honey' && !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length,
      buttonsGeneric: [...document.querySelectorAll('button, .btn')].filter((b) => /^(submit|click here|go)$/i.test(b.textContent.trim())).length,
    }));
    ok(info.h1 === 1, `${path} has exactly one h1 (has ${info.h1})`);
    ok(!titles.has(info.title), `${path} title is unique`); titles.add(info.title);
    ok(info.desc.length >= 70, `${path} has a meta description`);
    ok(info.canonical.endsWith(path), `${path} canonical ends with its path`);
    ok(/\/og\/[\w-]+\.png$/.test(info.og), `${path} has a PNG og:image`);
    ok(info.lang === 'en-ZA', `${path} lang is en-ZA`);
    ok(info.skip === '#main', `${path} has a skip link`);
    ok(info.imgsNoAlt === 0, `${path} images all have alt`);
    ok(info.wa.startsWith(`https://wa.me/${encodeURIComponent(cfg.phoneIntl)}?text=`), `${path} floating WhatsApp link is wa.me with greeting`);
    ok(info.unlabelled === 0, `${path} every form field has a label`);
    ok(info.buttonsGeneric === 0, `${path} no generic button text`);
    let prev = 0, jumps = [];
    for (const h of info.headings) { if (prev && h > prev + 1) jumps.push(`h${prev}->h${h}`); prev = h; }
    ok(jumps.length === 0, `${path} heading levels don't skip (${jumps.join(', ')})`);
    const stored = await page.evaluate(() => ({ cookies: document.cookie, ls: localStorage.length, ss: sessionStorage.length }));
    ok(!stored.cookies && !stored.ls && !stored.ss, `${path} sets no cookies or browser storage`);
    ok(foreign.length === 0, `${path} makes no third-party requests (${foreign.slice(0, 3).join(', ')})`);

    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(50);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(sw <= w, `${path} no horizontal scroll at ${w}px (scrollWidth ${sw})`);
    }
    await ctx.close();
  }

  // ---------- axe-core (runs when @axe-core/playwright is installed: npm install) ----------
  let AxeBuilder = null;
  try { ({ default: AxeBuilder } = await import('@axe-core/playwright')); } catch { /* optional */ }
  if (AxeBuilder) {
    section('axe-core: WCAG 2.2 A and AA');
    for (const path of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(BASE + path);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      ok(r.violations.length === 0, `${path} axe: ${r.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
      await ctx.close();
    }
  } else {
    console.log('\n(axe-core not installed; run `npm install` to include the axe scan)');
  }

  // ---------- 404 ----------
  section('404 page');
  {
    const page = await browser.newPage();
    const res = await page.goto(BASE + '/this-does-not-exist/');
    ok(res.status() === 404, 'unknown URL returns 404');
    ok((await page.textContent('h1')).includes("isn't here"), 'custom 404 content shows');
    ok(await page.locator('.wa-float').count() === 1, '404 has the WhatsApp button');
    await page.close();
  }

  // ---------- contrast (axe-style approximation) ----------
  section('Text contrast (WCAG AA)');
  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(BASE + path);
    const bad = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3); } return [255, 255, 255]; };
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement;
        if (!walker.currentNode.textContent.trim() || !el || el.closest('[aria-hidden="true"], .visually-hidden, .skip-link, [hidden], .hp')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        const fg = parse(cs.color).slice(0, 3), bg = bgOf(el);
        const L1 = lum(fg), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
        if (ratio < need) out.push(`${walker.currentNode.textContent.trim().slice(0, 30)} (${ratio.toFixed(2)})`);
      }
      return out;
    });
    ok(bad.length === 0, `${path} text contrast: ${bad.slice(0, 4).join('; ')}`);
    await page.close();
  }

  // ---------- header and mobile menu, keyboard only ----------
  section('Navigation by keyboard');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE + '/');
    await page.keyboard.press('Tab');
    ok(await page.evaluate(() => document.activeElement.classList.contains('skip-link')), 'first Tab reaches the skip link');
    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab'); // menu button
    ok(await page.evaluate(() => document.activeElement.classList.contains('menu-toggle')), 'Tab reaches the Menu button on mobile');
    await page.keyboard.press('Enter');
    ok(await page.getAttribute('.menu-toggle', 'aria-expanded') === 'true', 'Enter opens the mobile menu');
    ok(await page.locator('#site-nav').isVisible(), 'mobile menu is visible when open');
    await page.keyboard.press('Tab');
    ok(await page.evaluate(() => !!document.activeElement.closest('#site-nav')), 'Tab moves into the open menu');
    await page.keyboard.press('Enter'); // opens Services disclosure
    ok(await page.evaluate(() => document.querySelector('.nav-disclosure').open), 'Enter on Services expands the list');
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => !document.querySelector('.nav-disclosure').open), 'Escape closes Services first');
    await page.keyboard.press('Escape');
    ok(await page.getAttribute('.menu-toggle', 'aria-expanded') === 'false', 'Escape closes the menu');
    ok(await page.evaluate(() => document.activeElement.classList.contains('menu-toggle')), 'focus returns to the Menu button');
    await page.close();

    const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desk.goto(BASE + '/pricing/');
    await desk.focus('.nav-disclosure summary');
    await desk.keyboard.press('Enter');
    ok(await desk.locator('.nav-panel').isVisible(), 'desktop Services menu opens with Enter');
    await desk.keyboard.press('Tab');
    ok(await desk.evaluate(() => !!document.activeElement.closest('.nav-panel')), 'Tab moves into the Services menu');
    await desk.keyboard.press('Escape');
    ok(!(await desk.locator('.nav-panel').isVisible()), 'Escape closes the desktop Services menu');
    ok(await desk.evaluate(() => document.activeElement.tagName === 'SUMMARY'), 'focus returns to Services');
    ok(await desk.getAttribute('.nav-list a[href="/pricing/"]', 'aria-current') === 'page', 'current page is marked with aria-current');
    // Focus is visible
    const outline = await desk.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    ok(outline !== 'none', 'focused element shows an outline');
    await desk.close();
  }

  // ---------- pricing tabs ----------
  section('Pricing selector');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/pricing/');
    ok(await page.locator('#panel-growth').isVisible(), 'Growth Partner shows by default');
    await page.focus('#tab-growth');
    await page.keyboard.press('ArrowRight');
    ok(await page.getAttribute('#tab-premium', 'aria-selected') === 'true', 'ArrowRight selects Premium');
    ok(await page.locator('#panel-premium').isVisible() && !(await page.locator('#panel-growth').isVisible()), 'Premium panel replaces Growth');
    await page.keyboard.press('ArrowRight');
    ok(await page.getAttribute('#tab-launch', 'aria-selected') === 'true', 'ArrowRight wraps to Launch');
    await page.click('#tab-growth');
    ok(await page.locator('#panel-growth').isVisible(), 'click selects a tab');
    const href = await page.getAttribute('#panel-growth a.btn', 'href');
    ok(href === '/contact/?package=growth', 'package button links to the quote form with the package');
    await page.close();
  }

  // ---------- hero sequence ----------
  section('Hero sequence');
  {
    const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    await reduced.goto(BASE + '/');
    await reduced.waitForTimeout(300);
    ok(await reduced.evaluate(() => document.querySelector('[data-build]').classList.contains('is-done')), 'reduced motion shows the finished build at once');
    await reduced.close();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/');
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => document.querySelector('[data-build]').classList.contains('is-running')), 'sequence runs with motion allowed');
    const cls = await page.evaluate(() => new Promise((r) => {
      let total = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) total += e.value; }).observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => r(total), 6500);
    }));
    ok(await page.evaluate(() => document.querySelector('[data-build]').classList.contains('is-done')), 'sequence ends on the finished build');
    ok(cls < 0.02, `home cumulative layout shift is near zero (${cls.toFixed(4)})`);
    await page.close();
  }

  // ---------- quote form ----------
  section('Quote form');
  const fillAll = async (page) => {
    await page.check('#f-type-1');
    await page.click('.btn-next');
    await page.check('#f-svc-1');
    await page.click('.btn-next');
    await page.check('#f-bud-2');
    await page.selectOption('#f-start', 'Within a month');
    await page.click('.btn-next');
    await page.fill('#f-name', 'Thandi Test');
    await page.fill('#f-biz', 'Test Physio');
    await page.fill('#f-email', 'thandi@example.co.za');
    await page.fill('#f-phone', '082 123 4567');
    await page.fill('#f-msg', 'Need a site & email.');
  };
  const openForm = async (route) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const sent = [];
    await page.route('https://formsubmit.co/**', async (r) => { sent.push(r.request().postDataJSON()); await route(r); });
    await page.goto(BASE + '/contact/');
    return { page, sent };
  };

  {
    const { page, sent } = await openForm((r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true","message":"sent"}' }));
    ok(await page.locator('.step').nth(0).isVisible() && !(await page.locator('.step').nth(1).isVisible()), 'only step 1 shows at first');
    await page.click('.btn-next');
    ok(await page.locator('.error-summary').isVisible(), 'continuing with nothing chosen shows the error summary');
    ok(await page.evaluate(() => document.activeElement.classList.contains('error-summary')), 'focus moves to the error summary');
    ok(await page.getAttribute('#f-type-1', 'aria-invalid') === 'true', 'invalid fields get aria-invalid');
    ok((await page.getAttribute('#f-type-1', 'aria-describedby') || '').includes('err-type'), 'error message is linked to the field');
    await page.check('#f-type-1');
    ok(!(await page.locator('.error-summary').isVisible()), 'fixing the error clears the summary');
    await page.click('.btn-next');
    ok(await page.evaluate(() => document.activeElement.matches('fieldset.step')), 'focus moves to the new step');
    await page.click('.btn-back');
    ok(await page.locator('.step').nth(0).isVisible(), 'Back returns to step 1 with the answer kept');
    ok(await page.isChecked('#f-type-1'), 'answers are kept when going back');
    await page.click('.btn-next');
    await page.check('#f-svc-1'); await page.click('.btn-next');
    await page.check('#f-bud-2'); await page.click('.btn-next');
    await page.fill('#f-email', 'not-an-email');
    await page.fill('#f-phone', '12');
    await page.click('.btn-send');
    ok(await page.locator('[data-field="email"].has-error').isVisible(), 'bad email is rejected');
    ok(await page.locator('[data-field="WhatsApp number"].has-error').isVisible(), 'bad phone number is rejected');
    ok(await page.locator('[data-field="name"].has-error').isVisible(), 'missing name is rejected');
    ok(sent.length === 0, 'nothing is sent while there are errors');
    await page.fill('#f-name', 'Thandi Test');
    await page.fill('#f-email', 'thandi@example.co.za');
    await page.fill('#f-phone', '+27 82 123 4567');
    await page.click('.btn-send');
    await page.waitForSelector('#quote-success:not([hidden])');
    ok(sent.length === 1, 'one request is sent to FormSubmit');
    const p = sent[0] || {};
    ok(p.email === 'thandi@example.co.za' && p.name === 'Thandi Test', 'payload carries name and email');
    ok(p['Services needed'] === 'Website' && p['Budget'] === 'R11,500 to R15,000' && p['Business type'] === 'Professional practice', 'payload carries all four steps');
    ok(p._honey === '' && p._template === 'table' && /Quote request/.test(p._subject), 'payload has honeypot, template and subject');
    ok(await page.locator('#quote-form').isHidden(), 'success hides the form');
    ok((await page.textContent('#quote-success')).includes('Thanks, Thandi'), 'success message uses the first name');
    ok(await page.evaluate(() => document.activeElement.closest('#quote-success') !== null), 'focus moves to the success message');
    await page.close();
  }
  {
    const { page } = await openForm((r) => r.fulfill({ status: 500, body: 'oops' }));
    await fillAll(page);
    await page.click('.btn-send');
    await page.waitForSelector('#quote-error:not([hidden])');
    ok(true, 'server error shows the error state');
    const wa = await page.getAttribute('[data-fallback="wa"]', 'href');
    const mail = await page.getAttribute('[data-fallback="email"]', 'href');
    const waText = decodeURIComponent(wa.split('text=')[1] || '');
    ok(wa.startsWith(`https://wa.me/${encodeURIComponent(cfg.phoneIntl)}?text=`), 'WhatsApp fallback goes to wa.me');
    ok(waText.includes('Name: Thandi Test') && waText.includes('Services needed: Website') && waText.includes('Message: Need a site & email.'), 'WhatsApp fallback is pre-filled with the same details');
    ok(mail.startsWith('mailto:') && decodeURIComponent(mail).includes('Email: thandi@example.co.za'), 'email fallback is pre-filled with the same details');
    ok(await page.locator('#quote-form').isVisible(), 'the form stays filled in after an error');
    ok(await page.inputValue('#f-name') === 'Thandi Test', 'answers survive the error');
    await page.click('[data-retry]');
    ok(await page.locator('#quote-error').isHidden(), '"Try the form again" hides the error');
    await page.close();
  }
  {
    const { page } = await openForm((r) => r.abort('internetdisconnected'));
    await fillAll(page);
    await page.click('.btn-send');
    await page.waitForSelector('#quote-error:not([hidden])');
    ok(true, 'network failure shows the error state');
    await page.close();
  }
  {
    const { page } = await openForm((r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"false","message":"This form needs Activation."}' }));
    await fillAll(page);
    await page.click('.btn-send');
    await page.waitForSelector('#quote-error:not([hidden])');
    ok(true, 'FormSubmit "success: false" (e.g. not activated) shows the error state');
    await page.close();
  }
  {
    const { page, sent } = await openForm((r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' }));
    await page.evaluate(() => { document.getElementById('f-honey').value = 'bot'; });
    await fillAll(page);
    await page.click('.btn-send');
    await page.waitForTimeout(400);
    ok(sent.length === 0, 'honeypot filled: nothing is sent');
    await page.close();
  }
  {
    const page = await browser.newPage();
    await page.goto(BASE + '/contact/?package=growth');
    const checked = await page.$$eval('input[name="Services needed"]:checked', (els) => els.map((e) => e.value));
    ok(checked.length === 4 && checked.includes('Business email'), '?package=growth pre-ticks its four services');
    ok(await page.inputValue('input[name="Package interest"]') === 'Growth Partner', 'package interest is recorded');
    await page.goto(BASE + '/contact/?service=email');
    ok(await page.isChecked('#f-svc-3'), '?service=email pre-ticks business email');
    await page.close();
  }
  {
    // Keyboard-only completion of step 1
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/contact/');
    await page.focus('#f-type-1');
    await page.keyboard.press('ArrowDown');
    ok(await page.isChecked('#f-type-2'), 'radio cards work with arrow keys');
    await page.keyboard.press('Enter');
    ok(await page.locator('.step').nth(1).isVisible(), 'Enter does not submit early; Continue works from the keyboard');
    await page.close();
  }
  {
    // Without JavaScript the whole form shows and posts normally
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + '/contact/');
    ok(await page.locator('.step').nth(3).isVisible(), 'without JavaScript all steps are visible');
    ok((await page.getAttribute('#quote-form', 'action')).startsWith('https://formsubmit.co/'), 'without JavaScript the form posts to FormSubmit');
    ok((await page.getAttribute('input[name="_next"]', 'value')).endsWith('/contact/sent/'), 'no-JS submissions return to /contact/sent/');
    await ctx.close();
  }

  // ---------- WhatsApp links ----------
  section('WhatsApp links');
  {
    const page = await browser.newPage();
    await page.goto(BASE + '/services/business-email/');
    const links = await page.$$eval('a[href*="wa.me"]', (as) => as.map((a) => ({ href: a.href, target: a.target, rel: a.rel })));
    ok(links.length >= 3, 'service page has several WhatsApp links');
    ok(links.every((l) => /^https:\/\/wa\.me\/[^?]+\?text=.+/.test(l.href)), 'every WhatsApp link has a number and a pre-filled message');
    ok(links.every((l) => l.target === '_blank' && l.rel.includes('noopener')), 'WhatsApp links open safely in a new tab');
    ok(links.some((l) => decodeURIComponent(l.href).includes('business email')), 'service-specific greeting is used');
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
