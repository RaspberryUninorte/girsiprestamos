import type { APIRoute } from 'astro';
import { PUBLIC_PAGES, siteOrigin } from '../lib/seo';

// Solo páginas públicas: el resto del sitio requiere sesión y es noindex.
export const GET: APIRoute = ({ url, site }) => {
  const origin = siteOrigin(url, site);
  const urls = PUBLIC_PAGES.map((page) => `  <url>\n    <loc>${new URL(page.path, origin)}</loc>\n  </url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
