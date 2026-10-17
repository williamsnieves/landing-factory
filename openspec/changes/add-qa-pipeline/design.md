# Design

## Context

Ver `proposal.md` — Why. Depende del starter estático (`dist/`). Chromium disponible en `/opt/pw-browsers` en cloud; en CI se instala con `npx playwright install --with-deps chromium`.

## Goals / Non-Goals

**Goals:**
- Un comando, un veredicto, un informe que el agente pueda leer para corregir.
- Ejecución local < 3 min para una landing de una página.

**Non-Goals:**
- Tests de regresión visual por diff de píxeles (se valorará más adelante).
- Comparar similitud con webs de referencia (lo cubre la revisión humana y las reglas).

## Decisions

1. **Node script (`scripts/qa.mjs`) con Playwright como librería**, no `@playwright/test`: queremos un informe propio y control del flujo, no un runner de tests. Lighthouse vía su API Node reutilizando el mismo Chromium (`chrome-launcher` con la ruta de Playwright).
2. **Servir `dist/` con `astro preview`** en un puerto libre; descubrir páginas leyendo `dist/**/index.html`.
3. **Desbordes**: en el navegador, `document.documentElement.scrollWidth > innerWidth` y recorrido de elementos de texto con `scrollWidth > clientWidth` y `overflow` distinto de visible; se reporta selector CSS único.
4. **Reduced motion**: `page.emulateMedia({ reducedMotion: 'reduce' })`, esperar `load` + 500 ms, comprobar `[data-reveal]` con opacidad > 0, ausencia de clase de Lenis en `<html>` y ausencia de `pin-spacer` de ScrollTrigger.
5. **Lighthouse en preset móvil y escritorio**; se toma el peor de ambos por categoría. Una ejecución por página (no la mediana de 3) para el MVP, con opción `--runs 3`.
6. **impeccable detect** vía `npx impeccable@<fija> detect --json src/`; severidades mapeadas en `qa.config.json`.
7. **Salida**: `qa/<ISO-timestamp>/{report.json,report.md,screens/*.png}`; `qa/latest` como symlink. `qa/` en `.gitignore`.
8. **CI**: `.github/workflows/qa.yml` en `pull_request`, Node 22, cache npm, sube `qa/latest` con `actions/upload-artifact`.

## Risks / Trade-offs

- [Lighthouse varía entre ejecuciones y en CI suele puntuar peor] → umbral aplicado al peor preset; `--runs 3` disponible; documentar variación.
- [Falsos positivos de "texto cortado" con `text-overflow: ellipsis` intencional] → permitir `data-qa-allow-clip` en el elemento.
- [impeccable puede cambiar formato JSON] → versión fijada y parser tolerante con test unitario sobre una salida de ejemplo.
