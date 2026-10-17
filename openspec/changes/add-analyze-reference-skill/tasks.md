# Tasks

## 1. Plantilla y validador

- [ ] 1.1 Crear `patterns/_template.md` con frontmatter y secciones fijas y `patterns/README.md` con las reglas de qué se extrae y qué no; verificar que la plantilla pasa el validador una vez rellenada con datos ficticios
- [ ] 1.2 Implementar `scripts/validate-pattern.mjs` (estructura + contenido prohibido) con tests sobre fixtures válidas e inválidas (URL de imagen, bloque de código, hex, copy largo, sección ausente); verificar `npm run validate:patterns` y los tests
- [ ] 1.3 Añadir validación de `patterns/*.md` al workflow de CI; verificar que una ficha inválida hace fallar el check

## 2. Reconocimiento

- [ ] 2.1 Implementar `check-robots.mjs` (robots.txt, meta robots, X-Robots-Tag, TDMRep) con tests sobre respuestas simuladas; verificar que una reserva aborta
- [ ] 2.2 Implementar `recon.mjs` con Playwright: secciones, estilos agregados, globals/librerías, red, canvas/WebGL, capturas por scroll a 375/768/1440 en `.cache/analyze/<slug>/`; verificar contra la propia demo del starter servida localmente
- [ ] 2.3 Garantizar limpieza de `.cache/analyze/<slug>/` en éxito y error y que `.cache/` está en `.gitignore`; verificar forzando un error a mitad

## 3. Skill

- [ ] 3.1 Escribir `.claude/skills/analyze-reference/SKILL.md`: entradas, pasos (robots → recon → redacción → validación → limpieza), reglas de abstracción, uso opcional de REA y atribución MIT al cloner; verificar que aparece como `/analyze-reference`
- [ ] 3.2 Ejecutar la skill sobre una URL pública de prueba con permiso de rastreo y revisar a mano la ficha; verificar que pasa el validador y no contiene contenido del sitio
- [ ] 3.3 Documentar el uso en `CLAUDE.md` y `README.md`; verificar que el ejemplo documentado funciona

## Workflow follow-up

- Abrir PR, revisar y mergear.
- `/opsx:archive add-analyze-reference-skill` tras el merge.
