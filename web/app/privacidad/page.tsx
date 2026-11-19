import type { Metadata } from 'next';
import { LegalShell } from '@/components/Legal/LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Aviso de privacidad · Bara Bara',
  description: 'Qué datos recaba Bara Bara, para qué los usa y cómo ejercer tus derechos ARCO.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  return (
    <LegalShell current="/privacidad" title="Aviso de privacidad integral">
      <p>
        Este aviso se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares
        (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad.
      </p>

      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        {LEGAL.responsible}, con domicilio en {LEGAL.address} (en adelante, “Bara Bara”), es responsable del tratamiento
        de tus datos personales. Contacto: {mail}.
      </p>

      <h2>2. Qué datos recabamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre o apodo, correo electrónico, contraseña (guardada cifrada, nunca en texto
          legible) y, si la das, tu colonia.
        </li>
        <li>
          <strong>Publicaciones y mensajes:</strong> lo que publicas (textos y fotos), los mensajes que envías por el
          chat y los tratos que cierras.
        </li>
        <li>
          <strong>Verificación de identidad (opcional):</strong> fotografía de tu INE por ambos lados y un comprobante de
          domicilio. La INE contiene datos de identificación (nombre, domicilio, CURP, fecha de nacimiento, fotografía y
          firma). <strong>No recabamos datos personales sensibles</strong> en términos de la LFPDPPP; la fotografía de tu
          rostro se usa solo para confirmar que la identificación es tuya.
        </li>
        <li>
          <strong>Pagos de comisiones:</strong> referencia de pago, monto y el comprobante de transferencia que subes.
          No guardamos números de tarjeta ni contraseñas bancarias.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP y datos del navegador, usados para seguridad (límite de intentos y
          prevención de abuso) y para detectar errores.
        </li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <p>Finalidades necesarias para darte el servicio:</p>
      <ol>
        <li>Crear y administrar tu cuenta e iniciar sesión.</li>
        <li>Mostrar tus publicaciones y permitir que otras personas te contacten por el chat.</li>
        <li>Registrar tratos y calcular, cobrar y conciliar la comisión de 5% en venta, renta y servicios.</li>
        <li>Verificar tu identidad y domicilio cuando lo solicitas, para otorgarte la insignia de vecino verificado.</li>
        <li>Prevenir fraudes, atender reportes, moderar contenido y suspender cuentas que incumplan los términos.</li>
        <li>Enviarte correos operativos (recuperar contraseña, avisos sobre tu cuenta o tus pagos).</li>
        <li>Cumplir obligaciones legales y atender requerimientos de autoridades competentes.</li>
      </ol>
      <p>
        No usamos tus datos para publicidad de terceros ni los vendemos. Si en el futuro quisiéramos usarlos para una
        finalidad distinta, te pediremos tu consentimiento antes.
      </p>

      <h2>4. Qué ven otras personas</h2>
      <p>
        Los demás usuarios ven tu nombre o apodo, tu colonia, tus publicaciones, tu reputación y si estás verificado.{' '}
        <strong>Nunca</strong> mostramos tu correo, tu teléfono, tu domicilio exacto ni tus documentos de identidad.
      </p>

      <h2>5. Dónde se guardan y con quién se comparten</h2>
      <p>
        Para operar usamos proveedores que tratan datos por cuenta nuestra (encargados), con servidores que pueden estar
        fuera de México:
      </p>
      <ul>
        <li>MongoDB Atlas: base de datos.</li>
        <li>ImageKit: almacenamiento de fotos. Los documentos de identidad y comprobantes se guardan en una carpeta privada, accesible solo con enlaces temporales para revisión.</li>
        <li>Vercel y Railway: alojamiento del sitio y del servidor.</li>
        <li>Resend: envío de correos.</li>
        <li>Sentry: registro de errores técnicos.</li>
      </ul>
      <p>
        Estas remisiones no requieren tu consentimiento (artículo 37 de la LFPDPPP). Solo transferiremos tus datos a
        autoridades cuando una ley o una orden lo exija.
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>Datos de cuenta y publicaciones: mientras tu cuenta esté activa y hasta 12 meses después de cancelarla.</li>
        <li>Documentos de verificación: hasta 12 meses después de revisarlos, o antes si cancelas tu cuenta.</li>
        <li>Información de pagos y tratos: el plazo que exijan las leyes fiscales y mercantiles (hasta 5 años).</li>
      </ul>

      <h2>7. Tus derechos ARCO y cómo revocar tu consentimiento</h2>
      <p>
        Puedes <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>, pedir su <strong>cancelación</strong>{' '}
        u <strong>oponerte</strong> a su uso, así como revocar tu consentimiento o limitar su uso. Escribe a {mail} desde el
        correo de tu cuenta con:
      </p>
      <ol>
        <li>Tu nombre y el correo de tu cuenta.</li>
        <li>Una copia de tu identificación (o la de tu representante y el documento que lo acredite).</li>
        <li>Qué derecho quieres ejercer y sobre qué datos.</li>
      </ol>
      <p>
        Te responderemos en un máximo de 20 días hábiles y, si procede, lo haremos efectivo dentro de los 15 días hábiles
        siguientes. Tu nombre y colonia los puedes cambiar en cualquier momento desde “Editar perfil”. Si consideras que
        tu derecho no fue atendido, puedes acudir al Instituto o la autoridad que tenga a su cargo la protección de datos
        personales.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos una sola cookie propia (<code>bb_session</code>), necesaria para mantener tu sesión. No usamos cookies de
        publicidad ni de rastreo de terceros.
      </p>

      <h2>9. Cambios a este aviso</h2>
      <p>
        Publicaremos cualquier cambio en esta página con su fecha de actualización. Si el cambio es importante, te
        avisaremos por correo o al entrar al sitio.
      </p>
    </LegalShell>
  );
}
