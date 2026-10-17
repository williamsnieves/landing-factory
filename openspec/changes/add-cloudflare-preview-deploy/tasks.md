# Tasks

## 1. Configuración

- [ ] 1.1 Añadir `wrangler` (versión fijada) y configuración del proyecto Pages (nombre desde configuración del sitio, salida `dist/`); verificar `npx wrangler pages deploy --help` y que no hay credenciales en ficheros
- [ ] 1.2 Añadir `public/_headers` con caché inmutable para `/_astro/*` y cabeceras de seguridad; verificar que el fichero aparece en `dist/` tras el build
- [ ] 1.3 Documentar en `README.md` cómo crear el proyecto en Cloudflare, el token mínimo y los secretos `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; verificar que los pasos son completos siguiéndolos una vez

## 2. Workflow

- [ ] 2.1 Unificar QA y despliegue en `.github/workflows/ci.yml` (job `qa` sube `dist/`, job `deploy` con `needs: qa`); verificar que un commit con QA fallida no despliega
- [ ] 2.2 Desplegar previews con `--branch` en PRs y producción en `main`; verificar que el PR de este change obtiene URL de preview que responde 200
- [ ] 2.3 Comentario único y actualizable con la URL del preview; verificar con dos pushes que solo existe un comentario
- [ ] 2.4 Mensaje claro cuando faltan secretos u origen es un fork; verificar ejecutando sin secretos (rama de prueba) que el job falla/omite sin exponer valores
- [ ] 2.5 Comprobar con `curl -I` sobre el preview que `/_astro/*` lleva `immutable` y las páginas las cabeceras de seguridad

## Workflow follow-up

- Abrir PR, revisar y mergear (requiere que el usuario haya creado los secretos).
- `/opsx:archive add-cloudflare-preview-deploy` tras el merge.
