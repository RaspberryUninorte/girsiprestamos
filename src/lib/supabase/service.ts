import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con la service role key: bypasea RLS. Solo para procesos de
 * sistema sin sesión de usuario (ej. el cron de préstamos atrasados),
 * nunca para requests normales del panel.
 */
export function createSupabaseServiceClient() {
  return createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
}
