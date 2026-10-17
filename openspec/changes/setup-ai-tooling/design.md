# Design

## Context

Ver `proposal.md` — Why. Las sesiones pueden ser locales o cloud (contenedor efímero, Chromium preinstalado en `/opt/pw-browsers`). Las tres skills tienen instaladores propios distintos (`uipro`, `npx skills`, `npx impeccable`), y algunos son interactivos.

## Goals / Non-Goals

**Goals:**
- Un único `scripts/setup-agent.sh` no interactivo que deje el entorno listo.
- Versiones fijadas para que dos sesiones generen con las mismas skills.

**Non-Goals:**
- Instalar REA o el cloner (van en `add-analyze-reference-skill`).
- 21st.dev: es apoyo manual (2 copias/día, licencia por autor); no se automatiza.

## Decisions

1. **Skills vendorizadas en `.claude/skills/` y commiteadas**, en vez de plugins de marketplace. Motivo: el plugin se instala por usuario, no por repo, y no queda versionado; el pipeline headless (`claude -p`) necesita que estén en el repo. Instalación:
   - ui-ux-pro-max: `npx ui-ux-pro-max-cli init --ai claude` (fijando versión del CLI).
   - taste-skill: `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` (fijando commit).
   - impeccable: `npx impeccable install --providers=claude --scope=project`.
   El script registra versión/commit en `agent-tooling.lock.json`.
   Alternativa: submódulos git → más frágil para el agente y para Cloudflare.
2. **`.mcp.json`**: Astro Docs MCP remoto (`https://mcp.docs.astro.build/mcp`, HTTP) y Playwright MCP (`npx @playwright/mcp@<versión fijada>` con `--headless`). En cloud, Playwright usa `executablePath` de Chromium preinstalado.
3. **Telemetría**: `npx impeccable telemetry off` en el setup; `OPENSPEC_TELEMETRY=0` en `.claude/settings.json` → `env`.
4. **Hook SessionStart** (`.claude/settings.json`) que ejecuta `scripts/setup-agent.sh --verify` (rápido, sin red si todo está) para sesiones cloud.
5. **Roles** documentados en `CLAUDE.md` (sección "Skills de diseño"). Si en la primera prueba ui-ux-pro-max y taste-skill chocan en dirección visual, se decide en un change aparte cuál se queda.

## Risks / Trade-offs

- [Skills de terceros cambian de estructura entre versiones] → versión fijada + `--verify` comprueba que existen los `SKILL.md` esperados.
- [Licencias: ui-ux-pro-max (ver LICENSE), taste-skill MIT, impeccable Apache 2.0] → el manifiesto registra licencia; comprobar compatibilidad al implementar antes de commitear el código vendorizado.
- [Coste: taste-skill consume cientos de miles de tokens por build] → documentarlo en `CLAUDE.md`; su uso se limita a la fase de construcción.
- [El hook impeccable puede añadir hooks propios a `.claude/settings.json`] → revisar el diff tras instalar y conservar solo lo necesario.
