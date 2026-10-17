# Proposal

## Why

El objetivo del MVP es que **una sola orden** genere, a partir de un nicho y 0–3 fichas de referencia, una landing original lista para desplegar que pase la QA sin retoques. Los pasos que en la primera prueba manual se repitan (síntesis, design system, construcción, QA) se convierten aquí en una skill versionada y en un script que la lanza sin intervención.

## What Changes

- Skill `/new-landing` en `.claude/skills/new-landing/` con fases:
  1. **Brief**: nicho, objetivo, tono, fichas de `patterns/` a usar.
  2. **Síntesis**: propuesta de mapa de páginas, secciones con su objetivo, plan de motion y piezas a usar → `sites/<slug>/PROPOSAL.md`.
  3. **Punto de control**: en modo interactivo se detiene para revisión; en modo automático continúa y deja la propuesta en el PR.
  4. **Design system**: `design-system/<slug>/MASTER.md` con ui-ux-pro-max y traducción a tokens CSS.
  5. **Construcción**: secciones propias, copy original, imágenes con licencia abierta (taste-skill) con `CREDITS.md`, capa de motion.
  6. **QA en bucle**: `npm run qa` → corregir → repetir hasta aprobar o agotar intentos; después impeccable critique/audit/polish.
- `scripts/new-site.sh <slug> --niche "..." [--refs a,b] [--auto]` que crea el proyecto del sitio desde el starter y lanza Claude Code en modo no interactivo.
- Registro de ejecución (`sites/<slug>/RUN.md`): decisiones, intentos de QA, tokens/tiempo aproximados.

## Capabilities

### New Capabilities
- `landing-generation`: generación de una landing completa y original a partir de un nicho y fichas de patrones, con punto de control de revisión, design system por nicho, créditos de assets y bucle de QA hasta cumplir los criterios.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- Nuevos: `.claude/skills/new-landing/`, `scripts/new-site.sh`, plantilla de sitio, `sites/` (o repos separados, ver design.md).
- Usa todo lo anterior: starter, skills de diseño, QA, despliegue y fichas.
- Coste: una construcción completa con taste-skill tarda 30–45 min y varios cientos de miles de tokens.
- Debe implementarse **después** de la primera prueba manual de la semana 1, para codificar solo lo que funcionó.
