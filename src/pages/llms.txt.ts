import type { APIRoute } from 'astro';
import { DEFAULT_DESCRIPTION, PUBLIC_PAGES, SITE_NAME, siteOrigin } from '../lib/seo';

/** Formato de https://llmstxt.org: resumen del sitio en Markdown para modelos de lenguaje. */
export const GET: APIRoute = ({ url, site }) => {
  const origin = siteOrigin(url, site);
  const links = PUBLIC_PAGES.map((page) => `- [${page.title}](${new URL(page.path, origin)}): ${page.description}`).join('\n');

  const body = `# ${SITE_NAME}

> ${DEFAULT_DESCRIPTION}

GIRSI es un semillero de investigación. Esta aplicación la usan:

- Administradores del laboratorio: registran préstamos de equipos (Raspberry Pi, sensores y otros), gestionan el inventario y asignan estudiantes a proyectos.
- Estudiantes registrados: consultan los equipos que tienen prestados, sus fechas de devolución y los proyectos en los que participan.

El contenido de préstamos, inventario y proyectos es privado y requiere iniciar sesión; no está disponible para indexación.

## Páginas públicas

${links}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
