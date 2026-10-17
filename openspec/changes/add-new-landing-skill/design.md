# Design

## Context

Ver `proposal.md` — Why. Disponibles al implementar: starter, motion, skills de diseño, QA, despliegue y `/analyze-reference`. Este change se implementa en la semana 3, tras la primera prueba manual; las tareas se ajustarán con lo aprendido (editar este design y tasks está previsto).

## Goals / Non-Goals

**Goals:** una orden → sitio aprobado por QA; propuesta revisable; trazabilidad de decisiones y créditos.

**Non-Goals:** multi-idioma, CMS, formularios con backend, 3D por defecto (solo si la propuesta lo justifica).

## Decisions

1. **Dónde vive cada sitio: `sites/<slug>/` dentro de este repo (monorepo con npm workspaces)**, cada uno con su `package.json` heredado del starter y su proyecto Cloudflare Pages. Motivo: patrones, skills y QA se comparten sin copiar; un PR por sitio encaja con el flujo de revisión. El starter de la raíz se convierte en `templates/site/` al implementar.
   Alternativa (roadmap: "cada web es un repo"): `new-site.sh` copia el starter a `../<slug>`, hace `git init` y crea repo. Más aislado, pero duplica skills y patrones y exige crear repos de GitHub (no posible desde sesiones cloud sin permisos extra). **Decisión abierta para el usuario en la revisión del PR**; cambiarla solo afecta a `new-site.sh` y a la ruta de salida.
2. **Skill orquestadora + subagentes por fase**: la skill encadena fases y delega construcción/QA a subagentes para limitar el contexto. Cada fase escribe su artefacto en disco (PROPOSAL.md, MASTER.md, RUN.md) para poder reanudar.
3. **Modo automático** vía `claude -p "/new-landing ..." --permission-mode acceptEdits` con lista de herramientas permitidas en `.claude/settings.json`; en Actions se puede lanzar con `workflow_dispatch`.
4. **Bucle de QA**: máx. 5 intentos (configurable); cada intento lee `qa/latest/report.json` y prioriza fallos por tipo (desbordes → reduced motion → a11y → rendimiento → impeccable).
5. **Originalidad**: comprobación de copy contra los textos visibles de las referencias usando el material temporal del análisis (si sigue disponible) o una nueva lectura en memoria de la página; nunca se guarda ese texto. Comparación por n-gramas de 8 palabras.
6. **Diversidad**: el brief registra paleta/tipografía/hero de los sitios existentes en `sites/` y la síntesis debe elegir valores distintos.

## Risks / Trade-offs

- [Choque ui-ux-pro-max vs taste-skill en dirección visual] → la skill aplica el reparto de roles; si la primera prueba demuestra choque, se elimina una (change aparte).
- [Coste y duración elevados] → modo `--dry-run` que solo genera PROPOSAL.md + MASTER.md.
- [La QA nunca converge en sitios con mucho motion] → límite de intentos y registro de fallos; la propuesta limita el número de efectos pesados.
