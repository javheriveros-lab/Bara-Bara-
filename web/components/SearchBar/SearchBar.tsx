'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { Suggestion } from '@/app/api/sugerencias/route';
import { SearchIcon } from '../icons';
import styles from './SearchBar.module.css';

/** Buscador de la tienda con autocorrector. GET /buscar?q= (funciona sin JS). */
export function SearchBar() {
  const params = useSearchParams();
  const pathname = usePathname();
  return <SearchForm defaultQuery={pathname === '/buscar' ? (params.get('q') ?? '') : ''} />;
}

type Option = { kind: 'fix' | 'title'; text: string };

/**
 * Mientras se escribe pide sugerencias (con pausa de 180 ms) y muestra:
 *  - "¿Quisiste decir …?" cuando alguna palabra está mal escrita;
 *  - publicaciones que coinciden.
 * Teclado: ↑/↓ para moverse, Enter para elegir, Escape para cerrar (patrón combobox de ARIA).
 */
export function SearchForm({ defaultQuery = '' }: { defaultQuery?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [data, setData] = useState<Suggestion>({ corrected: null, suggestions: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => setQuery(defaultQuery), [defaultQuery]);

  // Sugerencias con pausa y cancelación de la petición anterior.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setData({ corrected: null, suggestions: [] });
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/sugerencias?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setData((await res.json()) as Suggestion);
      } catch {
        /* sin red o cancelada: el buscador sigue funcionando sin sugerencias */
      }
    }, 180);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  // Cerrar al tocar fuera.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const options: Option[] = [
    ...(data.corrected ? [{ kind: 'fix' as const, text: data.corrected }] : []),
    ...data.suggestions.map((t) => ({ kind: 'title' as const, text: t })),
  ];
  const showList = open && options.length > 0 && query.trim().length >= 2;

  const go = (text: string) => {
    setOpen(false);
    setQuery(text);
    router.push(`/buscar?q=${encodeURIComponent(text)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (e.key === 'ArrowDown' && options.length) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      go(options[active].text);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <form ref={box} action="/buscar" method="get" role="search" className={styles.bar} onSubmit={() => setOpen(false)}>
      <label className={styles.srOnly} htmlFor="bb-search">
        Buscar en Bara Bara
      </label>
      <input
        id="bb-search"
        className={styles.input}
        type="search"
        name="q"
        placeholder="Buscar productos, rentas y servicios…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        maxLength={60}
        autoComplete="off"
        spellCheck
        autoCorrect="on"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
      />
      <button type="submit" className={styles.submit} aria-label="Buscar">
        <SearchIcon />
      </button>

      {showList && (
        <ul id={listId} role="listbox" className={styles.suggest} aria-label="Sugerencias">
          {options.map((o, i) => (
            <li
              key={`${o.kind}-${o.text}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={styles.option}
              data-kind={o.kind}
              onPointerDown={(e) => {
                e.preventDefault();
                go(o.text);
              }}
              onPointerEnter={() => setActive(i)}
            >
              {o.kind === 'fix' ? (
                <>
                  <span className={styles.fixLabel}>¿Quisiste decir?</span>
                  <strong>{o.text}</strong>
                </>
              ) : (
                <>
                  <SearchIcon size={15} />
                  <span>{o.text}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
