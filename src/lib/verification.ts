import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeLike } from './auth';
import { sendVerificationCodeEmail } from './email';

/** Tiempo mínimo entre dos códigos al mismo correo (evita usar el reenvío para llenar bandejas ajenas). */
const RESEND_COOLDOWN_MS = 60_000;

export type IssueCodeResult = 'sent' | 'cooldown' | 'already_confirmed' | 'not_found' | 'send_failed' | 'error';

interface NewAccount {
  password: string;
  fullName: string;
  studentCode: string;
}

/**
 * Crea (o retoma) una cuenta sin confirmar y le envía por correo el código de
 * verificación. El código lo genera Supabase con admin.generateLink, que NO
 * envía correo: lo envía la app (ver lib/mailer.ts para el porqué).
 *
 * - Con `account`: registro. Si el correo ya tiene una cuenta sin confirmar,
 *   se le envía un código nuevo.
 * - Sin `account`: reenvío. Solo actúa si existe una cuenta sin confirmar.
 *
 * Generar un código nuevo invalida el anterior. Requiere el cliente con
 * service role (solo servidor).
 */
export async function issueVerificationCode(
  service: SupabaseClient,
  email: string,
  account?: NewAccount,
): Promise<IssueCodeResult> {
  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .ilike('email', escapeLike(email))
    .maybeSingle();

  if (existing) {
    const { data } = await service.auth.admin.getUserById(existing.id);
    const user = data.user;
    if (user?.email_confirmed_at) return 'already_confirmed';
    const lastSent = user?.confirmation_sent_at ? Date.parse(user.confirmation_sent_at) : 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) return 'cooldown';
  } else if (!account) {
    return 'not_found';
  }

  // Para el reenvío no hay contraseña: generateLink('signup') sobre una cuenta
  // sin confirmar la acepta sin ella y conserva la contraseña original.
  const params = account
    ? {
        type: 'signup' as const,
        email,
        password: account.password,
        options: { data: { full_name: account.fullName, student_code: account.studentCode } },
      }
    : ({ type: 'signup', email } as Parameters<SupabaseClient['auth']['admin']['generateLink']>[0]);

  const { data, error } = await service.auth.admin.generateLink(params);
  if (error) {
    if (error.code === 'email_exists') return 'already_confirmed';
    console.error('Error generando codigo de verificacion:', email, error);
    return 'error';
  }

  const code = data.properties?.email_otp;
  if (!code) return 'error';

  const fullName = account?.fullName ?? (data.user?.user_metadata?.full_name as string | undefined) ?? '';
  const sent = await sendVerificationCodeEmail(email, fullName, code);
  return sent ? 'sent' : 'send_failed';
}
