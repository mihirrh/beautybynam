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

// brand/nam_logo.png is the supplied transparent logo (1500px square). It is
// trimmed to the artwork so it sits on any background without a bounding box.
// The transparent alpha channel is preserved everywhere: site, PDF and icons.
const logoSrc = out('brand/nam_logo.png');
const trimmed = await sharp(logoSrc).trim({ threshold: 2 }).png({ compressionLevel: 9 }).toBuffer();
// Site/PDF logo: 1200px wide keeps it crisp at 2x on retina and in print.
await sharp(trimmed).resize({ width: 1200 }).png({ compressionLevel: 9 }).toFile(out('src/assets/brand/logo.png'));

// Favicon / touch icon: the logo on soft ivory (icons need a solid tile on iOS).
const IVORY = '#FDFCF0';
const iconCanvas = async (size, file) => {
  const inner = Math.round(size * 0.9);
  const art = await sharp(trimmed).resize(inner, inner, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: IVORY } })
    .composite([{ input: art, gravity: 'centre' }]).png().toFile(out('public', file));
};
await iconCanvas(32, 'favicon-32.png');
await iconCanvas(180, 'apple-touch-icon.png');
await iconCanvas(512, 'icon-512.png');

/* ------------------------------------------------------ placeholder art */
const palettes = [
  ['#efe3d2', '#cdb594', '#8a6a3c'],
  ['#f1e4dc', '#d2b4a6', '#8a6a3c'],
  ['#ece6d6', '#c9bc9a', '#8a6a3c'],
  ['#f2e8dc', '#d6bda2', '#8a6a3c'],
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
    <radialGradient id="glow" cx="${cx}%" cy="${cy}%" r="40%"><stop offset="0" stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="${Math.max(w, h) / 90}"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .34  0 0 0 0 .22  0 0 0 .08 0"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <g filter="url(#blur)">${strokes}</g>
  <ellipse cx="${w * (cx / 100)}" cy="${h * 0.52}" rx="${w * 0.17}" ry="${h * 0.27}" fill="#7a5c3a" opacity=".16" filter="url(#blur)"/>
  <rect width="100%" height="100%" filter="url(#grain)"/>
</svg>`);
}

const media = [
  ['hero/hero-bride.jpg', 1600, 2000],
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
  ['instagram/post-01.jpg', 1080, 1350],
  ['instagram/post-02.jpg', 1080, 1350],
  ['instagram/post-03.jpg', 1080, 1350],
  ['instagram/post-04.jpg', 1080, 1350],
  ['instagram/post-05.jpg', 1080, 1350],
  ['instagram/post-06.jpg', 1080, 1350],
  ['instagram/post-07.jpg', 1080, 1350],
  ['instagram/post-08.jpg', 1080, 1350],
  ['blog/bridal-skincare-preparation.jpg', 1600, 1000],
  ['blog/wedding-morning-timings.jpg', 1600, 1000],
  ['hero/hero-detail.jpg', 1200, 1500],
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
  const logoForOg = await sharp(trimmed).resize({ height: 420 }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: IVORY } })
    .composite([{ input: logoForOg, gravity: 'centre' }])
    .jpeg({ quality: 88, mozjpeg: true }).toFile(og);
}
console.log('done');
