import { NextResponse, type NextRequest } from 'next/server';
import { apiFetch } from '@/lib/api';

export type Suggestion = { corrected: string | null; suggestions: string[] };

/** Proxy del autocorrector para el buscador (la URL de la API vive solo en el servidor). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ corrected: null, suggestions: [] } satisfies Suggestion);
  const res = await apiFetch<Suggestion>(`/search/suggest?q=${encodeURIComponent(q)}`);
  return NextResponse.json(res.ok ? res.data : ({ corrected: null, suggestions: [] } satisfies Suggestion), {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
