import type { Role } from './auth';

export interface NavItem {
  href: string;
  label: string;
  /** Etiqueta para la barra inferior en celular, si `label` no cabe (~58px por ítem en 360px). */
  shortLabel?: string;
  icon: string;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', shortLabel: 'Inicio', icon: 'dashboard' },
  { href: '/prestamos', label: 'Préstamos', icon: 'assignment_return' },
  { href: '/inventario', label: 'Inventario', icon: 'inventory_2' },
  { href: '/estudiantes', label: 'Estudiantes', shortLabel: 'Alumnos', icon: 'group' },
  { href: '/proyectos', label: 'Proyectos', icon: 'science' },
  { href: '/historial', label: 'Historial', icon: 'history' },
];

const STUDENT_NAV_ITEMS: NavItem[] = [{ href: '/mi-panel', label: 'Mi panel', icon: 'person' }];

export function navItemsFor(role: Role | undefined): NavItem[] {
  return role === 'admin' ? ADMIN_NAV_ITEMS : STUDENT_NAV_ITEMS;
}

export function isActiveNavItem(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
