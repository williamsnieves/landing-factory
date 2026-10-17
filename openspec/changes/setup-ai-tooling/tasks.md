# Tasks

## 1. MCP

- [ ] 1.1 Crear `.mcp.json` con Astro Docs MCP (HTTP) y Playwright MCP (versión fijada, headless); verificar con `claude mcp list` (o abriendo sesión) que ambos conectan
- [ ] 1.2 Documentar en `CLAUDE.md` cuándo usar cada MCP; verificar que la sección existe

## 2. Skills de diseño

- [ ] 2.1 Instalar ui-ux-pro-max a nivel de proyecto; verificar que existe su `SKILL.md` en `.claude/skills/` y que la skill aparece en una sesión nueva
- [ ] 2.2 Instalar taste-skill (`design-taste-frontend`) fijando commit; verificar su `SKILL.md`
- [ ] 2.3 Instalar impeccable con `--providers=claude --scope=project`, desactivar telemetría; verificar `npx impeccable detect --help` y estado de telemetría
- [ ] 2.4 Revisar licencias de las tres skills y registrar origen, versión/commit y licencia en `agent-tooling.lock.json`; verificar que el JSON es válido y completo
- [ ] 2.5 Añadir a `CLAUDE.md` la sección "Skills de diseño" con el rol único de cada una y avisos de coste; verificar contenido

## 3. Setup reproducible

- [ ] 3.1 Escribir `scripts/setup-agent.sh` (modos `install` y `--verify`) y verificar que dos ejecuciones seguidas terminan con 0 y no cambian `git status`
- [ ] 3.2 Hacer que `--verify` falle con mensaje claro si falta una skill; verificar renombrando temporalmente una carpeta de skill
- [ ] 3.3 Crear `.claude/settings.json` con `env.OPENSPEC_TELEMETRY=0`, permisos para npm/npx/playwright y hook SessionStart que ejecuta `--verify`; verificar en una sesión nueva que el hook corre sin errores

## Workflow follow-up

- Abrir PR, revisar y mergear.
- `/opsx:archive setup-ai-tooling` tras el merge.
