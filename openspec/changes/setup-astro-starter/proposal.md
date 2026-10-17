# Proposal

## Why

El repo está vacío y todo el pipeline (análisis, generación, QA, despliegue) necesita una base Astro común sobre la que construir. Sin un starter con stack, capa de motion y reglas fijadas, cada landing generada reinventaría la base y sería imposible medir calidad de forma consistente.

## What Changes

- Proyecto Astro en la raíz del repo con Tailwind e islas de React, listo para `npm run dev` y `npm run build` (salida estática).
- Estructura de carpetas de la roadmap: `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/`, `scripts/`.
- Layout base con SEO mínimo (title, description, Open Graph, `lang`), tokens de diseño vía variables CSS y página de demostración.
- Capa de motion: scroll suave con Lenis, utilidades GSAP + ScrollTrigger (reveal, pin, parallax) que se desactivan con `prefers-reduced-motion`.
- `CLAUDE.md` con las reglas del sistema: stack, presupuesto de rendimiento, accesibilidad, principio "extraer patrones, no clonar" y prohibición de assets ajenos.
- Tooling de calidad mínimo: TypeScript estricto, `astro check`, Prettier.

## Capabilities

### New Capabilities
- `site-foundation`: base Astro del sistema — build estático, layout con SEO y accesibilidad, tokens de diseño y estructura de carpetas sobre la que se generan las landings.
- `motion-system`: utilidades de animación reutilizables (scroll suave, reveal, pin, parallax) con respeto obligatorio a `prefers-reduced-motion`.
- `project-guidelines`: reglas versionadas que cualquier agente debe seguir al trabajar en el repo (stack, rendimiento, accesibilidad, uso ético de referencias).

### Modified Capabilities
<!-- Ninguna: el repo no tiene specs previas. -->

## Impact

- Nuevas dependencias: `astro`, `@astrojs/react`, `react`, `react-dom`, `tailwindcss` (+ integración Vite), `gsap`, `lenis`, `typescript`, `@astrojs/check`, `prettier`.
- Requiere Node 22 LTS.
- Es la base de todos los changes posteriores (`setup-ai-tooling`, `add-qa-pipeline`, `add-cloudflare-preview-deploy`, `add-analyze-reference-skill`, `add-new-landing-skill`).
