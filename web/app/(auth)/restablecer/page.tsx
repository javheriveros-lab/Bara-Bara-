import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetPasswordForm } from '@/components/PasswordForms/PasswordForms';

export const metadata: Metadata = {
  title: 'Nueva contraseña · Bara Bara',
  robots: { index: false },
  // El token va en la URL: que no se filtre a otros sitios por el Referer.
  referrer: 'no-referrer',
};

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token || !/^[a-f0-9]{32,128}$/i.test(token)) redirect('/olvide');
  return <ResetPasswordForm token={token} />;
}
