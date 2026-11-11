# Beauty by Nam

Website for **Beauty by Nam**, a bridal hair and makeup artist based in Leicester, UK.

- Static [Astro](https://astro.build) site, Tailwind CSS 4 plus a small custom design system (`src/styles/global.css`)
- Content managed through [Pages CMS](https://pagescms.org) (`.pages.yml`), stored as JSON and Markdown in this repository
- Hosted on Cloudflare Pages, redeployed automatically on every Git commit
- Subtle [Motion](https://motion.dev) animation, switched off for visitors who prefer reduced motion
- Booking enquiry form that really sends email (Cloudflare Pages Function + Resend)
- Private PDF quote builder at `/studio/quote` (PDFKit, runs in the browser)

Test results are in [`docs/LIGHTHOUSE.md`](docs/LIGHTHOUSE.md).

---

## 1. Requirements

- Node.js **22.23.4 or newer** (see `.node-version`)
- npm

## 2. Install and run locally

```bash
npm install
npm run dev        # http://localhost:4321 (development server)
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
```

Quality checks:

| Command | What it does |
| --- | --- |
| `npm run check` | Astro/TypeScript type check |
| `npm run check:cms` | Confirms every field in `.pages.yml` matches the content files and the gallery categories |
| `npm run check:seo` | Reads the built `dist/`: titles, descriptions, canonicals, Open Graph, headings, JSON-LD, sitemap, robots, alt text |
| `npm run verify` | Runs all of the above after a fresh build |

## 3. Project structure

```
.pages.yml               Pages CMS configuration
functions/
  api/enquiry.ts         Enquiry form endpoint (Cloudflare Pages Function)
  studio/_middleware.ts  Password protection for /studio/*
scripts/                 prepare-assets, check-cms, seo-check
src/
  assets/brand/          Logo files used by the site
  assets/media/          All CMS-managed photography (hero, about, services, gallery, instagram, blog, cta, social)
  components/            Header, Footer, Photo, GoldRing, Breadcrumbs, etc.
  content/               Everything the owner edits (site/*.json, services/, blog/, legal/)
  layouts/Base.astro     Head, SEO, Open Graph, JSON-LD, shell
  lib/                   media helpers, schema.org builders, quote PDF generator
  pages/                 Routes
  scripts/site.ts        The only client script for public pages (menu, reveals, lightbox, filters)
  styles/global.css      Design tokens and bespoke styling
public/                  Favicons, logo, static files
docs/LIGHTHOUSE.md       Test and Lighthouse report
brand/                   Original logo files (not shipped)
```

## 4. GitHub

The repository already exists with the remote set to `https://github.com/mihirrh/beautybynam.git`. Nothing has been committed yet. When you are ready:

```bash
git add -A
git status          # check that no .env, .dev.vars or .qa files are listed
git commit -m "Build Beauty by Nam website"
git push -u origin main
```

`.env`, `.dev.vars`, `.wrangler/`, `.qa/`, `dist/` and `node_modules/` are git-ignored. Never commit secrets.

## 5. Deploy on Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose `beautybynam`.
2. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Environment variables (Settings → Variables and secrets), for both Production and Preview:
   - `NODE_VERSION` = `22.23.4` (or newer)
   - `SITE_URL` = your live address, for example `https://www.beautybynam.co.uk`. Canonical URLs, sitemap and structured data all use this. Until you set it, the site assumes `https://beautybynam.pages.dev`.
4. Add the **secrets** listed in section 6.
5. Deploy. The `functions/` folder is detected automatically.
6. Custom domain: Pages project → **Custom domains** → add your domain, then update `SITE_URL` and redeploy.

After this, every commit to `main` (including CMS edits) rebuilds and publishes the site.

## 6. Secrets and environment variables

Set these as **encrypted secrets** in Cloudflare (Pages project → Settings → Variables and secrets). None are needed to build the site, but the form and quote builder will not work without them.

| Name | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from [resend.com](https://resend.com) (free tier) used to email enquiries |
| `ENQUIRY_TO_EMAIL` | yes | Where enquiries are delivered |
| `ENQUIRY_FROM_EMAIL` | no | Sender, e.g. `Beauty by Nam <enquiries@yourdomain.co.uk>`. Defaults to `onboarding@resend.dev` |
| `STUDIO_USER` | yes | Username for `/studio/*` |
| `STUDIO_PASSWORD` | yes | Password for `/studio/*`. Use a long, unique one |

**Resend sender caveat.** Until you verify your own domain in Resend, the default `onboarding@resend.dev` sender can only deliver to the email address you registered with Resend. For enquiries to reach any other address, verify your domain in Resend and set `ENQUIRY_FROM_EMAIL`.

If email is not configured, the form returns a clear, generic "could not send" message and shows the direct contact details. It never pretends a message was sent. If `STUDIO_USER` or `STUDIO_PASSWORD` is missing, `/studio` stays locked (503) rather than open.

### Testing the Functions locally

```bash
printf 'RESEND_API_KEY=re_xxx\nENQUIRY_TO_EMAIL=you@example.com\nSTUDIO_USER=nam\nSTUDIO_PASSWORD=choose-something-long\n' > .dev.vars
npm run build
npx wrangler pages dev dist --ip 127.0.0.1
```

`.dev.vars` is git-ignored. Delete it when finished.

## 7. Private quote builder

Open `/studio/quote` (you will be asked for the `STUDIO_USER` / `STUDIO_PASSWORD` login).

- Enter customer name, email, event date and time, venue, and any number of line items with prices, plus a separate **Travel** line (travel is always charged in addition).
- **VAT (20%)** switch adds or removes VAT. Optional deposit and notes.
- **Download PDF** produces: page 1 with logo, about the business and a thank-you message; then the itemised quote with totals, deposit, balance and key terms.
- The PDF is generated entirely in your browser with PDFKit. Customer details are not sent to or stored on any server. A draft is kept in that browser's local storage so a refresh will not lose your work.
- The page is `noindex`, sent with `no-store` headers, excluded from the sitemap and disallowed in `robots.txt`.
- The wording on page 1, payment details and terms summary are editable in Pages CMS under **Quote PDF**.

For stronger protection you can instead put `/studio/*` behind **Cloudflare Access** (Zero Trust, free for small teams) and remove the Basic Auth middleware.

## 8. Pages CMS: connecting and editing

**Connect**

1. Go to [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub.
2. Install the Pages CMS GitHub app on `mihirrh/beautybynam` and open the repository on branch `main`.
3. Pages CMS reads `.pages.yml` and shows the sections below. To let the owner edit, add her as a collaborator on the repository (or let her sign in with her own GitHub account).

**What each section edits**

| CMS section | Controls |
| --- | --- |
| Business details & navigation | Name, tagline, email, phone, Instagram, location text, navigation and footer |
| Search & social settings | Title, description and sharing image for each page |
| Home page | Hero text and photo, intros, closing call to action |
| About page | Story, approach, "Training & experience" (only fill with facts you can verify), photos |
| Contact page | Introduction and contact text |
| FAQs | Questions and answers (also used for FAQ structured data) |
| Portfolio gallery | Add, remove, reorder photos, set category, alt text, caption. Tick **Show on home page** for featured looks |
| Testimonials | Real client feedback only. Leave empty until you have permission to publish |
| Instagram gallery | Curated images with links to the original posts |
| Services | The four service pages, descriptions, inclusions, optional price |
| Journal (blog) | Articles. Use the **Draft** toggle to hide an unfinished post |
| Terms & Conditions | Terms page text |
| Quote PDF | Text used in the quote PDF |

**Images** are uploaded to `src/assets/media/<folder>` in the repository, then optimised automatically (AVIF/WebP, responsive sizes) at build time. Upload the largest, best quality original (JPEG, ideally 2000 px or wider on the long edge). Always fill in the alt text field describing what is shown.

**Publishing.** Saving in Pages CMS commits to GitHub; Cloudflare then rebuilds, usually within a couple of minutes.

## 9. Instagram

The Instagram section is a **curated gallery**, not a live feed. Instagram has no free, reliable, token-free way to embed a live feed on a static site, and scraping would be fragile and against their terms. So the homepage strip shows images you choose in Pages CMS, clearly links to [@beautybynamm](https://www.instagram.com/beautybynamm/), and never claims to be live. No Instagram scripts or access tokens are used.

## 10. Tooling notes (please read)

- **Motion.** The `motion` package is installed and used. `npx motion-ai` is an interactive installer and was **not run** during the build. Run it yourself in a terminal if you want the Motion AI tooling: `npx motion-ai`.
- **Open SEO.** The `seo-audit`, `local-seo` and `keyword-research` skills from [every-app/open-seo](https://github.com/every-app/open-seo) are installed in `.claude/skills/`. The site was reviewed with `npm run check:seo` (metadata, canonicals, JSON-LD, sitemap, headings, alt text, internal links). The OpenSEO data tools (keyword volumes, live site audit, rank tracking) need a public URL and use credits, so run them after launch.

## 11. Before launch checklist

The site ships with neutral placeholder photographs and editable placeholder text. Replace or confirm:

- [ ] Photography: hero, about, services, gallery, Instagram, blog, social sharing image (`src/assets/media/…`) and the matching **alt text**
- [ ] Email address and phone number in Business details (blank values are hidden everywhere, including structured data)
- [ ] Testimonials (real ones only)
- [ ] Service descriptions and prices (prices are optional; none are invented)
- [ ] About page "Training & experience" (only verifiable facts)
- [ ] Bank/payment details under Quote PDF
- [ ] `SITE_URL` in Cloudflare and Cloudflare secrets (section 6)
- [ ] Logo files if you have final versions: `src/assets/brand/` and `public/`
- [ ] **Terms & Conditions.** The text is a sensible template (including that travel costs are charged in addition) but is not legal advice. Review it, ideally with a professional
- [ ] Re-run `npm run verify` and Lighthouse once real photos are in

## 12. Browser support and accessibility

Semantic HTML, keyboard-operable menu and lightbox with visible focus, labelled form fields with accessible errors, and full `prefers-reduced-motion` support. The public site works without JavaScript apart from the lightbox, filters and animation.
