# landing-factory

Pipeline que, a partir de un nicho, genera con Claude una landing original en Astro, con calidad cercana a Awwwards y lista para desplegar. Ver [docs/roadmap.md](docs/roadmap.md).

## Cómo trabajamos: OpenSpec

Los requisitos viven en [`openspec/`](openspec/) ([OpenSpec](https://github.com/Fission-AI/OpenSpec)):

- `openspec/specs/` — lo que el sistema hace hoy (se rellena al archivar changes).
- `openspec/changes/` — trabajo propuesto: `proposal.md` (por qué), `specs/` (qué), `design.md` (cómo), `tasks.md` (pasos).

Ciclo por change, un PR por change:

```text
/opsx:apply <change>     # implementar siguiendo tasks.md
  → PR → revisión → merge
/opsx:archive <change>   # fusiona las specs del change en openspec/specs/
```

CLI: `npm i -g @fission-ai/openspec` · `openspec list` · `openspec show <change>` · `openspec validate --all --strict`.

## Orden de implementación

| # | Change | Semana roadmap | Depende de |
|---|--------|----------------|------------|
| 1 | `setup-astro-starter` — Astro + Tailwind + React, motion (GSAP/Lenis), `CLAUDE.md` | 1 | — |
| 2 | `setup-ai-tooling` — Astro Docs MCP, Playwright MCP, ui-ux-pro-max, taste-skill, impeccable | 1 | 1 |
| 3 | `add-qa-pipeline` — `npm run qa`: capturas 375/768/1440, desbordes, reduced motion, Lighthouse, impeccable | 1–2 | 1 |
| 4 | `add-cloudflare-preview-deploy` — previews por rama gated por QA | 2 | 1, 3 |
| 5 | `add-analyze-reference-skill` — `/analyze-reference` URL → ficha abstracta en `patterns/` | 2 | 1, 2 |
| — | **Primera prueba manual** (nicho + referencias + landing a mano) | 2 | 1–5 |
| 6 | `add-new-landing-skill` — `/new-landing` + `scripts/new-site.sh`, una orden → landing | 3 | todo lo anterior |
