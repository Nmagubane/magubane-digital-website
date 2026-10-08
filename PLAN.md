# Magubane Digital website — plan for approval

Status: **awaiting Neo's OK**. Nothing is built yet.
Prepared 8 October 2026.

---

## 1. Who the site is for and what it must do

- **Audience:** owners of South African SMMEs, professional practices and start-ups who don't have an IT person. Mostly on phones, mostly arriving from a WhatsApp link, a Google search or a referral.
- **Primary job:** get a qualified quote request (form or WhatsApp).
- **Secondary job:** make an owner trust a one-person company with their domain, email and reputation. Precision and plain honesty do that work; invented social proof would undo it.

## 2. Design direction

### The idea: show the actual work

Most agency sites describe the work. This one shows the artefacts of it: the setup checklist, the DNS records that make email trustworthy, the `.co.za` in the address bar, the Google listing, the monthly care log. They're rendered as crisp HTML/CSS (not stock images), so they're light, sharp at any size, and true to what a client gets.

- **Precise:** the artefacts are real (a correct SPF record, a real DMARC policy shape), left-aligned layouts, a strict grid, tabular figures in prices.
- **Warm and South African:** comes from content, not decoration: `.co.za` domains, rand amounts, WhatsApp-first contact, business hours in SAST, Neo's own photo and voice on About, plain SA English. I'm deliberately *not* adding a warm "Africa" accent colour or pattern; it would read as a costume.

### The one motion moment (home hero)

"Setup checklist" and "site being built" combined into a single sequence, about 6 seconds, plays once:

1. A browser frame shows an example business site (clearly labelled as an example, with a fictional business, e.g. "Example build: a physio practice in Durban").
2. Beside it, a checklist ticks off in order. Each tick makes something appear in the browser:
   - Domain registered → address bar fills in `thandiphysio.co.za`
   - Site designed and built → layout, type and colour resolve
   - WhatsApp and enquiry form working → WhatsApp button and form appear
   - Business email live (SPF, DKIM, DMARC) → `hello@thandiphysio.co.za` in the footer
   - Google Business Profile verified → a map listing card slides in
   - Monthly care switched on → status changes to "Live, looked after"
3. Stops on the finished state. No loop.

The checklist is a real `<ol>` (screen readers read it as content); the browser preview is decorative (`aria-hidden`). With `prefers-reduced-motion`, it renders the finished state immediately. Everything else on the site stays still, except motion that answers an action (menu opening, form step changing, tab switching).

### Colour

| Token | Hex | Role |
|---|---|---|
| Ink | `#0E1530` | Text, headings, dark bands, logo tile |
| Cobalt | `#2F52F5` | Primary buttons, links, the monogram square, focus ring, active states. 5.8:1 on white (AA for text) |
| Paper | `#F5F6F8` | Page background (cool near-white) |
| White | `#FFFFFF` | Raised surfaces: browser frame, form, table |
| Slate | `#4A5170` | Secondary text. About 7:1 on Paper (AAA) |
| Line | `#DCDFE8` | Hairlines, input borders (decorative; inputs also get a 3:1 border) |
| Signal green | `#12805C` | "Done / live" ticks and form success only. 4.9:1 on white |
| Error red | `#C4281C` | Form errors only, always paired with text and an icon |

The WhatsApp button uses WhatsApp's own green and glyph. On a WhatsApp-first market, instant recognition earns more taps than brand purity.

### Type

- **One file serves both faces.** Inter 4's variable font has an optical-size axis (`opsz` 14–32). At large sizes it *is* Inter Display, and at body sizes it's Inter. I'll self-host one Latin-subset `woff2` (target ≤ 110 KB) with `font-optical-sizing: auto`, so headings get the Display cut automatically. That's one request instead of two or three.
- Weights: 400 body, 500 UI and labels, 650 headings. No italics loaded.
- Prices and figures: tabular numerals (`tnum`).
- Monospace (system stack, no download) **only** where the content literally is code: DNS records and URLs inside artefacts.

**Scale** (Bringhurst steps; `clamp()` from 390px to 1440px):

| Role | Desktop | Mobile | Line height | Tracking |
|---|---|---|---|---|
| Hero display | 72 | 40 | 1.04 | −0.03em |
| Page H1 | 48 | 34 | 1.1 | −0.02em |
| H2 | 36 | 28 | 1.15 | −0.015em |
| H3 | 24 | 21 | 1.3 | −0.01em |
| Lead | 21 | 19 | 1.5 | 0 |
| Body | 18 | 17 | 1.6 | 0 |
| UI / labels | 16 | 16 | 1.4 | 0 |
| Fine print | 14 | 14 | 1.5 | 0 |

Measure ≤ 66 characters. Sentence case everywhere. No all-caps labels.

### Layout system

- 12-column grid, 1200px content max, 24px gutters (16px side gutter on phones).
- **Left-aligned** throughout, with no centred hero and no centred section intros.
- Spacing on a 4px base: 8, 12, 16, 24, 32, 48, 72, 112.
- Radius follows hierarchy rather than one value everywhere: 4px inputs and chips, 10px panels, 16px the hero browser frame, full circle for the WhatsApp button.
- Shadows on only two things: the hero frame and the floating WhatsApp button.

### Logo (refined, delivered as SVG)

- **Monogram tile:** ink rounded square (22% radius) with a white geometric "M" drawn from equal-weight strokes on the grid. The small cobalt square sits bottom-right of the M like a cursor or a checklist box, tying the logo to the "done properly" idea.
- **Wordmark:** "Magubane Digital" in Inter Display 650, ink, both words the same weight and colour.
- Files: `logo.svg` (tile + wordmark), `monogram.svg`, `favicon.svg`, plus PNG `apple-touch-icon` and `og-default.png`.

### Self-review against the brief: what I changed from the obvious version

| Obvious default I first reached for | What I'm doing instead, and why |
|---|---|
| Three identical service cards with icons | **Artefact rows:** each service is a row with its own artefact (mini site, DNS record, listing card, care log). Different content means different shapes |
| Three pricing cards with the middle one "popular" and lifted | **Nested ladder:** Launch sits inside Growth, which sits inside Premium, because that's literally how the packages work ("everything in Launch, plus…"). Becomes stacked bands on mobile |
| Centred headline over a gradient | Left-aligned headline with the live build sequence beside it |
| Monospace "data labels" everywhere | Mono only inside code artefacts |
| Fade-up on every section | Nothing moves except the hero sequence and responses to actions |

---

## 3. Sitemap and URLs

```
/                                    Home
/services/                           Services overview
/services/websites/
/services/website-care-plans/
/services/business-email/
/services/google-business-profile/
/services/domains-and-dns/
/services/[sixth-service]/           Pending your decision
/pricing/
/work/                               Work index
/work/lins-wise-accountants/         Built as draft: hidden until you confirm permission
/about/
/contact/                            Request a quote (multi-step)
/contact/sent/                       No-JS fallback "request sent" page (noindex)
/privacy/                            POPIA privacy notice
/terms/                              Terms + ECT Act disclosures
/404.html
sitemap.xml   robots.txt   CNAME (if branch deploy)
```

**Header:** logo · Services (disclosure menu listing each service) · Pricing · Work · About · **Request a quote** (button).
**Mobile:** "Menu" button → full-height panel. Keyboard: Tab/Shift+Tab move through it, Esc closes it and returns focus to the button, and `aria-expanded` is kept in sync.
**Footer:** logo + one-line promise, service links, company links, contact (WhatsApp, email, hours), legal links, CIPC slot, © year.
**Floating WhatsApp button:** every page including 404, bottom-right, 56px, pre-filled greeting. Positioned so it never covers focused elements (WCAG 2.2 "focus not obscured"), and the footer gets bottom padding so it never hides the last link.

---

## 4. Page layouts

### Home (1440px)

```
┌───────────────────────────────────────────────────────────────────────┐
│ [M] Magubane Digital     Services ▾  Pricing  Work  About  [Request a quote] │
├───────────────────────────────────────────────────────────────────────┤
│ Get your business properly          ┌ Example build ─────────────────┐ │
│ online, and keep it that way.       │ ● ● ●   thandiphysio.co.za      │ │
│                                     │ ┌───────────────────────────┐   │ │
│ Your website, email on your own     │ │  site assembling…         │   │ │
│ domain and Google listing, set up   │ │                  [WhatsApp]│   │ │
│ by Neo and looked after every       │ └───────────────────────────┘   │ │
│ month, so you can get on with       └─────────────────────────────────┘ │
│ your work.                          Setup checklist                     │
│                                     ✓ Domain registered                 │
│ [Request a quote] [WhatsApp Neo]    ✓ Site designed and built           │
│                                     ◌ WhatsApp and enquiry form …       │
├───────────────────────────────────────────────────────────────────────┤
│ What we set up and look after                                          │
│ Websites ........ Custom, mobile-first, fast…      [mini page]  ›     │
│ ──────────────────────────────────────────────────────────────────── │
│ Business email .. Microsoft 365 on your domain…    [TXT v=spf1…]      │
│ ──────────────────────────────────────────────────────────────────── │
│ Google profile .. Show up on Maps and search…      [listing card]     │
│ Domains & DNS … / Care plans … / [6th] …                              │
├───────────────────────────────────────────────────────────────────────┤
│ Packages                                                               │
│ ┌ Premium  from R26,500 + R1,650 pm ─────────────────────────────────┐ │
│ │ ┌ Growth Partner (recommended)  from R15,000 + R750 pm ──────────┐ │ │
│ │ │ ┌ Launch  from R11,500 ─────┐  + business email               │ │ │
│ │ │ │ site, domain, WhatsApp,   │  + Google profile               │ │ + page per service
│ │ │ │ form, POPIA, handover     │  + care plan (1 hr/month)       │ │ + monthly article…
│ │ │ └───────────────────────────┘                                  │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ Every project gets a written quotation.          [Compare packages]    │
├───────────────────────────────────────────────────────────────────────┤
│ How we work  (a real sequence, so numbered)                            │
│ 1 Chat ── 2 Written quote ── 3 Build & review ── 4 Launch ── 5 Monthly care │
├───────────────────────────────────────────────────────────────────────┤
│ Recent work   [screenshot 7 cols]   Lins-Wise Accountants Inc.        │
│                                     one-line brief  [Read the case study] │
│   (section is left out automatically while the case study is a draft) │
├───────────────────────────────────────────────────────────────────────┤
│ ███ ink band: Tell us what your business needs.                    ███ │
│ ███ You'll get a written quotation. [Request a quote] [WhatsApp]   ███ │
├───────────────────────────────────────────────────────────────────────┤
│ footer                                                          (WA ●) │
└───────────────────────────────────────────────────────────────────────┘
```
At 390px: headline, then buttons, then the browser frame and the checklist (shortened to the finished state on very small screens if the animation crowds it). Service rows stack with the artefact under the text. The ladder becomes three bands: "Launch", then "Growth Partner: everything in Launch, plus…", then "Premium: everything in Growth Partner, plus…".

### Service page (one template, a different artefact per service)

```
Services / Business email
┌──────────────────────────────────┬────────────────────────────────┐
│ H1 Business email on your own    │  [artefact: DNS records panel] │
│ domain                           │  MX   …mail.protection.outlook  │
│ lead (2 lines)                   │  TXT  v=spf1 include:… -all     │
│ [Request a quote] [Ask on WhatsApp] │  CNAME selector1._domainkey  │
└──────────────────────────────────┴────────────────────────────────┘
What's included        ✓ … (two-column checklist)
Who it's for           3 short situations in prose, e.g. "You're still on @gmail.com…"
How it works           numbered only where it's a real sequence
What we need from you  e.g. domain login, Microsoft 365 licence choice
Included in            Growth Partner, Premium  → Compare packages
Questions              <details> accordions (no JS)
CTA band
```
Artefacts: **Websites**: mini responsive page at two widths. **Care plans**: monthly care log (uptime check, updates, backups). **Email**: DNS records. **Google profile**: listing card with hours and directions. **Domains & DNS**: domain record with renewal date and registrar lock. **6th**: to suit.

### Pricing

```
H1 Packages and prices
Lead · "Every project gets a written quotation." · VAT line [placeholder]
[ Launch | Growth Partner (recommended) | Premium ]     ← ARIA tabs, arrow keys
┌ Growth Partner ─────────────────────────────────────────────────────┐
│ Once-off  from R15,000    Monthly  R750    First year  from R24,000  │
│ What's included ✓ …                      Suits: …                   │
│ [Request a quote for Growth Partner]  (pre-selects it on the form)  │
└─────────────────────────────────────────────────────────────────────┘
Full comparison table (feature rows × 3 packages; sticky header;
on phones it scrolls inside its own container, never the page)
What "from" means · what 1 hour of updates covers · what's not included ·
care plan notice period  [placeholders where I need your terms]
```
First-year totals are simple arithmetic from your prices: Launch R11,500; Growth R15,000 + 12 × R750 = R24,000; Premium R26,500 + 12 × R1,650 = R46,300. They're useful to an owner budgeting. Say if you'd rather not show them.

### Work → Lins-Wise case study

```
Work / Lins-Wise Accountants Inc.
H1 + one-line summary
Facts strip: Client | Services delivered | Live site [LIVE URL]
Screenshot (AVIF/WebP, desktop + phone) [you supply or permit me to capture]
The brief / Our approach / The outcome   ← only facts you give me; [PLACEHOLDER] otherwise
CTA
```
Ships with `draft: true`: not in the nav, the sitemap or the home page, and `noindex`. Flip one flag to publish.

### About

```
H1 About Magubane Digital
[Portrait placeholder]   Neo's story: [PLACEHOLDER paragraphs from you]
How we work: commitments [each marked CONFIRM], e.g.
  written quotation before any work · you own your domain and accounts ·
  plain-language monthly report · POPIA-minded by default
Company details: CIPC [pending], based in [CITY/PROVINCE], serving clients nationwide
```

### Contact / Request a quote

```
H1 Request a quote                       │ Prefer to talk?
Step 2 of 4: Services needed  ▬▬▬▭▭       │ WhatsApp [PHONE]
☐ Website  ☐ Care plan  ☐ Business email   │ Email [EMAIL]
☐ Google profile  ☐ Domains & DNS  ☐ …     │ Hours [HOURS] SAST
[Back]                      [Continue]    │
```
- **Steps:** 1 Business type (radio) → 2 Services needed (checkboxes, pre-ticked from `?package=` or `?service=`) → 3 Budget band (Under R11,500 / R11,500–R15,000 / R15,000–R26,500 / Over R26,500 / Not sure yet) → 4 Contact details (name, business, email, WhatsApp number, preferred contact, message, POPIA consent).
- **Final button:** "Send quote request". **Success:** "Quote request sent. Neo will reply within [X] working days." **Error:** "Your request didn't send. Send the same details on WhatsApp or by email instead." Both buttons are pre-filled with the full summary.
- Validation per step with messages linked via `aria-describedby`. Focus moves to the step heading on Continue and to the error summary on failure. Honeypot `_honey`. State lives in memory only.
- **Without JavaScript:** all four fieldsets show as one form and post normally to FormSubmit, which redirects to `/contact/sent/`.

### Privacy, terms, 404

- **Privacy (POPIA):** what's collected (form fields only), why, the operator (FormSubmit) and that data passes to it, cross-border note, retention, rights, Information Officer, Information Regulator contact. No cookies, no analytics, fonts self-hosted.
- **Terms:** site terms plus ECT Act s43-style disclosures (legal name, status, registration number, physical address, contact).
- **404:** "That page isn't here." with a small checklist where one item stays unticked, then links to Home, Services, Pricing and Request a quote.

---

## 5. Build and engineering

- **Shared header and footer without runtime JS:** a zero-dependency Node build script (`build.mjs`) stitches partials into plain HTML pages, injects per-page title, description and Open Graph tags, writes `sitemap.xml`, and fails if a page is missing metadata. Visitors get pure static HTML; you edit one header file.
- **All placeholders in one file:** `site.config.json` holds phone, email, domain, CIPC number, hours, address and so on. The build fills them everywhere (including JSON-LD and wa.me links) and prints a report of anything still unfilled.
- **Deploy:** GitHub Actions workflow builds and publishes to Pages on every push to `main`, so there's no "forgot to rebuild" risk. The README also covers the branch-deploy alternative and custom domain, DNS, HTTPS and FormSubmit activation.
- **Structure:**
  ```
  src/pages/  src/partials/  src/assets/{css,js,fonts,img,logo}
  site.config.json  build.mjs  .github/workflows/deploy.yml
  tests/  README.md  PLACEHOLDERS.md
  ```
- **JS (vanilla, deferred, about 10 KB):** nav menu, hero sequence, pricing tabs, quote form. Nothing else.
- **Budgets:** under 200 KB per page excluding images, with a target of about 160 KB including the font. Every image is AVIF with WebP fallback, with explicit width and height.
- **Testing:** Playwright screenshots at 390, 768 and 1440 for every page; scripted tests for every form state (FormSubmit mocked for success, server error and network failure), WhatsApp links, keyboard-only navigation and no horizontal scroll at any width from 320 to 1920; axe-core accessibility scan; Lighthouse on every page (target 95+ on all four); HTML validation. Dev tooling only, nothing shipped.

---

## 6. Where your brief could be stronger (flagged honestly)

1. **GitHub Pages terms.** FACT: GitHub says Pages "is not intended for or allowed to be used as a free web-hosting service to run your online business, e-commerce site, or any other website that is primarily directed at either facilitating commercial transactions…". INFERENCE: a brochure site that sells nothing on-page is a grey area, probably tolerated, but not clearly safe. RECOMMENDATION: fine to launch, but the output is host-agnostic, so Cloudflare Pages or Netlify is a drop-in move if you want zero ambiguity. You'll also want a host for client sites under the care plan that isn't GitHub Pages.
2. **FormSubmit is a third party receiving personal information.** That conflicts slightly with "no visitor data to third parties". It must be named in the POPIA notice as an operator, possibly with cross-border transfer (I couldn't confirm where it stores data; that's an ASSUMPTION to check). Its AJAX endpoint exposes your email until you switch to the alias string it gives you after activation. AJAX mode has no CAPTCHA, so spam relies on the honeypot. It has no SLA, which is why the WhatsApp/email fallback matters.
3. **Open Graph images can't be AVIF/WebP-only.** WhatsApp and Facebook link previews need PNG or JPEG. Since your audience shares links on WhatsApp, OG images will be compressed PNG/JPEG, the one exception to the image rule.
4. **ECT Act disclosures.** Section 43 lists details a supplier selling via electronic transactions must show (legal name and status, physical address, registration number, etc.). INFERENCE: since quotes are concluded offline, it may not strictly apply, but showing them is cheap and builds trust. You'll need a physical or business address you're comfortable publishing.
5. **VAT.** Prices need a line: not VAT-registered, excl. VAT or incl. VAT.
6. **Case study.** Without permission and real outcome facts, the page can't go live. It's built as a hidden draft so it doesn't block launch.
7. **About commitments** ("you own your domain", report cadence, response time) are promises. I'll draft them as CONFIRM placeholders rather than state them as policy.

---

## 7. Placeholders I'll need (initial list; a final PLACEHOLDERS.md comes with the build)

Phone (international format) · email · domain · CIPC number · business hours · city/province · physical/business address for ECT disclosure · VAT status · reply time for quote requests · sixth service · Neo's story and photo · About commitments · Lins-Wise permission, live URL, brief, approach, outcome, screenshot · care plan notice period and what's excluded · Information Officer details.
