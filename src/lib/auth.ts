export type Role = 'admin' | 'estudiante';

export interface Profile {
  id: string;
  full_name: string;
  student_code: string | null;
  email: string;
  role: Role;
}

/** Rutas sin sesión. */
export const PUBLIC_PATHS = ['/login', '/registro', '/verificar', '/robots.txt', '/sitemap.xml', '/llms.txt', '/llm.txt'];

/** Rutas que un estudiante puede visitar; todo lo demás es solo para admin. */
const STUDENT_PATHS = ['/mi-panel', '/api/logout'];

export function homeFor(profile: Profile | null): string {
  return profile?.role === 'admin' ? '/' : '/mi-panel';
}

export function canAccess(profile: Profile | null, pathname: string): boolean {
  if (profile?.role === 'admin') return true;
  return STUDENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Escapa % y _ para usar un valor con ilike como comparación exacta sin mayúsculas. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
