import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { safeNext } from '@/lib/safe-next';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Entrar · Bara Bara' };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getCurrentUser()) redirect(next ?? '/');

  const notice = params.reset === '1' ? 'Listo, tu contraseña cambió. Entra con la nueva.' : undefined;
  return <AuthForm mode="login" next={next} notice={notice} />;
}
