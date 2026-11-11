// One-off asset preparation. Run with: node scripts/prepare-assets.mjs
// - Trims the supplied logo and writes site / favicon / social variants.
// - Generates neutral, clearly-placeholder photography so every layout can be
//   reviewed before real photographs are uploaded through Pages CMS.
// Existing files in src/assets/media are NEVER overwritten, so real photos
// uploaded later are safe if this script is re-run.
import sharp from 'sharp';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = (...p) => path.join(root, ...p);
const exists = (f) => access(f).then(() => true, () => false);

/* ---------------------------------------------------------------- logo */
await mkdir(out('src/assets/brand'), { recursive: true });
await mkdir(out('public'), { recursive: true });

const logoSrc = out('brand/logo-original.png');
// Bounding box of the artwork inside the 500px canvas (measured from alpha).
const pad = 8;
const crop = { left: 89 - pad, top: 112 - pad, width: 386 + pad * 2, height: 303 + pad * 2 };
const logo = await sharp(logoSrc).extract(crop).png({ compressionLevel: 9 }).toBuffer();
await sharp(logo).toFile(out('src/assets/brand/logo.png'));

// Favicon / touch icon: the gold ring on near-black, centred.
const iconCanvas = async (size, file) => {
  const inner = Math.round(size * 0.82);
  const art = await sharp(logoSrc).extract({ left: 95, top: 108, width: 330, height: 320 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#080808' } })
    .composite([{ input: art, gravity: 'centre' }]).png().toFile(out('public', file));
};
await iconCanvas(32, 'favicon-32.png');
await iconCanvas(180, 'apple-touch-icon.png');
await iconCanvas(512, 'icon-512.png');

/* ------------------------------------------------------ placeholder art */
const palettes = [
  ['#6b5440', '#16110d', '#e8d7b5'],
  ['#5e4a47', '#140f0f', '#e8d7b5'],
  ['#665a46', '#13110b', '#d4af37'],
  ['#6e5848', '#15100d', '#e8d7b5'],
];

function art(w, h, seed) {
  const [c1, c2, accent] = palettes[seed % palettes.length];
  const cx = 28 + ((seed * 17) % 44);
  const cy = 30 + ((seed * 23) % 34);
  const r = (n) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const strokes = Array.from({ length: 3 }, (_, i) => {
    const y = h * (0.25 + r(i) * 0.5);
    const x = w * (0.1 + r(i + 4) * 0.4);
    return `<ellipse cx="${x}" cy="${y}" rx="${w * (0.25 + r(i + 8) * 0.25)}" ry="${h * 0.018}" transform="rotate(${-18 + r(i + 2) * 36} ${x} ${y})" fill="${accent}" opacity="${0.07 + r(i) * 0.06}"/>`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="${cx}%" cy="${cy}%" r="85%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
    <radialGradient id="glow" cx="${cx}%" cy="${cy}%" r="40%"><stop offset="0" stop-color="${accent}" stop-opacity=".16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${Math.max(w, h) / 90}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <g filter="url(#blur)">${strokes}</g>
  <ellipse cx="${w * (cx / 100)}" cy="${h * 0.52}" rx="${w * 0.17}" ry="${h * 0.27}" fill="#000" opacity=".28" filter="url(#blur)"/>
  <rect width="100%" height="100%" filter="url(#grain)"/>
</svg>`);
}

const media = [
  ['hero/hero-bride.jpg', 2400, 1400],
  ['about/nam-portrait.jpg', 1200, 1500],
  ['about/working-detail.jpg', 1400, 1000],
  ['services/bridal-makeup.jpg', 1200, 1500],
  ['services/bridal-hair.jpg', 1200, 1500],
  ['services/party-occasion-makeup.jpg', 1200, 1500],
  ['services/destination-weddings.jpg', 1500, 1100],
  ['gallery/bridal-look-01.jpg', 1200, 1600],
  ['gallery/bridal-look-02.jpg', 1600, 1100],
  ['gallery/bridal-look-03.jpg', 1400, 1400],
  ['gallery/bridal-look-04.jpg', 1200, 1600],
  ['gallery/bridal-look-05.jpg', 1200, 1600],
  ['gallery/bridal-look-06.jpg', 1600, 1100],
  ['gallery/bridal-look-07.jpg', 1400, 1400],
  ['gallery/bridal-look-08.jpg', 1200, 1600],
  ['instagram/post-01.jpg', 1080, 1080],
  ['instagram/post-02.jpg', 1080, 1080],
  ['instagram/post-03.jpg', 1080, 1080],
  ['instagram/post-04.jpg', 1080, 1080],
  ['instagram/post-05.jpg', 1080, 1080],
  ['instagram/post-06.jpg', 1080, 1080],
  ['blog/bridal-skincare-preparation.jpg', 1600, 1000],
  ['blog/wedding-morning-timings.jpg', 1600, 1000],
  ['cta/closing-enquiry.jpg', 2000, 1200],
];

let made = 0;
for (const [i, [rel, w, h]] of media.entries()) {
  const file = out('src/assets/media', rel);
  if (await exists(file)) continue;
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(art(w, h, i + 1)).jpeg({ quality: 82, mozjpeg: true }).toFile(file);
  made++;
}
console.log(`placeholder images created: ${made}`);

/* ----------------------------------------------------- social share card */
const og = out('src/assets/media/social/og-default.jpg');
if (!(await exists(og))) {
  await mkdir(path.dirname(og), { recursive: true });
  const logoForOg = await sharp(logo).resize({ height: 420 }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#080808' } })
    .composite([{ input: logoForOg, gravity: 'centre' }])
    .jpeg({ quality: 88, mozjpeg: true }).toFile(og);
}
console.log('done');
