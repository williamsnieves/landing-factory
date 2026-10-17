# Proposal

## Why

El principio clave de la roadmap es "extraer patrones, no clonar": de 1–3 webs de inspiración se obtienen fichas abstractas (secciones, retícula, tipografía, motion, librerías) que alimentan la síntesis. Hoy ese análisis sería manual, inconsistente y con riesgo de guardar assets o texto ajeno. Una skill versionada lo hace repetible y aplica las salvaguardas legales por diseño.

## What Changes

- Skill `/analyze-reference <url> [--focus "qué gusta"]` en `.claude/skills/analyze-reference/`.
- Comprobación previa de `robots.txt` y de reserva de minería de datos (TDM) del sitio; si hay reserva, se aborta.
- Reconocimiento con navegador (adaptando las fases de reconocimiento del ai-website-cloner-template): capturas temporales a 375/768/1440, extracción de estructura DOM, estilos computados y comportamiento al hacer scroll.
- Detección de librerías y técnicas (GSAP, ScrollTrigger, Lenis, Locomotive, Three.js, WebGL/shaders, View Transitions…) por globals, scripts y red; REA opcional cuando un efecto no queda claro.
- Salida: ficha abstracta `patterns/<slug>.md` con frontmatter + secciones fijas, sin assets, copy ni código del sitio.
- Plantilla de ficha `patterns/_template.md` y validador `scripts/validate-pattern.mjs`.
- Las capturas son solo material de trabajo local: se guardan fuera del repo (ignoradas) y se borran al terminar.

## Capabilities

### New Capabilities
- `reference-analysis`: conversión de una URL de referencia en una ficha abstracta de patrones, con salvaguardas de cumplimiento (robots/TDM, sin assets, sin copy) y formato validable.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- Nuevos: `.claude/skills/analyze-reference/` (SKILL.md + scripts de reconocimiento), `patterns/_template.md`, `scripts/validate-pattern.mjs`.
- Usa Playwright (de `setup-ai-tooling`). REA (`rea-agents`) solo como opcional, no requerido.
- Depende de `setup-astro-starter` y `setup-ai-tooling`.
- Nota legal: orientativo, no asesoramiento jurídico (ver roadmap).
