# Tasks

## 1. Scaffolding

- [ ] 1.1 Crear proyecto Astro en la raíz (template minimal, TypeScript strict), `.nvmrc` con Node 22 y `engines` en `package.json`; verificar que `npm run build` genera `dist/index.html`
- [ ] 1.2 Añadir `@astrojs/react`, `react`, `react-dom`, `tailwindcss` y `@tailwindcss/vite`; verificar que una isla React de prueba con `client:visible` renderiza y que una página sin islas no carga el runtime de React
- [ ] 1.3 Añadir `@astrojs/check`, Prettier y `prettier-plugin-astro` con scripts `check` y `format`; verificar `npm run check` sin errores
- [ ] 1.4 Crear carpetas `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/`, `scripts/` con un README breve cada una; verificar que existen
- [ ] 1.5 Añadir `.gitignore` (node_modules, dist, .astro, capturas de QA) y verificar con `git status` que no aparecen artefactos generados

## 2. Layout y tokens

- [ ] 2.1 Crear `src/styles/tokens.css` con `@theme` (colores, fuentes, escala tipográfica, espaciados, radios) y verificar que cambiar el color primario cambia la demo tras el build
- [ ] 2.2 Crear `src/layouts/BaseLayout.astro` con `lang`, title, description, Open Graph, viewport, skip link y `<main id="main">`; verificar en `dist/index.html` que existen todas las etiquetas y que el primer Tab enfoca el skip link
- [ ] 2.3 Crear página de demostración `src/pages/index.astro` con 3–4 secciones de ejemplo usando tokens; verificar visualmente con `npm run dev`

## 3. Motion

- [ ] 3.1 Añadir `gsap` y `lenis`; implementar `src/components/motion/` con `initMotion()` (reveal, pin, parallax por atributos `data-*`), sincronización Lenis ↔ ScrollTrigger y `destroy()`; verificar en la demo que reveal, pin y parallax funcionan
- [ ] 3.2 Implementar el guard de `prefers-reduced-motion` y no-JS (clase `.js-motion`); verificar con emulación de reduced motion en el navegador que todo es visible, sin pin ni scroll suave, y con JS deshabilitado que el contenido es visible
- [ ] 3.3 Crear componente `<Motion />` que carga la capa de motion con import dinámico y la limpia en `astro:before-swap`; verificar que una página sin `<Motion />` no descarga GSAP
- [ ] 3.4 Documentar uso de las primitivas en `src/components/motion/README.md` con ejemplos copiables

## 4. Reglas del sistema

- [ ] 4.1 Escribir `CLAUDE.md`: stack, comandos, estructura, flujo OpenSpec (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`), presupuestos de calidad, principio "extraer patrones, no clonar", licencias y créditos (`CREDITS.md` por sitio); verificar que contiene los umbrales numéricos y la lista de lo que no se extrae
- [ ] 4.2 Añadir `README.md` del repo con quickstart (`npm ci`, `npm run dev`, `npm run build`) y verificar que los comandos funcionan tal cual

## Workflow follow-up

- Abrir PR, revisar y mergear.
- `/opsx:archive setup-astro-starter` tras el merge.
