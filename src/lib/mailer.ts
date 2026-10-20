import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Envío de correos por SMTP (hoy: la cuenta Gmail del semillero).
 *
 * Los correos se envían desde la app y no desde Supabase Auth: los que arma
 * Supabase salen solo en HTML y con encabezados de Amazon SES/Postmark
 * (X-SES-Message-Tags, X-PM-Metadata-*) aunque no pasen por esos servicios,
 * y el filtro de Microsoft 365 de Uninorte los descartaba sin dejarlos ni en
 * cuarentena. Un correo multipart (texto + HTML) enviado directo por Gmail sí
 * llega.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = import.meta.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }
  const port = Number(SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS directo; 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/** Versión en texto plano de un HTML simple (los correos de la app), para la parte text/plain. */
function htmlToText(html: string): string {
  return html
    .replace(/<\/(td)>\s*<td[^>]*>/gi, ': ')
    .replace(/<(br|\/p|\/h\d|\/tr|\/div)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

interface MailInput {
  to: string;
  cc?: string;
  subject: string;
  /** Contenido del cuerpo; se envuelve en un documento HTML completo. */
  html: string;
}

/**
 * Envía un correo. Nunca lanza: devuelve false si el SMTP no está configurado
 * o si el envío falla (queda en el log), para que la operación que lo llamó
 * decida qué hacer.
 */
export async function sendMail({ to, cc, subject, html }: MailInput): Promise<boolean> {
  const smtp = getTransporter();
  if (!smtp) {
    console.warn('SMTP no configurado: correo omitido ->', subject, to);
    return false;
  }
  const fromName = import.meta.env.MAIL_FROM_NAME || 'GIRSI Préstamos';
  try {
    await smtp.sendMail({
      from: { name: fromName, address: import.meta.env.SMTP_USER },
      to,
      ...(cc ? { cc } : {}),
      subject,
      text: htmlToText(html),
      html: `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>${html}</body></html>`,
    });
    return true;
  } catch (err) {
    console.error('Fallo al enviar correo:', subject, to, err);
    return false;
  }
}
