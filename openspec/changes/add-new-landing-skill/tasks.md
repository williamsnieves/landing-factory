# Tasks

## 0. Requisito previo

- [ ] 0.1 Completar la primera prueba manual de la roadmap (nicho de prueba + 1–3 referencias analizadas + landing construida y desplegada) y anotar en `design.md` qué pasos se repitieron y qué falló; verificar que las notas existen antes de seguir

## 1. Estructura de sitios

- [ ] 1.1 Mover el starter a `templates/site/` y configurar npm workspaces con `sites/*` (según la decisión 1 aprobada en revisión); verificar que la raíz sigue construyendo y pasando QA
- [ ] 1.2 Implementar `scripts/new-site.sh <slug> --niche ... [--refs ...] [--auto] [--dry-run]`: crea `sites/<slug>/` desde la plantilla y lanza Claude Code; verificar con `--dry-run` que crea la carpeta y la propuesta sin construir

## 2. Skill /new-landing

- [ ] 2.1 Escribir `.claude/skills/new-landing/SKILL.md` con las fases brief → síntesis → punto de control → design system → construcción → QA, y plantillas de `PROPOSAL.md`, `RUN.md` y `CREDITS.md`; verificar que aparece como `/new-landing`
- [ ] 2.2 Fase de design system: generar `design-system/<slug>/MASTER.md` con ui-ux-pro-max y traducirlo a `tokens.css` del sitio; verificar que los valores coinciden
- [ ] 2.3 Fase de construcción con taste-skill (dirección de arte e imágenes con créditos) y primitivas de motion; verificar que toda imagen externa aparece en `CREDITS.md` con un chequeo automático
- [ ] 2.4 Comprobación de originalidad de copy (n-gramas) contra las referencias usadas; verificar con una frase copiada a propósito que se detecta
- [ ] 2.5 Bucle de QA con máximo de intentos y priorización de fallos, seguido de impeccable critique/audit/polish; verificar con un sitio que falla al principio que el bucle corrige y converge
- [ ] 2.6 Registro `RUN.md` con entradas, decisiones, intentos y duración; verificar contenido tras una ejecución

## 3. Validación del MVP

- [ ] 3.1 Generar con una sola orden en modo automático un sitio para un nicho y verificar que pasa la QA sin retoques y se despliega su preview
- [ ] 3.2 Generar sitios para 3 nichos distintos y verificar que difieren en paleta, tipografía principal y tipo de hero
- [ ] 3.3 Documentar el flujo completo en `README.md` y `CLAUDE.md`; verificar que un usuario puede seguirlo de principio a fin

## Workflow follow-up

- Abrir PR, revisar y mergear.
- `/opsx:archive add-new-landing-skill` tras el merge.
