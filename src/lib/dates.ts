const TIMEZONE = 'America/Bogota';
const BOGOTA_UTC_OFFSET = '-05:00'; // Colombia no observa horario de verano.

/** Fecha de hoy en Bogotá, como YYYY-MM-DD (para el valor por defecto de un <input type="date">). */
export function todayInBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA da formato YYYY-MM-DD
}

/** Fecha de mañana en Bogotá, como YYYY-MM-DD. */
export function tomorrowInBogota(): string {
  const tomorrow = new Date(`${todayInBogota()}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

/** Convierte una fecha YYYY-MM-DD (de un <input type="date">) al inicio de ese día en Bogotá, como timestamptz UTC. */
export function bogotaStartOfDayToUtc(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00${BOGOTA_UTC_OFFSET}`).toISOString();
}

/** Un préstamo está atrasado si sigue activo y su devolución esperada ya pasó (hoy en Bogotá). */
export function isOverdue(status: string, expectedReturnDate: string | null): boolean {
  if (status !== 'activo' || !expectedReturnDate) return false;
  return expectedReturnDate < todayInBogota();
}

/**
 * Formatea una columna `date` pura de Postgres (ej. expected_return_date), que no
 * tiene hora ni zona horaria. A diferencia de formatDate, NO convierte a hora de
 * Bogotá: hacerlo restaría un día, porque "2026-09-25" se interpreta como
 * medianoche UTC y esa medianoche cae el 24 en Bogotá.
 */
export function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}
