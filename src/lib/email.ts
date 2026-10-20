import { formatDate, formatDateOnly, formatDateTime } from './dates';
import { sendMail } from './mailer';

const PROFESSOR_CC = 'dgomez@uninorte.edu.co';

interface LoanEmailData {
  student_name: string;
  student_email: string;
  started_at: string;
  ended_at: string | null;
  expected_return_date: string | null;
  item_code: string;
  item_category: string;
  item_model: string;
}

/** El nombre del estudiante viene del formulario de registro: no debe poder inyectar HTML. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Envía correos de notificación de préstamos. Nunca lanza: si el SMTP no está
 * configurado o falla el envío, queda en el log y la operación que lo llamó
 * (crear o finalizar un préstamo, el cron) continúa con normalidad.
 */
async function sendLoanEmail(subject: string, html: string, to: string, cc?: string) {
  await sendMail({ to, cc, subject, html });
}

/** Código de verificación de cuenta (ver lib/verification.ts). Devuelve si se pudo enviar. */
export async function sendVerificationCodeEmail(to: string, fullName: string, code: string): Promise<boolean> {
  const firstName = escapeHtml(fullName.split(' ')[0] || '');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0b1c30; max-width: 480px;">
      <h2 style="color: #422bcc;">Confirma tu cuenta en GIRSI Préstamos</h2>
      <p>Hola${firstName ? ` ${firstName}` : ''},</p>
      <p>Recibimos tu registro en la plataforma de préstamos de equipos del semillero GIRSI. Tu código de verificación es:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${code}</p>
      <p>Escríbelo en la página de verificación para activar tu cuenta. El código vence en una hora.</p>
      <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
      <p style="color: #787586; font-size: 13px; margin-top: 24px;">GIRSI — Semillero de Investigación</p>
    </div>
  `.trim();

  return sendMail({ to, subject: 'Tu código para GIRSI Préstamos', html });
}

export async function sendLoanCreatedEmail(loan: LoanEmailData) {
  const devolucion = loan.expected_return_date
    ? `<p>Fecha de devolución esperada: <strong>${formatDateOnly(loan.expected_return_date)}</strong></p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0b1c30; max-width: 480px;">
      <h2 style="color: #422bcc;">Préstamo de equipo confirmado</h2>
      <p>Hola ${escapeHtml(loan.student_name)},</p>
      <p>Se registró la entrega de un equipo a tu nombre en GIRSI:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0; color: #474555;">Equipo</td><td style="padding: 4px 0;"><strong>${loan.item_code}</strong> (${loan.item_category})</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Modelo</td><td style="padding: 4px 0;">${loan.item_model}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Fecha de inicio</td><td style="padding: 4px 0;">${formatDate(loan.started_at)}</td></tr>
      </table>
      ${devolucion}
      <p>Por favor cuida el equipo y devuélvelo en la fecha acordada con el laboratorio.</p>
      <p style="color: #787586; font-size: 13px; margin-top: 24px;">GIRSI — Semillero de Investigación</p>
    </div>
  `.trim();

  await sendLoanEmail(`Préstamo confirmado: ${loan.item_category} ${loan.item_code}`, html, loan.student_email, PROFESSOR_CC);
}

export async function sendLoanFinishedEmail(loan: LoanEmailData) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0b1c30; max-width: 480px;">
      <h2 style="color: #422bcc;">Devolución registrada</h2>
      <p>Hola ${escapeHtml(loan.student_name)},</p>
      <p>Confirmamos que se registró la devolución de tu préstamo:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0; color: #474555;">Equipo</td><td style="padding: 4px 0;"><strong>${loan.item_code}</strong> (${loan.item_category})</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Modelo</td><td style="padding: 4px 0;">${loan.item_model}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Fecha de devolución</td><td style="padding: 4px 0;">${formatDateTime(loan.ended_at)}</td></tr>
      </table>
      <p>Gracias por devolver el equipo. ¡Esperamos verte de nuevo en el laboratorio!</p>
      <p style="color: #787586; font-size: 13px; margin-top: 24px;">GIRSI — Semillero de Investigación</p>
    </div>
  `.trim();

  await sendLoanEmail(`Devolución confirmada: ${loan.item_category} ${loan.item_code}`, html, loan.student_email, PROFESSOR_CC);
}

/** `dueToday`: la devolución es hoy (el préstamo se creó después del cron del día anterior). */
export async function sendLoanReminderEmail(loan: LoanEmailData, dueToday: boolean) {
  const cuando = dueToday ? 'hoy' : 'mañana';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0b1c30; max-width: 480px;">
      <h2 style="color: #422bcc;">Recordatorio de devolución</h2>
      <p>Hola ${escapeHtml(loan.student_name)},</p>
      <p>Te recordamos que <strong>${cuando}</strong> vence el préstamo de este equipo:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0; color: #474555;">Equipo</td><td style="padding: 4px 0;"><strong>${loan.item_code}</strong> (${loan.item_category})</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Modelo</td><td style="padding: 4px 0;">${loan.item_model}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Fecha de inicio</td><td style="padding: 4px 0;">${formatDate(loan.started_at)}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Devolución esperada</td><td style="padding: 4px 0;"><strong>${formatDateOnly(loan.expected_return_date)}</strong></td></tr>
      </table>
      <p>Por favor acércate al laboratorio a entregarlo a tiempo.</p>
      <p style="color: #787586; font-size: 13px; margin-top: 24px;">GIRSI — Semillero de Investigación</p>
    </div>
  `.trim();

  await sendLoanEmail(`Recordatorio: devuelve ${cuando} ${loan.item_category} ${loan.item_code}`, html, loan.student_email);
}

export async function sendLoanOverdueEmail(loan: LoanEmailData) {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0b1c30; max-width: 480px;">
      <h2 style="color: #be123c;">Préstamo atrasado</h2>
      <p>Hola ${escapeHtml(loan.student_name)},</p>
      <p>Tu préstamo de equipo ya pasó la fecha de devolución esperada y no se ha registrado la devolución:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0; color: #474555;">Equipo</td><td style="padding: 4px 0;"><strong>${loan.item_code}</strong> (${loan.item_category})</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Modelo</td><td style="padding: 4px 0;">${loan.item_model}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Fecha de inicio</td><td style="padding: 4px 0;">${formatDate(loan.started_at)}</td></tr>
        <tr><td style="padding: 4px 0; color: #474555;">Devolución esperada</td><td style="padding: 4px 0;"><strong>${formatDateOnly(loan.expected_return_date)}</strong></td></tr>
      </table>
      <p>Por favor acércate al laboratorio a devolver el equipo lo antes posible.</p>
      <p style="color: #787586; font-size: 13px; margin-top: 24px;">GIRSI — Semillero de Investigación</p>
    </div>
  `.trim();

  await sendLoanEmail(`Préstamo atrasado: ${loan.item_category} ${loan.item_code}`, html, loan.student_email);
}
