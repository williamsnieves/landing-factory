# Roadmap: sistema de landings con Claude y Astro

Oct 17, 2026 · @Willians

## Objetivo y alcance

En 3 semanas tendremos un pipeline que, a partir de un nicho, genera con Claude una landing original en Astro, con calidad cercana a las webs de Awwwards y lista para desplegar.

- **Fase actual:** webs personales para probar y afinar el sistema. Pensar en producto viene después.
- **Stack elegido:** Astro, por rendimiento y facilidad de despliegue.
- **Nivel de automatización:** máximo posible; el pipeline lo controla un perfil de ingeniero de software.
- **Fuera de alcance por ahora:** clientes, licencias comerciales, CMS y multi‑idioma.

## Principio clave: extraer patrones, no clonar

Analizamos webs de referencia para entender cómo están construidas y guardamos solo fichas abstractas; nunca publicamos assets, textos ni diseño identificable de otra web.

- **Qué se extrae:** orden de secciones, tipo de hero, escala tipográfica, ritmo de la retícula, técnicas de animación (scroll pinning, parallax, shaders), densidad y paleta en términos genéricos.
- **Qué no se extrae:** imágenes, vídeos, modelos 3D, logos, copy, ilustraciones ni código copiado tal cual.
- **Uso del cloner y REA:** solo para extraer estructura y técnicas. Nunca se descargan ni publican assets de la web analizada.

**Marco legal (orientativo, no es asesoramiento jurídico):**

- Código, imágenes, textos y animaciones de una web tienen autor y están protegidos por propiedad intelectual.
- En España, imitar una web aprovechando el esfuerzo ajeno puede constituir competencia desleal.
- En la UE, la minería de datos se permite salvo reserva expresa del titular (robots.txt o términos de uso). Hay que revisar cada sitio.
- Antes de convertir esto en producto: consulta breve con un abogado de propiedad intelectual.

## Stack y herramientas

Base: **Astro + Tailwind + islas de React**, con GSAP + ScrollTrigger y Lenis para el motion, y Three.js o React Three Fiber solo cuando haga falta 3D.

| Recurso | Papel en el sistema | Uso |
| --- | --- | --- |
| [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Genera el design system por nicho (patrón, estilo, paleta, tipografías, anti‑patrones) y lo guarda en `design-system/<proyecto>/MASTER.md` | Núcleo: tokens |
| [taste-skill](https://github.com/leonxlnx/taste-skill) | Dirección de arte: elige una dirección entre 20 investigadas, busca la idea central, usa imágenes reales de colecciones abiertas con créditos y revisa la página en navegador a tres anchos. MIT | Núcleo: dirección de arte e imágenes |
| [impeccable](https://github.com/pbakaus/impeccable) | Crítica y pulido: comandos `critique`, `audit`, `polish`, `animate`, `overdrive`, más 59 reglas deterministas contra diseño genérico (`npx impeccable detect`). Apache 2.0 | Núcleo: QA de diseño |
| [Astro Docs MCP](https://docs.astro.build/en/guides/build-with-ai/) | Da a Claude la documentación actual de Astro y evita APIs antiguas | Núcleo |
| [21st.dev](https://21st.dev/) | Biblioteca de secciones y efectos en React + Tailwind; 2 copias gratis al día; revisar licencia de cada autor | Apoyo |
| [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) | Motor de la skill de análisis: solo sus fases de reconocimiento (capturas, tokens, interacciones) y specs por componente; sin descarga de assets ni build | Análisis de estructura |
| [REA](https://github.com/morluto/rea) | Detecta cómo está hecho un efecto en webs complejas (scripts, red, estructura): GSAP, Lenis, Three.js, shaders, transiciones | Opcional, detección de técnicas |

**Reparto de roles entre las tres skills de diseño.** Se solapan en parte, así que cada una tiene un único trabajo para que no se contradigan: ui-ux-pro-max fija los tokens (paleta, tipografías, espaciados), taste-skill decide la dirección de arte y las imágenes, e impeccable revisa y pule al final. En la primera prueba conviene comprobar si ui-ux-pro-max y taste-skill chocan; si lo hacen, nos quedamos con una sola para la dirección.

**A tener en cuenta:** una construcción completa con taste-skill tarda 30–45 minutos y consume varios cientos de miles de tokens. impeccable envía telemetría anónima al elegir direcciones visuales; se desactiva con `npx impeccable telemetry off`.

Despliegue: Cloudflare Pages, con preview automático por rama.

## Flujo de análisis de referencias

De 1–3 webs de inspiración sale una propuesta de estructura propia, que se revisa antes de construir nada.

1. **Entrada:** 1–3 URLs y qué gusta de cada una (el hero de una, el scroll de otra).
2. **Análisis por URL** con el reconocimiento del cloner adaptado (y REA si un efecto no queda claro). Sale una ficha en `patterns/` con:
   - mapa de secciones y su orden
   - retícula, espaciados y escala tipográfica
   - inventario de animaciones y la técnica detrás de cada una
   - librerías detectadas
3. **Síntesis:** Claude cruza las fichas con el nicho y propone mapa de páginas, secciones con su objetivo, plan de motion y piezas de la biblioteca a usar.
4. **Revisión:** ajustas la propuesta. Es el punto de control más barato.
5. **Construcción** con el `MASTER.md` del nicho, secciones propias, copy original e imágenes con licencia abierta (taste-skill). Después, revisión con impeccable: critique, audit y polish.

## Modelo de trabajo: híbrido

Ideación en claude.ai y construcción en Claude Code, porque el pipeline necesita un repo real, skills versionadas y ejecución sin intervención.

| Fase | Dónde | Por qué |
| --- | --- | --- |
| Brief, nicho, moodboard, ideas | claude.ai | Conversacional y rápido, sin montar nada |
| Design system, build, QA, despliegue | Claude Code (proyecto de código con repo conectado) | Git, `npm run dev`, skills en `.claude/`, modo no interactivo y QA visual con navegador |

Ventajas concretas de Claude Code para este caso:

- Cada web es un repo con historial y despliegue con un push.
- Las skills `/analyze-reference` y `/new-landing` viven en el repo y se versionan.
- El modo no interactivo permite lanzar el pipeline desde un script o desde GitHub Actions.
- Con Playwright, Claude abre la web, hace capturas y corrige hasta pasar la QA.

## Roadmap por semanas

Tres semanas hasta un pipeline que genera una landing con una sola orden; después, iterar con webs reales.

&#91;embedded content: roadmap del MVP · 4 fases, 2 hitos\]

La primera prueba valida el flujo a mano en la semana 1; solo lo que funcione pasa a las skills en la semana 3.

## Estructura del repo propuesta

Un único repo starter que contiene el sistema (skills, patrones, secciones) y desde el que se genera cada web.

```text
landing-factory/
  CLAUDE.md                 # reglas: stack, rendimiento, accesibilidad, sin assets ajenos
  .mcp.json                 # Astro docs MCP + Playwright MCP
  .claude/
    skills/
      analyze-reference/    # URL -> ficha abstracta en patterns/
      new-landing/          # nicho -> web completa
  patterns/                 # fichas de webs de referencia (solo patrones)
  design-system/            # MASTER.md por proyecto (ui-ux-pro-max)
  src/
    components/sections/    # hero, features, gallery, testimonials, cta, footer
    components/motion/      # utilidades GSAP, Lenis, reveal, pin
    layouts/
    pages/
  scripts/
    new-site.sh             # crea el proyecto y lanza Claude Code
    qa.mjs                  # capturas 375/768/1440 + Lighthouse
```

## Primera prueba

Objetivo: una landing de un nicho elegido, generada de principio a fin en el proyecto de código, para validar el flujo antes de automatizarlo.

- [x] Crear el proyecto de código y conectar un repo vacío de GitHub
- [ ] Montar el starter Astro (Tailwind, React, GSAP, Lenis) y el `CLAUDE.md`
- [ ] Instalar Astro Docs MCP, ui-ux-pro-max, taste-skill, impeccable y Playwright
- [ ] Elegir un nicho de prueba y 1–3 webs de inspiración
- [ ] Analizar cada referencia y guardar su ficha en `patterns/`
- [ ] Proponer la estructura del sitio a partir de las fichas y revisarla
- [ ] Generar el `MASTER.md` del nicho con ui-ux-pro-max
- [ ] Construir la landing: estructura, copy original y capa de motion
- [ ] QA: build, Lighthouse, impeccable detect y capturas en 375/768/1440 px
- [ ] Desplegar un preview en Cloudflare Pages y anotar qué falla

Los pasos que se repitan a mano en esta prueba son los que pasarán a las skills en la semana 3.

## Criterios de éxito

El MVP está listo cuando una sola orden genera una landing que cumple todo esto sin retoques manuales:

- Lighthouse ≥ 90 en rendimiento, accesibilidad y SEO, y sin hallazgos principales en impeccable detect.
- Sin desbordes ni texto cortado en 375, 768 y 1440 px.
- Animaciones fluidas que respetan `prefers-reduced-motion`.
- Copy y assets originales; ninguna pieza reconocible de las referencias.
- 3 nichos distintos producen 3 webs visualmente diferentes.

## Fuentes

- [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)
- [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [21st.dev](https://21st.dev/)
- [REA](https://github.com/morluto/rea)
- [Astro: Build with AI](https://docs.astro.build/en/guides/build-with-ai/)
