import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  /** Texto plano (siempre) y HTML sencillo (opcional). */
  text: string;
  html?: string;
}

/**
 * Envío de correo con la API HTTP de Resend (sin SDK). Variables: RESEND_API_KEY y MAIL_FROM
 * ("Bara Bara <hola@tu-dominio>", con el dominio verificado en Resend).
 * Sin configurar, el correo se escribe en el log (útil en desarrollo) y no falla.
 */
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('RESEND_API_KEY') && this.config.get<string>('MAIL_FROM'));
  }

  async send(msg: MailMessage): Promise<boolean> {
    const key = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM');
    if (!key || !from) {
      // En producción nunca se escribe el contenido: llevaría enlaces de un solo uso y correos de personas.
      if (process.env.NODE_ENV === 'production') {
        this.log.error(`Correo no enviado ("${msg.subject}"): faltan RESEND_API_KEY o MAIL_FROM`);
      } else {
        this.log.warn(`[correo sin configurar] Para: ${msg.to} · ${msg.subject}\n${msg.text}`);
      }
      return false;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
      });
      if (!res.ok) {
        this.log.error(`Resend respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (e) {
      this.log.error(`No se pudo enviar el correo: ${(e as Error).message}`);
      return false;
    }
  }
}
