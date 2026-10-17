# Design

## Context

Repo vacío (solo OpenSpec). Ver `proposal.md` — Why. El starter es a la vez la plantilla de cada landing y el banco de pruebas de los changes siguientes, así que debe ser pequeño, estático por defecto y fácil de copiar.

## Goals / Non-Goals

**Goals:**
- Base que construya en estático, pase `astro check` y quede lista para la QA del change `add-qa-pipeline`.
- Motion "Awwwards-like" disponible desde el día 1 sin coste en páginas que no lo usen.
- Reglas del sistema escritas una vez en `CLAUDE.md`.

**Non-Goals:**
- Secciones finales de diseño (las genera `add-new-landing-skill` por nicho).
- 3D (Three.js / R3F): se añade bajo demanda en un change posterior.
- CMS, i18n, formularios con backend.

## Decisions

1. **Astro 7 con salida estática (`output: 'static'`)**. Encaja con Cloudflare Pages sin adaptador. Alternativa: SSR con adaptador de Cloudflare → innecesario para landings.
2. **Tailwind v4 vía `@tailwindcss/vite`** con tokens en `src/styles/tokens.css` usando `@theme`. Las variables CSS son la única fuente de verdad del tema; el `MASTER.md` del nicho se traduce a este fichero. Alternativa: `tailwind.config` JS → v4 favorece configuración CSS-first.
3. **Islas React (`@astrojs/react`) solo cuando haya interacción** (`client:visible` por defecto). Secciones en `.astro` siempre que sea posible.
4. **Motion en vanilla TS, no en React**: `src/components/motion/` expone `initMotion()` que lee atributos `data-reveal`, `data-pin`, `data-parallax` y crea los ScrollTrigger. Un componente `<Motion />` (script Astro) lo inicializa por página. Lenis se sincroniza con `gsap.ticker`. Así una sección `.astro` gana motion con un atributo y no necesita hidratar React. Alternativa: hooks de React → obliga a hidratar islas solo para animar.
5. **Reduced motion y no-JS**: el estado inicial oculto de `data-reveal` se aplica solo bajo una clase `.js-motion` en `<html>` añadida por script inline cuando hay JS y no hay `prefers-reduced-motion: reduce`. Sin esa clase todo es visible.
6. **Limpieza**: `initMotion()` devuelve una función `destroy()` que mata ScrollTriggers y Lenis; se engancha a `astro:before-swap` si se usan view transitions.
7. **Calidad de código**: TypeScript `strict`, `astro check`, Prettier con `prettier-plugin-astro`. ESLint queda fuera para no inflar el MVP.
8. **Node 22 LTS** fijado en `.nvmrc` y `engines`.

## Risks / Trade-offs

- [GSAP + Lenis añaden ~50 KB] → se cargan solo en páginas que incluyen `<Motion />`, con import dinámico.
- [Pin/parallax causan CLS o desbordes en móvil] → el QA del change `add-qa-pipeline` mide desbordes a 375 px; las primitivas permiten desactivar pin por breakpoint (`data-pin-min="md"`).
- [Astro 7 cambia APIs respecto a lo que conoce el modelo] → `setup-ai-tooling` añade Astro Docs MCP; mientras tanto, seguir la doc oficial.
