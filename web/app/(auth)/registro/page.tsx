import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { safeNext } from '@/lib/safe-next';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Súmate a la comunidad · Bara Bara' };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next ?? '/');

  return <AuthForm mode="register" next={next} />;
}
