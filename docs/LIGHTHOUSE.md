# Testing & Lighthouse report

Everything below was measured on the **production build** (`npm run build`, served with `astro preview` on localhost), not estimated. Re-run it yourself after you add your real photographs, because image weight is the main thing that will change.

> **Important caveat.** The photographs currently in the repository are neutral **placeholders** (soft gradients), so image decoding and transfer cost is lower than it will be with real bridal photography. Expect LCP to rise once you upload real images. The responsive AVIF/WebP pipeline, `fetchpriority` on the hero and lazy loading below the fold are all in place to keep it low, but you should re-audit after uploading photos.

## Lighthouse 13.6 (headless Chrome, simulated throttling)

Mobile uses Lighthouse's default mobile profile. Desktop uses `--preset=desktop`.

| Page | Device | Perf | A11y | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | Mobile | 99 | 100 | 100 | 100 | 1.9 s | 0 | 0 ms |
| Home | Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0.001 | 0 ms |
| About | Mobile | 98 | 100 | 100 | 100 | 2.4 s | 0.019 | 0 ms |
| About | Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0.001 | 0 ms |
| Services | Mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Services | Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.015 | 0 ms |
| Service (Bridal Makeup) | Mobile | 98 | 100 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Service (Bridal Makeup) | Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.001 | 0 ms |
| Portfolio | Mobile | 99 | 100 | 100 | 100 | 2.3 s | 0 | 0 ms |
| Portfolio | Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0.001 | 0 ms |
| Contact | Mobile | 98 | 100 | 100 | 100 | 2.4 s | 0.013 | 0 ms |
| Contact | Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.02 | 0 ms |
| Blog index | Mobile | 98 | 100 | 100 | 100 | 2.5 s | 0 | 0 ms |
| Blog index | Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0.003 | 0 ms |

Target was 95+ in every category: met on every page tested.

Not audited with Lighthouse: `/testimonials`, `/terms`, blog articles, `/404` and `/studio/quote` (private). They share the same layout, CSS and scripts as the pages above.

### Issues found and fixed during the audit

| Finding | Fix |
| --- | --- |
| Accessible name "Beauty by Nam, home" did not contain the visible logo text (label-content-name-mismatch). | Removed the `aria-label` on the header logo link, so the visible text is the name. |
| Portfolio: first gallery image (the LCP element) was `loading="lazy"` and not prioritised. | The first three gallery images now load eagerly with high priority. |
| Mobile menu hid the logo and close button behind the full-screen panel, so touch users could not see how to close it. | Header now sits above the menu panel. Verified by tapping the toggle on an emulated phone. |
| Vite warning about a dynamic and static import of the same logo. | Made the import static. |
| Large-chunk warning (PDFKit and its font data, about 530 kB). | Only loaded by the private `/studio/quote` page, so public pages never fetch it (checked: no public page references that script). Warning limit raised with a comment explaining why. |
| Home page layout shift of 0.27 to 0.42 (round 2 light redesign): the hero headline reflowed when the web fonts swapped in. | Preloaded the three font files used above the fold (Cormorant Garamond Light and Light Italic, DM Sans Light). CLS dropped to 0 to 0.001 and mobile Performance went from 84 to 98. |
| Titles over 65 characters on the home page and Party & Occasion service. | Shortened. |

### A note on one misleading result

An early run reported "Speed Index 6 to 15 s" and a score of 90. This was an environment artefact (Lighthouse's headless Chrome waiting on a proxy lookup for `127.0.0.1`), not a site problem: the server responds in about 3 ms. Re-running with `--no-proxy-server` gave 99 to 100. The numbers above use that setting.

## Automated checks (scripts in `scripts/`)

| Command | What it checks | Result |
| --- | --- | --- |
| `npx astro check` | TypeScript and Astro diagnostics | 0 errors, 0 warnings, 0 hints |
| `npm run build` | Production build | 16 pages, no warnings |
| `npm run check:cms` | `.pages.yml` field names and categories match every JSON/Markdown content file (nothing unused, nothing missing) | Pass |
| `npm run check:seo` | Per page: unique title and description, canonical, Open Graph and Twitter tags, one `<h1>`, heading order, `lang="en-GB"`, every `<img>` has alt, width and height, JSON-LD parses and has no invented rating, hours or price, internal links resolve, external links have `rel="noopener"`, sitemap excludes `/studio` and `404`, robots.txt has a Sitemap line | No issues |

`.pages.yml` was also validated against Pages CMS's own configuration schema (copied from its source, with the field-type registry stubbed) and a deliberately broken copy was confirmed to be rejected.

## Browser tests (headless Chrome via puppeteer)

| Area | Result |
| --- | --- |
| No horizontal overflow, 11 pages at 360, 390, 768, 820, 1024 and 1440 px | Pass |
| No console or page errors at any of those widths | Pass |
| Mobile menu: opens, `aria-expanded` updates, Escape closes, focus returns to the button, toggle is tappable above the open panel | Pass |
| Lightbox: Enter opens, arrow keys navigate, Escape closes, focus returns to the thumbnail | Pass |
| Portfolio category filters hide and show items | Pass |
| Contact form: empty submit shows seven field errors, fields get `aria-invalid`, focus moves to the first invalid field | Pass |
| No JavaScript: nothing stays hidden, form still posts to `/api/enquiry`, success and error states appear via `#form-success` / `#form-error`, all eight gallery images render | Pass (after fixing a bug, below) |
| `prefers-reduced-motion`: reveal classes not applied, everything visible immediately, no running animations | Pass |
| Quote builder: line totals, subtotal, VAT 20% toggle, deposit and balance maths; draft survives reload; validation message; PDF downloads | Pass |

Bug found by these tests and fixed: the no-JavaScript confirmation relied on a script reading `?enquiry=sent`, so it never appeared without JavaScript. It now uses CSS `:target` with `#form-success` / `#form-error` redirects.

### Quote PDF

Sample quote: £250 + 3 x £65.50 + £180 + £45 travel = £671.50 subtotal, VAT £134.30, total £805.80, £100 deposit, balance £705.80. The generated PDF matched exactly. Page 1 has the transparent logo on ivory, the "A little about us" text and the thank-you message; page 2 has the itemised quote, totals and a line saying the full terms are on the website (no raw URL). The logo was confirmed to carry an alpha mask, so it is transparent in the PDF.

## Cloudflare Functions (run locally with `wrangler pages dev`, bound to 127.0.0.1)

| Test | Result |
| --- | --- |
| `/studio/quote` without credentials | 401 with `WWW-Authenticate` |
| `/studio/quote` with wrong password | 401 |
| `/studio/quote` with correct credentials | 200, `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store` |
| `POST /api/enquiry` with empty body or invalid email | 400, generic `invalid_request` |
| Honeypot field filled | 200 `{"ok":true}`, nothing sent |
| Valid enquiry but email not configured | 503, generic `unavailable` (no internals leaked) |
| `GET /api/enquiry` | 405 |
| No-JS form post | 303 redirect to `/contact#form-error` |
| Personal data in server logs | None |

## Not tested (needs your accounts or real deployment)

- **Actual email delivery.** Needs your Resend API key and `ENQUIRY_TO_EMAIL` set in Cloudflare. Send a real test enquiry after deploying.
- **Pages CMS editing in the live editor.** The configuration is schema-valid and consistent with the content, but the editor itself needs your GitHub login. Follow the checklist in the README.
- **Lighthouse on the deployed Cloudflare URL** (real CDN, HTTP/2 or 3 and compression). Local numbers will be close, not identical.
- **`npx motion-ai`.** It is interactive. See the README.
- **OpenSEO live-data tools** (keyword volumes, rank tracking, site audit by URL) need a public URL and credits; run them after launch.
