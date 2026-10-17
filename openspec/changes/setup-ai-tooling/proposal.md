# Proposal

## Why

El pipeline depende de que Claude Code tenga, de forma reproducible en cualquier máquina o sesión cloud, la documentación actual de Astro, un navegador controlable y las tres skills de diseño de la roadmap. Hoy no hay nada instalado ni versionado, y cada sesión tendría que montarlo a mano.

## What Changes

- `.mcp.json` versionado con Astro Docs MCP y Playwright MCP.
- Instalación a nivel de proyecto (en `.claude/`) de ui-ux-pro-max, taste-skill e impeccable, fijando versión/commit y registrando la fuente en un manifiesto.
- Telemetría de impeccable desactivada por defecto.
- Reparto de roles entre skills documentado en `CLAUDE.md`: ui-ux-pro-max → tokens; taste-skill → dirección de arte e imágenes; impeccable → crítica y pulido.
- Script `scripts/setup-agent.sh` idempotente que reinstala/verifica todo, y hook SessionStart para sesiones cloud.
- `.claude/settings.json` con permisos para los comandos habituales del pipeline (npm, npx impeccable, playwright) y sin permisos destructivos.
- REA y el cloner **no** se instalan aquí: se integran (o no) en `add-analyze-reference-skill`.

## Capabilities

### New Capabilities
- `agent-tooling`: entorno de agente reproducible — servidores MCP, skills de diseño fijadas por versión, roles de cada skill, privacidad (telemetría) y verificación del entorno.

### Modified Capabilities
<!-- Ninguna. `project-guidelines` se amplía en implementación (sección de roles) sin cambiar sus requisitos. -->

## Impact

- Nuevos ficheros: `.mcp.json`, `.claude/settings.json`, `.claude/skills/*` de terceros, `scripts/setup-agent.sh`, `agent-tooling.lock.json` (manifiesto).
- Dependencias de red en setup (npm, GitHub). Requiere Chromium para Playwright y taste-skill (preinstalado en sesiones cloud).
- Depende de `setup-astro-starter` (necesita `package.json` y `CLAUDE.md`).
