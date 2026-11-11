// Static SEO audit of the built site. Run after `npm run build`: node scripts/seo-check.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const notes = [];
const warn = (page, msg) => problems.push(`${page}: ${msg}`);

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const titles = new Map();
const descs = new Map();
// build.format 'directory': dist/about/index.html is served at /about (and 404.html stays a file).
const allPaths = new Set(htmlFiles.map((f) => '/' + f.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/(.)\/$/, '$1')));

const attr = (tag, name) => {
  const v = (tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')) ?? [])[1];
  // A bare attribute (e.g. `alt`) is how Astro serialises an empty string.
  return v ?? (new RegExp(`\\s${name}(\\s|>|/)`, 'i').test(tag) ? '' : undefined);
};

for (const file of htmlFiles) {
  const page = '/' + file.slice(DIST.length + 1);
  const html = readFileSync(file, 'utf8');
  const isPrivate = page.startsWith('/studio/') || page === '/404.html';

  const title = ((html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '').replace(/&amp;/g, '&');
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) ?? [])[1];
  const robots = (html.match(/<meta name="robots" content="([^"]*)"/) ?? [])[1];
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  if (!title) warn(page, 'missing <title>');
  else {
    if (title.length > 65) warn(page, `title ${title.length} chars (>65): "${title}"`);
    if (titles.has(title)) warn(page, `duplicate title with ${titles.get(title)}`);
    titles.set(title, page);
  }
  if (!isPrivate) {
    if (!desc) warn(page, 'missing meta description');
    else {
      if (desc.length < 70 || desc.length > 165) warn(page, `description ${desc.length} chars: "${desc}"`);
      if (descs.has(desc)) warn(page, `duplicate description with ${descs.get(desc)}`);
      descs.set(desc, page);
    }
    if (!canonical) warn(page, 'missing canonical');
    else if (/index\.html|\.html$/.test(canonical) || (new URL(canonical).pathname.length > 1 && canonical.endsWith('/'))) warn(page, `canonical must be a clean URL with no trailing slash: ${canonical}`);
    for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'twitter:image']) {
      if (!html.includes(`"${p}"`)) warn(page, `missing ${p}`);
    }
    if (robots && /noindex/.test(robots)) warn(page, 'public page is noindex');
  } else if (page.startsWith('/studio/') && !(robots ?? '').includes('noindex')) {
    warn(page, 'private page is missing noindex');
  }
  if (h1s !== 1) warn(page, `${h1s} <h1> elements`);
  if (!/<html[^>]*lang="en-GB"/.test(html)) warn(page, 'html lang is not en-GB');

  // Heading order: no level skipped by more than one
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  levels.forEach((l, i) => { if (i && l - levels[i - 1] > 1) warn(page, `heading jump h${levels[i - 1]} → h${l}`); });

  // Images
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const alt = attr(tag, 'alt');
    if (alt === undefined) warn(page, `<img> without alt: ${tag.slice(0, 90)}`);
    if (!tag.includes('data-img') && (!attr(tag, 'width') || !attr(tag, 'height'))) warn(page, `<img> without width/height: ${(attr(tag, 'src') ?? '').slice(0, 70)}`);
  }

  // JSON-LD
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const types = [];
  for (const b of blocks) {
    try {
      const data = JSON.parse(b[1]);
      const graph = data['@graph'] ?? [data];
      for (const node of graph) {
        types.push(node['@type']);
        if (!node['@type']) warn(page, 'JSON-LD node without @type');
        if (node['@type'] && /LocalBusiness|BeautySalon/.test([].concat(node['@type']).join())) {
          if ('aggregateRating' in node || 'review' in node) warn(page, 'invented rating/review in schema');
          if ('priceRange' in node || 'openingHours' in node || 'openingHoursSpecification' in node) warn(page, 'invented price/hours in schema');
        }
      }
    } catch (e) {
      warn(page, `invalid JSON-LD: ${e.message}`);
    }
  }
  if (types.length) notes.push(`${page.padEnd(42)} schema: ${types.flat().join(', ')}`);

  // Links
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    const href = attr(m[0], 'href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith('http://')) warn(page, `insecure link ${href}`);
      if (attr(m[0], 'target') === '_blank' && !/noopener/.test(attr(m[0], 'rel') ?? '')) warn(page, `target=_blank without noopener: ${href}`);
      continue;
    }
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    const isFile = /\.[a-z0-9]+$/i.test(clean);
    if (!isFile && clean.length > 1 && clean.endsWith('/')) warn(page, `internal link with a trailing slash (causes a redirect): ${href}`);
    const asset = isFile && existsSync(join(DIST, clean));
    if (!allPaths.has(clean) && !asset) warn(page, `broken internal link ${href}`);
  }
}

// Sitemap / robots
const sm = existsSync(join(DIST, 'sitemap-0.xml')) ? readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8') : '';
const smUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!smUrls.length) warn('sitemap', 'no URLs found in sitemap-0.xml');
if (smUrls.some((u) => u.includes('/studio'))) warn('sitemap', 'contains private /studio URL');
if (smUrls.some((u) => /\.html|\/404/.test(u))) warn('sitemap', 'contains .html or 404 URL');
const robotsTxt = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
if (!/Sitemap:/i.test(robotsTxt)) warn('robots.txt', 'no Sitemap line');

console.log(notes.join('\n'));
console.log(`\n${htmlFiles.length} pages, ${smUrls.length} sitemap URLs`);
console.log(problems.length ? `\n${problems.length} issue(s):\n- ` + problems.join('\n- ') : '\nNo issues found.');
process.exit(problems.length ? 1 : 0);
