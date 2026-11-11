import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://beautybynam.pages.dev');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /studio',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', base)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
