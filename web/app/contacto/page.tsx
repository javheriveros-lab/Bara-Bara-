import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/Legal/LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Contacto · Bara Bara',
  description: 'Escríbenos para soporte, reportes o tus derechos de privacidad.',
  alternates: { canonical: '/contacto' },
};

export default function ContactoPage() {
  const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
  return (
    <LegalShell current="/contacto" title="Contacto">
      <p>Somos un equipo pequeño. Respondemos en uno o dos días hábiles.</p>

      <h2>Soporte y dudas</h2>
      <p>Problemas con tu cuenta, tus publicaciones, un trato o un pago de comisión: {mail}.</p>

      <h2>Reportar una publicación o una persona</h2>
      <p>
        Lo más rápido es el botón “Reportar publicación” en la página de la publicación. Si es urgente o no lo encuentras,
        escríbenos a {mail} con el enlace.
      </p>

      <h2>Privacidad y derechos ARCO</h2>
      <p>
        Para acceder, corregir o borrar tus datos, sigue los pasos del <Link href="/privacidad">aviso de privacidad</Link>{' '}
        y escríbenos a {mail} desde el correo de tu cuenta.
      </p>

      <h2>Responsable</h2>
      <p>
        {LEGAL.responsible}
        <br />
        {LEGAL.address}
      </p>
    </LegalShell>
  );
}
