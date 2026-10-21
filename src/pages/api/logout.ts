import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, redirect }) => {
  // scope 'local': cierra solo la sesión de este dispositivo. El valor por
  // defecto de Supabase es 'global', que cierra la cuenta en todos los
  // dispositivos; como la cuenta de admin la comparten varias personas, cada
  // "Cerrar sesión" sacaba a los demás a mitad de un formulario.
  await locals.supabase.auth.signOut({ scope: 'local' });
  return redirect('/login');
};
