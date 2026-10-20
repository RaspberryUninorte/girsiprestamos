import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ params, locals, redirect }) => {
  const { id } = params;
  const { supabase } = locals;

  const { data: loan } = await supabase
    .from('loans')
    .select('photo_top_url, photo_bottom_url')
    .eq('id', id)
    .single();

  const photoPaths = [loan?.photo_top_url, loan?.photo_bottom_url].filter((p): p is string => Boolean(p));
  if (photoPaths.length > 0) {
    await supabase.storage.from('loan-photos').remove(photoPaths);
  }

  await supabase.from('loans').delete().eq('id', id);

  return redirect('/prestamos');
};
