---
name: Bara Bara
description: Tienda de la comunidad sobre un degradado morado que se difumina en rojo, con paneles de vidrio.
colors:
  night: "#120a3a"
  electric-indigo: "#3b1fe6"
  deep-violet: "#24107a"
  plum: "#2a0738"
  brand-red: "#ff1744"
  magenta: "#e0005e"
  electric-purple: "#a100ff"
  search-violet: "#7c4dff"
  lilac: "#c4b5fd"
  lilac-soft: "#ede9fe"
  white: "#ffffff"
  text: "#f5f3ff"
  search-ink: "#1e1b4b"
  bolt: "#fdd835"
  danger: "#ff8a9a"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 5vw, 2.8rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "clamp(1.4rem, 2.6vw, 1.8rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  price:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "1.22rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  nav:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 500
  label:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  control: "12px"
  thumb: "16px"
  card: "20px"
  tile: "24px"
  panel: "32px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "36px"
  section: "48px"
components:
  button-cta:
    backgroundColor: "{colors.brand-red}"
    textColor: "{colors.white}"
    typography: "{typography.nav}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  search-bar:
    backgroundColor: "{colors.white}"
    textColor: "{colors.search-ink}"
    rounded: "{rounded.pill}"
    height: "46px"
  search-submit:
    backgroundColor: "{colors.search-violet}"
    textColor: "{colors.white}"
    width: "64px"
  product-card:
    backgroundColor: "rgba(255, 255, 255, 0.07)"
    textColor: "{colors.white}"
    rounded: "{rounded.card}"
  category-tile:
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  kind-pill:
    backgroundColor: "rgba(124, 77, 255, 0.2)"
    textColor: "{colors.lilac-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  input:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
---

# Design System: Bara Bara

## Overview

**Creative North Star: "Tienda de la comunidad al anochecer"**

An e-commerce storefront for the neighborhood. The page sits on a deep purple night that diffuses into brand red toward the bottom-right corner; every surface is a sheet of frosted glass floating on it. The header behaves like a real shop: the white logo (sphere base in brand red), a white pill search bar with a categories menu and a violet search button, account, a cart-shaped "Guardados", and a red-to-violet "Publicar" pill. Below, one glass panel holds the product grid; typography stays quiet (Poppins) so the products and colors lead.

Taken from the user's own mockups (October 2026), limited by their request to the typography, the background color and the transparent panel; the mockup's example banner and category photos are intentionally not used. Also the "Agrega tu producto" gradient band on Publicar.

**Key Characteristics:**
- Dark only. Purple → red gradient background in a fixed compositor layer; content on glass panels.
- Product photos lead: square photos on every card.
- One type family (Poppins 400/500/600/700), sentence case.
- Red → violet gradient for the one primary action per screen; electric violet for search and active states.

## Colors

### Primary
- **Brand Red** (#FF1744) and **Electric Purple** (#A100FF): the CTA gradient `linear-gradient(100deg, #ff1744, #e0005e 45%, #a100ff)`; also the active-pillar underline, cart counter and the Publicar band.
- **Search Violet** (#7C4DFF): search button and search-bar ring, focus accents, kind pills (20% tint).

### Neutral
- **Night** (#120A3A): solid fallback behind the gradient. The gradient layers Electric Indigo (#3B1FE6) top-left, Brand Red bottom-right, a plum glow top-right and a violet glow center over a Deep Violet → Night → Plum base.
- **White** (#FFFFFF) titles and prices; **Text** (#F5F3FF) body; muted text is Lilac Soft at 74%; faint at 52%.
- **Lilac** (#C4B5FD): links and verified shields (text-safe on the dark ground).
- Glass: panel `rgba(255,255,255,.08 to .11)` with `blur(18px)`; cards `rgba(255,255,255,.07)` without blur; lines `rgba(255,255,255,.12)`.
- **Bolt** (#FDD835) survives only in the logo, rating stars and the loader bolt.

**The One Action Rule.** The red → violet gradient marks the single primary action of a screen (Publicar, Negociar, Publicar form submit). Everything else is glass or text.

**The No Glass On Glass Rule.** Only the page panel and the header blur; cards inside the panel are translucent fills without their own blur.

## Typography

**Font:** Poppins (next/font, latin, 400/500/600/700, `display: swap`). The legacy aliases `--font-display`, `--font-stencil` and `--font-handstyle` all point to it.

### Hierarchy
- **Display** (500, clamp(1.8rem, 5vw, 2.8rem)): the Publicar band ("Agrega tu producto").
- **Headline** (700, clamp(1.4rem, 2.6vw, 1.8rem)): section titles ("Renta", "Intercambio", "Lo más nuevo en tu comunidad"), page titles.
- **Title** (600, 1rem): product card titles, max 2 lines.
- **Price** (700, 1.22rem, tabular): the loudest thing on a card.
- **Body** (400, 1rem) and **Nav** (500, 0.98rem); **Label** (600, 0.72rem) for kind pills.

## Layout

**Marketplace distribution (modeled on Mercado Libre, 2026-10-18).** Header row 1: logo · wide search · "Publica gratis" (the promo slot); row 2: "Tu colonia" (like "Enviar a") · Categorías ▾ + 4 pillars · Crea tu cuenta / Ingresa / Mis tratos / Guardados cart. Home: full-bleed hero carousel (brand messages, fades into the background) → six glass shortcut cards overlapping it → glass boxes with horizontal product rows (Lo más nuevo, En venta, Para rentar, Para intercambiar, Servicios) → Categorías box (4 columns, latest photo per category) → 3-column trust strip → footer with link columns. Pillars open `/buscar?tipo=`.

Container 1240px; page padding 24px (12px on phones). Header: two rows, 116px desktop (logo · search · account · Guardados · Publicar / pillars) and three rows, 158px under 860px (logo · icons / search / pillars). Home: one glass panel (36px padding) holding "Lo más nuevo" (product grid `auto-fill minmax(220px, 1fr)`, 2 columns on phones).

## Elevation & Depth

Depth comes from translucency over the gradient plus deep, dark shadows (never colored glows except the CTA's red drop shadow).
- **Card rest**: `inset 0 1px 0 rgba(255,255,255,.06), 0 10px 24px -14px rgba(5,2,20,.7)`.
- **Card hover**: `inset 0 1px 0 rgba(255,255,255,.08), 0 22px 44px -18px rgba(5,2,20,.8)`.
- **Panel**: `inset 0 1px 0 rgba(255,255,255,.12), 0 40px 80px -40px rgba(5,2,20,.8)`.
- **CTA**: `0 10px 24px -10px rgba(255,23,68,.6)`.

## Shapes

Generous and soft: controls 12px, product photos 16px, cards 20px, panels 32px, search, nav links, chips and CTAs fully pill-shaped.

## Components

- **Search bar**: white pill with a 3px violet ring; left ☰ button opens the categories menu (a `<details>` panel that works without JS, closes on outside click/Escape); right 64px violet submit. Submits GET `/buscar?q=`.
- **Pillar nav**: text links (Venta, Renta, Intercambio, Servicios); the active one is bold with a sliding 3px red → violet underline.
- **Guardados**: cart icon + label + red counter; it's the "cart" (saved items), deals still close in the chat.
- **Product card**: square photo inset 8px, kind pill, title, price, footer with owner and neighborhood. Hover lifts 4px (fine pointer only); press scales .985.
- **Publicar**: dark glass panel; the header is the red-band "Agrega tu producto" with the add-photo icon.
- **Hero carousel visual**: right side of every slide is an analog punk fanzine collage of real people (CC photos as grainy photocopies with halftone, torn paper, tape, spray and marker in violet/red/magenta/yellow on newsprint), with three practical tips as torn paper strips at the bottom that match the slide legend, plus the photo credit. Generated with sharp into `web/public/carousel/` (720 and 400 px WebP).
- **Loading**: the "esfera y trueno" loader on the gradient with the original logo.

**Motion.** Strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`, 120-260ms; critically damped springs; hover gated to fine pointers; everything off under `prefers-reduced-motion`; solid fallbacks under `prefers-reduced-transparency`.

## Do's and Don'ts

- **Do** use the white logo files (`logo-horizontal-white.webp`, `logo-splash-white-*.webp`): white lettering, red sphere base.
- **Do** keep one gradient CTA per screen.
- **Do** keep the background gradient in `body::before` (fixed layer) for scroll performance.
- **Don't** add light sections, yellow buttons, or blur inside cards.
- **Don't** use em-dashes in visible copy.
- **Don't** say "barrio", "chamba" or "trueque" in visible UI.
