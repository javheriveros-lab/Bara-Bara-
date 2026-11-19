# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-10-10] Never print or commit secrets (`backend/.env`: Atlas, JWT, ImageKit private key)**
   Do instead: check env vars by name only (`grep -n KEY .env | sed 's/=.*/=<redacted>/'`).
2. **[2026-10-10] Use the pinned pnpm**
   Do instead: `npx pnpm@9.15.0 <cmd>`; full check = `npx pnpm@9.15.0 typecheck` (runs `check:moderation` first).
3. **[2026-10-10] Root `pnpm dev` runs each package's `dev` script; a package without one is skipped silently**
   Do instead: keep `"dev"` in `backend/package.json`; after starting, check `curl localhost:4000/api/health` = 200 and `localhost:3000` = 200.
4. **[2026-10-10] `next build` and `next dev` share `web/.next`**
   Do instead: build only when port 3000 is down; if dev is running, typecheck only.
5. **[2026-10-10] `prisma generate` fails with EPERM while the backend runs**
   Do instead: stop `dev:backend` / `node dist/main` before generate or `db:push`.
6. **[2026-10-10] `next start` survives TaskStop (the npx child keeps port 3000)**
   Do instead: after a rebuild, kill the PID that owns :3000 (`Get-NetTCPConnection -LocalPort 3000`) and confirm a new CSS class appears in the HTML.
7. **[2026-10-17] Lighthouse works via `npx -y lighthouse` with `CHROME_PATH` = Edge**
   Do instead: `CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npx -y lighthouse <url> --chrome-flags="--headless=new" --output=json`.
8. **[2026-10-10] Visual QA = headless Edge + CDP**
   Do instead: `msedge --headless=new --remote-debugging-port=9341 --user-data-dir=<scratchpad>/edge-qa`, scripts in the scratchpad; temporary routes in `web/app/qa-preview` (delete them plus `web/.next/types/app/qa-preview`), then close Edge.
9. **[2026-10-10] CDP `captureScreenshot` clip uses page coordinates, not viewport**
   Do instead: after scrolling, capture the full viewport without `clip`.
10. **[2026-11-13] `msedge --headless=new --window-size=390,…` lays out at ~500px and crops (fake overflow)**
   Do instead: quick shots at 500px with `--virtual-time-budget=10000` (otherwise the loader shows); true 390px needs CDP device metrics.

## Shell & Command Reliability
1. **[2026-10-10] Bash heredocs with quotes/backticks in TSX break (`unexpected EOF`)**
   Do instead: write files with Write/Edit, or Python with a `<<'PYEOF'` heredoc.
2. **[2026-10-10] Backticks inside `node -e "..."` get eaten by bash**
   Do instead: put the script in a scratchpad file and run `node file.js`.
3. **[2026-10-10] Stray `C:\Users\Windows 11\package-lock.json` confuses Next's workspace root**
   Do instead: keep `outputFileTracingRoot: path.join(__dirname, '..')` in `web/next.config.ts`; never delete the user's file.
4. **[2026-10-12] Dev server "Jest worker encountered 2 child process exceptions" on /p/[id]**
   Do instead: it's a Next dev worker crash (stale `.next`), not app code; stop dev, delete `web/.next`, restart.
5. **[2026-10-10] Expo export fails: "Cannot find module 'jscodeshift'"**
   Do instead: ask before `npx pnpm@9.15.0 --filter mobile add -D jscodeshift`; validate mobile with `tsc` meanwhile.

## Domain Behavior Guardrails
1. **[2026-10-10] Web uses CSS Modules, not Tailwind (even if the prompt says Tailwind)**
   Do instead: tokens in `web/app/globals.css`, styles in `*.module.css`.
2. **[2026-10-10] Pillars live in `web/lib/kinds.ts` (4: venta, renta, intercambio, servicios)**
   Do instead: change `FEED_FILTERS` / `LEGACY_FEED` there; PillarNav and the home page read it.
3. **[2026-10-10] Loading = `components/Loading/ThunderLoader` (sphere + bolt), never a startup splash**
   Do instead: `LoadingSpinner` in `loading.tsx`, `FeedSkeleton` in Suspense, `LoadingOverlay` (portal) while `pending`.
4. **[2026-10-10] `next/font` has no fallback metrics for Big Shoulders Stencil**
   Do instead: keep `adjustFontFallback: false` + explicit `fallback` in `layout.tsx`.
5. **[2026-10-17] Dark e-commerce theme (purple→red gradient, glass, Poppins); DESIGN.md + PRODUCT.md are the source of truth**
   Do instead: read DESIGN.md before UI work; one red→violet gradient CTA per screen, no blur inside cards, background stays in `body::before`.
6. **[2026-10-17] Next 15 streams metadata into <body> for non-bot UAs (Lighthouse reports "no meta description")**
   Do instead: keep `htmlLimitedBots: /.*/` in `web/next.config.ts`; measure perf on `next build` + `next start`, never on dev.

## User Directives
1. **[2026-10-10] Reply in Spanish; terse (caveman) when asked**
   Do instead: short, technical answers in Spanish.
2. **[2026-10-18] Layout mirrors Mercado Libre (2-row header, hero carousel + overlapping shortcut cards, product rows, categories box, trust strip, footer) in Bara Bara style; no example/stock photos**
   Do instead: keep that distribution; use real listing photos only; "Guardados" is the cart (no checkout).
4. **[2026-10-18] API `take` max is 50 (PaginationDto)**
   Do instead: never request more than 50; a 400 shows as the "Zona sin señal" panel.
3. **[2026-10-12] Design skills installed: impeccable, design-taste-frontend, emil-design-eng, apple-design, animate**
   Do instead: user wants them applied on UI work; no em-dashes in visible copy, no eyebrows, hover gated by fine pointer.
