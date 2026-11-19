import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/Legal/LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos de uso · Bara Bara',
  description: 'Reglas para comprar, rentar, intercambiar y ofrecer servicios en Bara Bara.',
  alternates: { canonical: '/terminos' },
};

export default function TerminosPage() {
  return (
    <LegalShell current="/terminos" title="Términos y condiciones de uso">
      <p>
        Estos términos regulan el uso del sitio Bara Bara, operado por {LEGAL.responsible} (“Bara Bara”). Al crear una
        cuenta aceptas estos términos y el <Link href="/privacidad">aviso de privacidad</Link>. Si no estás de acuerdo, no
        uses el servicio.
      </p>

      <h2>1. Qué es Bara Bara</h2>
      <p>
        Bara Bara es un espacio para que personas y negocios de la comunidad publiquen objetos en venta, renta o
        intercambio, y ofrezcan servicios. <strong>Bara Bara no vende, no compra, no renta ni presta los servicios
        publicados</strong>: solo pone en contacto a las partes. Cada trato es un acuerdo directo entre quien publica y
        quien responde.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de 18 años y dar datos verdaderos.</li>
        <li>Una persona, una cuenta. Eres responsable de lo que pase con tu cuenta; cuida tu contraseña.</li>
        <li>La insignia de verificado solo indica que revisamos una identificación y un comprobante de domicilio; no es garantía del comportamiento de esa persona.</li>
      </ul>

      <h2>3. Qué se puede publicar</h2>
      <p>Publica solo lo que es tuyo o tienes derecho a ofrecer, con descripción y fotos reales. Está prohibido publicar:</p>
      <ul>
        <li>Objetos robados o de procedencia dudosa.</li>
        <li>Armas, municiones, explosivos o sus réplicas.</li>
        <li>Drogas, medicamentos controlados, tabaco o alcohol.</li>
        <li>Contenido sexual o servicios sexuales.</li>
        <li>Animales vivos, productos falsificados, documentos oficiales o datos personales de terceros.</li>
        <li>Cualquier cosa ilegal en México, engañosa, ofensiva o discriminatoria.</li>
      </ul>
      <p>
        Bara Bara revisa automáticamente los textos y puede quitar publicaciones que incumplan estas reglas, con o sin
        aviso previo.
      </p>

      <h2>4. Comisiones</h2>
      <ul>
        <li>Publicar es gratis. Intercambiar no paga comisión.</li>
        <li>
          En venta, renta y servicios, quien publica paga a Bara Bara una comisión de <strong>5% del precio acordado</strong>{' '}
          cuando el trato se marca como cerrado. En rentas, el depósito no paga comisión.
        </li>
        <li>
          Las comisiones se pagan por transferencia SPEI con la referencia que te damos en “Mis comisiones”. Si una comisión
          vence sin pagarse, tus publicaciones se pausan hasta que quede pagada.
        </li>
        <li>El pago entre las partes (precio del objeto, renta o servicio) se hace directamente entre ellas; Bara Bara no lo recibe ni lo retiene.</li>
      </ul>

      <h2>5. Cómo tratar con otras personas</h2>
      <ul>
        <li>Usa el chat de Bara Bara para acordar; tu correo y teléfono nunca se comparten automáticamente.</li>
        <li>Revisa el objeto antes de pagar y reúnete en lugares públicos.</li>
        <li>No pagues por adelantado a alguien que no conoces ni compartas contraseñas o códigos.</li>
        <li>Si algo te parece sospechoso, usa el botón “Reportar publicación”.</li>
      </ul>

      <h2>6. Responsabilidad</h2>
      <p>
        Bara Bara no garantiza la calidad, legalidad, seguridad ni entrega de lo publicado, ni que las partes cumplan lo que
        acuerdan. En la medida que la ley lo permita, Bara Bara no responde por daños derivados de los tratos entre
        usuarios. Esto no limita los derechos que te da la Ley Federal de Protección al Consumidor.
      </p>

      <h2>7. Suspensión y cancelación</h2>
      <p>
        Podemos suspender o cancelar cuentas que incumplan estos términos, reciban reportes fundados o adeuden comisiones.
        Puedes cancelar tu cuenta cuando quieras escribiendo a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>; las
        comisiones pendientes se deben pagar de todas formas.
      </p>

      <h2>8. Contenido que subes</h2>
      <p>
        Sigues siendo dueño de tus textos y fotos. Nos das permiso de mostrarlos en Bara Bara (sitio, buscadores y redes de
        la comunidad) mientras tu publicación esté activa.
      </p>

      <h2>9. Cambios y ley aplicable</h2>
      <p>
        Podemos actualizar estos términos; publicaremos la nueva versión aquí y, si el cambio es importante, te pediremos
        aceptarlo de nuevo. Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier
        controversia, las partes se someten a los tribunales competentes del domicilio del responsable, sin perjuicio de la
        competencia de la PROFECO.
      </p>
    </LegalShell>
  );
}
