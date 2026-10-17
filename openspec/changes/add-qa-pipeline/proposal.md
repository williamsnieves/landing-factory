# Proposal

## Why

El criterio de éxito del MVP es que una landing cumpla umbrales objetivos (Lighthouse ≥ 90, sin desbordes en 375/768/1440, reduced-motion, sin hallazgos principales de impeccable) **sin retoques manuales**. Para que Claude pueda iterar solo hasta cumplirlos necesita un comando de QA que mida todo y devuelva un veredicto legible por máquina.

## What Changes

- `scripts/qa.mjs` (expuesto como `npm run qa`): build, servidor de preview, y por cada página:
  - capturas a 375, 768 y 1440 px (página completa) en `qa/<timestamp>/`;
  - detección de desbordes horizontales y texto cortado;
  - comprobación con `prefers-reduced-motion: reduce`;
  - Lighthouse (rendimiento, accesibilidad, SEO, buenas prácticas) en móvil y escritorio;
  - `impeccable detect` sobre el código fuente.
- Informe `qa/<timestamp>/report.json` + `report.md` y código de salida 0/1 según umbrales.
- Umbrales configurables en `qa.config.json` con los valores de la roadmap por defecto.
- Workflow de GitHub Actions que ejecuta la QA en cada PR y sube el informe y capturas como artefacto.

## Capabilities

### New Capabilities
- `quality-gates`: verificación automática de una landing contra los criterios de aceptación del MVP, con informe y veredicto aptos para que un agente itere.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- Dependencias de desarrollo: `playwright` (o `@playwright/test`), `lighthouse`, `chrome-launcher`, `impeccable` (vía npx, versión fijada).
- Requiere Chromium (preinstalado en sesiones cloud; en CI se instala en el job).
- Nuevo workflow `.github/workflows/qa.yml`.
- Depende de `setup-astro-starter`. Lo usarán `add-new-landing-skill` y el despliegue.
