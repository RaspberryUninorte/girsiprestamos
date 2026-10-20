import type { SupabaseClient } from '@supabase/supabase-js';

/** Categoría de las placas originales; solo ellas llevan accesorios microSD / módulo USB-Ethernet. */
export const RASPBERRY_PI_CATEGORY = 'Raspberry Pi';

export const MAX_UNITS_PER_BATCH = 100;

/** Normaliza un prefijo de código: mayúsculas, solo letras/números (ej. "sen " -> "SEN"). */
export function normalizePrefix(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Siguientes `count` códigos libres con el formato PREFIJO-NNN, continuando
 * desde el número más alto ya usado con ese prefijo (ej. RPI-081, RPI-082...).
 */
export async function nextItemCodes(supabase: SupabaseClient, prefix: string, count: number): Promise<string[]> {
  const { data } = await supabase.from('items').select('code').ilike('code', `${prefix}-%`);

  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  const maxUsed = (data ?? []).reduce((max, { code }) => {
    const match = pattern.exec(code);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return Array.from({ length: count }, (_, i) => `${prefix}-${String(maxUsed + i + 1).padStart(3, '0')}`);
}
