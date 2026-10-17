# Tasks

## 1. Infraestructura

- [ ] 1.1 Añadir dependencias de desarrollo (`playwright`, `lighthouse`, `chrome-launcher`) y `qa.config.json` con umbrales por defecto; verificar `npm ci` y que el JSON valida contra un esquema simple incluido en el script
- [ ] 1.2 Implementar en `scripts/qa.mjs` build + `astro preview` en puerto libre + descubrimiento de páginas; verificar que lista la página demo y cierra el servidor al terminar (también ante error)

## 2. Comprobaciones

- [ ] 2.1 Capturas de página completa a 375/768/1440; verificar que se generan 3 PNG por página
- [ ] 2.2 Detección de desbordes y texto cortado con selector y ancho; verificar con una página fixture que fuerza un desborde a 375 px (debe fallar) y con la demo (debe pasar)
- [ ] 2.3 Comprobación de reduced motion; verificar con fixture que deja un `[data-reveal]` invisible (debe fallar)
- [ ] 2.4 Lighthouse móvil y escritorio con umbrales; verificar que la demo supera 90 y que bajar el umbral a 101 provoca fallo
- [ ] 2.5 Integrar `impeccable detect` con mapeo de severidades; verificar con un test del parser sobre una salida JSON de ejemplo

## 3. Informe y CI

- [ ] 3.1 Generar `report.json`, `report.md` y symlink `qa/latest`; código de salida 0/1; verificar ambos casos con la demo y una fixture fallida
- [ ] 3.2 Añadir `npm run qa` y documentar en `CLAUDE.md` cómo leer el informe y el bucle "QA → corregir → QA"; verificar que el comando documentado funciona tal cual
- [ ] 3.3 Crear `.github/workflows/qa.yml` que ejecuta la QA en PRs y sube el informe; verificar en el PR de este change que el check aparece y el artefacto se descarga

## Workflow follow-up

- Abrir PR, revisar y mergear.
- `/opsx:archive add-qa-pipeline` tras el merge.
