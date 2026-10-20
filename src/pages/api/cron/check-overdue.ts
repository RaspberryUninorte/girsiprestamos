import type { APIRoute } from 'astro';
import { createSupabaseServiceClient } from '../../../lib/supabase/service';
import { sendLoanOverdueEmail, sendLoanReminderEmail } from '../../../lib/email';
import { todayInBogota, tomorrowInBogota } from '../../../lib/dates';

const LOAN_EMAIL_FIELDS = 'id, student_name, student_email, started_at, expected_return_date, items(code, category, model)';

function toEmailData(loan: any) {
  const item = loan.items as any;
  return {
    student_name: loan.student_name,
    student_email: loan.student_email,
    started_at: loan.started_at,
    ended_at: null,
    expected_return_date: loan.expected_return_date,
    item_code: item?.code ?? '—',
    item_category: item?.category ?? 'Equipo',
    item_model: item?.model ?? '—',
  };
}

/**
 * Corre una vez al dia (ver vercel.json, 8:00 a.m. en Bogota). Envia dos
 * tipos de aviso, cada uno una sola vez por prestamo:
 *  - Recordatorio: la devolucion esperada es manana (o hoy, si el prestamo se
 *    creo despues del cron de ayer). Marca reminder_notified_at.
 *  - Atraso: la devolucion esperada ya paso. Marca overdue_notified_at.
 */
export const GET: APIRoute = async ({ request }) => {
  const cronSecret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const today = todayInBogota();

  const { data: upcomingLoans, error: upcomingError } = await supabase
    .from('loans')
    .select(LOAN_EMAIL_FIELDS)
    .eq('status', 'activo')
    .is('reminder_notified_at', null)
    .gte('expected_return_date', today)
    .lte('expected_return_date', tomorrowInBogota());

  const { data: overdueLoans, error: overdueError } = await supabase
    .from('loans')
    .select(LOAN_EMAIL_FIELDS)
    .eq('status', 'activo')
    .is('overdue_notified_at', null)
    .not('expected_return_date', 'is', null)
    .lt('expected_return_date', today);

  const error = upcomingError ?? overdueError;
  if (error) {
    console.error('Error consultando prestamos para avisos:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let reminded = 0;
  for (const loan of upcomingLoans ?? []) {
    await sendLoanReminderEmail(toEmailData(loan), loan.expected_return_date === today);
    await supabase.from('loans').update({ reminder_notified_at: new Date().toISOString() }).eq('id', loan.id);
    reminded++;
  }

  let notified = 0;
  for (const loan of overdueLoans ?? []) {
    await sendLoanOverdueEmail(toEmailData(loan));
    await supabase.from('loans').update({ overdue_notified_at: new Date().toISOString() }).eq('id', loan.id);
    notified++;
  }

  return new Response(JSON.stringify({ reminded, notified }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
