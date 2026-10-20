export const SITE_NAME = 'GIRSI Préstamos';

export const DEFAULT_DESCRIPTION =
  'Plataforma del semillero de investigación GIRSI para gestionar el préstamo de equipos de laboratorio y consultar préstamos y proyectos de los estudiantes.';

/** Imagen para redes sociales (1200x630), en /public. */
export const OG_IMAGE_PATH = '/og-image.png';

/** Páginas públicas e indexables: son las únicas en sitemap.xml y llms.txt. */
export const PUBLIC_PAGES = [
  { path: '/login', title: 'Iniciar sesión', description: 'Acceso para administradores del laboratorio y estudiantes registrados.' },
  { path: '/registro', title: 'Registro de estudiantes', description: 'Crea tu cuenta para consultar tus préstamos de equipos y tus proyectos en GIRSI.' },
];

/**
 * Origen público del sitio. Usa `site` de astro.config.mjs si está definido
 * (recomendado en producción, para que canónicos y sitemap no dependan del
 * host de la petición) y si no, el origen de la petición actual.
 */
export function siteOrigin(requestUrl: URL, site: URL | undefined): string {
  return (site ?? requestUrl).origin;
}
