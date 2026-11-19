import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/PasswordForms/PasswordForms';

export const metadata: Metadata = { title: 'Recuperar contraseña · Bara Bara', robots: { index: false } };

export default function OlvidePage() {
  return <ForgotPasswordForm />;
}
