# Design

## Context

Ver `proposal.md` — Why. El ai-website-cloner-template (MIT) tiene una skill `clone-website` con fases de reconocimiento (capturas, tokens, interacciones) y fases de descarga de assets y reconstrucción. Solo nos interesan las primeras. REA es un MCP/CLI para ingeniería inversa; útil pero pesado.

## Goals / Non-Goals

**Goals:** fichas consistentes y comparables entre sí, generadas en < 10 min por URL, sin riesgo de filtrar contenido ajeno al repo.

**Non-Goals:** reconstrucción visual, descarga de assets, análisis de sitios con login, crawl de varias páginas (solo la URL dada, opcionalmente 1–2 enlaces internos si el usuario los pasa).

## Decisions

1. **Skill propia inspirada en el cloner, no vendorizar el cloner entero.** Se reescriben (con atribución MIT en el SKILL.md) solo las instrucciones de reconocimiento, adaptadas a "describir en abstracto". Así no entra en el repo el código de descarga de assets.
2. **Scripts deterministas + juicio del modelo.** `recon.mjs` (Playwright) produce un JSON temporal en `.cache/analyze/<slug>/`: árbol de secciones (landmarks, alturas, orden), estilos computados agregados (familias tipográficas genéricas por clasificación, tamaños, line-heights, rejilla, espaciados), globals JS detectados (`gsap`, `ScrollTrigger`, `Lenis`, `THREE`, `__NEXT_DATA__`…), scripts/red por dominio, presencia de `<canvas>`/WebGL, y capturas por scroll a 3 anchos. Claude lee eso + capturas y redacta la ficha. Las capturas nunca salen de `.cache/` (en `.gitignore`) y se borran al final.
3. **robots/TDM**: `check-robots.mjs` evalúa `robots.txt` para user-agents genéricos y de IA (`*`, `ClaudeBot`, `anthropic-ai`, `GPTBot`), `<meta name="robots">`, cabecera `X-Robots-Tag`, `tdm-reservation` (TDMRep: `/.well-known/tdmrep.json` y meta). Cualquier reserva → abortar.
4. **Validador** `scripts/validate-pattern.mjs`: frontmatter obligatorio, secciones obligatorias, y heurísticas de contenido prohibido: URLs a ficheros de imagen/vídeo/fuente, bloques de código > 3 líneas, hex colors, comillas largas (> 12 palabras) que sugieran copy. Se ejecuta al final de la skill y en CI sobre `patterns/*.md`.
5. **REA opcional**: si `recon` no identifica la técnica de un efecto marcado como interesante, la skill sugiere `npx rea-agents analyze-javascript-application` y registra el resultado solo como conclusión en texto.
6. **Plantilla de ficha** (`patterns/_template.md`): Resumen · Mapa de secciones · Hero · Retícula y espaciado · Tipografía · Paleta · Densidad · Motion (tabla) · Librerías · Qué tomar / qué evitar.

## Risks / Trade-offs

- [Heurística de copy produce falsos positivos] → el validador permite marcar descripciones propias con `> nota:`; revisión humana en el PR.
- [Sitios que bloquean headless] → abortar limpio (requisito "URL inaccesible"), no intentar evadir.
- [Detección de librerías por globals falla con bundles minificados] → combinar con firmas en nombres de fichero/red y declarar confianza.
- Marco legal orientativo; antes de producto, consulta con abogado (roadmap).
