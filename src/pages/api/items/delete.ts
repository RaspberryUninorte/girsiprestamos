import type { APIRoute } from 'astro';

/**
 * Elimina uno o varios equipos del inventario (campo `ids`, repetible).
 * Solo se borran los que nunca se prestaron: la FK loans.item_id lo exige y
 * así no se pierde historial. Los demás se omiten y se informa cuántos.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const { supabase } = locals;
  const formData = await request.formData();
  const ids = [...new Set(formData.getAll('ids').map(String).filter(Boolean))];

  // Vuelve a la misma vista del inventario (con sus filtros), solo dentro de /inventario.
  const back = String(formData.get('redirect_to') ?? '');
  const target = new URL(back.startsWith('/inventario') ? back : '/inventario', 'http://local');
  for (const key of ['eliminados', 'omitidos', 'agregados']) target.searchParams.delete(key);

  if (ids.length > 0) {
    const { data: used } = await supabase.from('loans').select('item_id').in('item_id', ids);
    const usedIds = new Set((used ?? []).map((l) => l.item_id as string));
    const deletable = ids.filter((id) => !usedIds.has(id));

    let deleted = 0;
    if (deletable.length > 0) {
      const { count, error } = await supabase.from('items').delete({ count: 'exact' }).in('id', deletable);
      if (error) console.error('Error eliminando equipos:', error);
      deleted = count ?? 0;
    }

    target.searchParams.set('eliminados', String(deleted));
    if (deleted < ids.length) target.searchParams.set('omitidos', String(ids.length - deleted));
  }

  return redirect(target.pathname + target.search);
};
