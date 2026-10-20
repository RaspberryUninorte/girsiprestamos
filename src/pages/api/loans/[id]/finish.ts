import type { APIRoute } from 'astro';
import { sendLoanFinishedEmail } from '../../../../lib/email';

export const POST: APIRoute = async ({ params, locals, redirect }) => {
  const { id } = params;
  const { supabase } = locals;

  const { data: updated } = await supabase
    .from('loans')
    .update({ status: 'finalizado', ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'activo')
    .select('student_name, student_email, started_at, ended_at, expected_return_date, photo_top_url, photo_bottom_url, items(code, category, model)')
    .single();

  if (updated) {
    // Las fotos solo sirven para verificar el estado del equipo mientras esta
    // prestado: al recibirlo se borran del storage. Si el borrado falla, el
    // prestamo igual queda finalizado.
    const photoPaths = [updated.photo_top_url, updated.photo_bottom_url].filter((p): p is string => Boolean(p));
    if (photoPaths.length > 0) {
      const { error: removeError } = await supabase.storage.from('loan-photos').remove(photoPaths);
      if (removeError) {
        console.error('Error borrando fotos del prestamo finalizado:', id, removeError);
      } else {
        await supabase.from('loans').update({ photo_top_url: null, photo_bottom_url: null }).eq('id', id);
      }
    }

    const item = updated.items as any;
    await sendLoanFinishedEmail({
      student_name: updated.student_name,
      student_email: updated.student_email,
      started_at: updated.started_at,
      ended_at: updated.ended_at,
      expected_return_date: updated.expected_return_date,
      item_code: item?.code ?? '—',
      item_category: item?.category ?? 'Equipo',
      item_model: item?.model ?? '—',
    });
  }

  return redirect(`/prestamos/${id}`);
};
