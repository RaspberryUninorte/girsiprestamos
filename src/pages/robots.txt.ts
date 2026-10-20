import type { APIRoute } from 'astro';
import { siteOrigin } from '../lib/seo';

// Las pantallas privadas no se bloquean aquí: redirigen a /login sin sesión
// y llevan <meta name="robots" content="noindex">, que el crawler debe poder leer.
export const GET: APIRoute = ({ url, site }) => {
  const origin = siteOrigin(url, site);
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /auth/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
