# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(A companion Expo app lives in `mobile/`; it shares the brand but is designed separately.)

## Users

Neighbors in Mexican urban communities (CDMX and metro area: Iztacalco, Tepito, Doctores, Nezahualcóyotl…) who need to stretch money during hard times. They browse on their phones, often on mid-range Android devices and spotty data, to buy, rent, swap or hire services from people nearby, then close the deal in person.

## Product Purpose

Bara Bara is a collaborative-economy marketplace for the community: sell, rent, swap (no money) and offer services. Success is a neighbor finding something useful nearby, chatting with the owner and closing a fair deal without speculation or abusive fees.

## Positioning

A community resistance marketplace, not a classifieds site: swaps are free, Bara Bara only charges 5% when a sale, rental or service deal is closed (never on swaps, never on a rental deposit), and trust is earned through optional ID + address verification and a "Vecino Confiable" badge for neighbors who pay on time.

## Operating Context

- Browse the feed by pillar, open an item, negotiate in the built-in chat, propose/confirm the deal, meet in person.
- Publishing: one form per kind (sale, rent, swap, service), photos uploaded to ImageKit.
- Commissions are paid by SPEI with a unique reference; overdue commissions pause the seller's listings.
- Optional KYC (INE front/back + proof of address) reviewed manually by an admin.
- Content moderation blocks stolen goods, weapons, drugs and sexual services.

## Capabilities and Constraints

- Four pillars in the main navigation: **Venta, Renta, Intercambio, Servicios** (user decisions 2026-10-12 and 2026-10-17: keep them separate).
- E-commerce shell (2026-10-17): header search (text search over title/description via `q`) with a categories menu, `/buscar` results page, and **Guardados** (saved items, shown with a cart icon) at `/guardados`. There is no checkout: deals still close in the chat and in person.
- Terminology: "comunidad" (not "barrio"), "servicios" (not "chamba"), "intercambio" (not "trueque") in visible UI.
- Web: Next.js 15 App Router, CSS Modules (no Tailwind), Framer Motion; API: NestJS + Prisma on MongoDB.
- Session JWT lives only in the httpOnly cookie `bb_session`; secrets never reach the client.
- The app must work without JavaScript for browsing (server-rendered feed).

## Brand Commitments

- Name: **Bara Bara** / "¡Bara Bara!". Official logo: violet crystal sphere with a price tag and a yellow bolt, plus the "¡Bara Bara!" stencil lettering (`web/public/brand/`). Do not redraw the logo; color variants derived from the official file are allowed.
- Voice: direct, warm, street-level Mexican Spanish; rebellious but never corporate.
- Visual direction (user mockups 2026-10-17): an e-commerce storefront on a dark purple background that diffuses into red, frosted-glass panels, white pill search bar with violet button, Poppins type, white logo with a red sphere base, red → violet gradient for the primary action. Replaces the 2026-10-12 light "Apple rebelde" direction. The home headline "ESTÁ CABRONA LA CRISIS" was removed at the user's request.
- Loading state: the "sphere and bolt" motion graphic, shown only during async work.

## Evidence on Hand

- Real listings and services in the database (seed neighbors plus real user posts).
- Logo files in `web/public/brand/` (`logo.png`, `logo-horizontal-white.webp`, `logo-splash-white-*.webp`, `og.png`). The mockup's example photos (banner, category tiles) were removed at the user's request (2026-10-17).
- No testimonials, metrics or press exist; do not invent them.

## Product Principles

1. The community comes first: every screen should make it easier to find a neighbor and close a fair deal.
2. Trust is visible: verification, reliable-payer badges and transparent fees are shown, never hidden.
3. Fast on a cheap phone: server-rendered, light assets, motion only where it explains something.
4. Rebellious, not chaotic: the punk attitude lives in details; the layout stays calm and legible.

## Accessibility & Inclusion

Spanish (es-MX) only. Body text and controls meet WCAG AA contrast; respect `prefers-reduced-motion`; touch targets ≥ 44px on mobile.
