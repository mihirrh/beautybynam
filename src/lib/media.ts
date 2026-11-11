import type { ImageMetadata } from 'astro';

/**
 * Pages CMS stores image paths as repository paths ("/src/assets/media/…").
 * Vite needs those imported statically so Astro can optimise them at build
 * time (AVIF/WebP, responsive widths, intrinsic dimensions).
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/media/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const images = new Map<string, ImageMetadata>(
  Object.entries(modules).map(([path, mod]) => [path, mod.default]),
);

/** Resolve a CMS image path. Fails the build with a helpful message if missing. */
export function media(path: string): ImageMetadata {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  const found = images.get(normalised);
  if (!found) {
    throw new Error(
      `Image not found: "${path}". Upload it through Pages CMS or add it under src/assets/media/.`,
    );
  }
  return found;
}

/** Same as media() but returns undefined for empty values. */
export function mediaOptional(path?: string | null): ImageMetadata | undefined {
  return path ? media(path) : undefined;
}
