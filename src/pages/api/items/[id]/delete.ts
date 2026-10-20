import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, locals, redirect }) => {
  const { id } = params;
  const { supabase } = locals;

  // La FK loans.item_id impide borrar equipos con historial; se valida antes
  // para mostrar un mensaje claro en lugar de fallar en silencio.
  const { count } = await supabase.from('loans').select('id', { count: 'exact', head: true }).eq('item_id', id);
  if (count && count > 0) {
    return redirect('/inventario?error=en-uso');
  }

  await supabase.from('items').delete().eq('id', id);

  return redirect('/inventario');
};
