# Proposal

## Why

La roadmap pide despliegue con un push y preview automático por rama para revisar cada landing en un dispositivo real antes de mergear. Además el despliegue debe ocurrir solo si la QA pasa, para que nada por debajo de los umbrales llegue a una URL compartible.

## What Changes

- Workflow de GitHub Actions que, tras la QA, despliega `dist/` a Cloudflare Pages:
  - en PRs y ramas → deployment de preview con URL propia por rama;
  - en `main` → deployment de producción.
- Comentario en el PR con la URL del preview (actualizado en cada push, sin duplicar).
- Configuración de proyecto (`wrangler.toml` / nombre de proyecto) y documentación de los secretos necesarios.
- Cabeceras estáticas (`public/_headers`) con caché larga para assets con hash y cabeceras de seguridad básicas.

## Capabilities

### New Capabilities
- `deployment`: publicación del sitio estático con previews por rama, producción desde `main`, condicionada a la QA y con URL visible en el PR.

### Modified Capabilities
<!-- Ninguna. -->

## Impact

- Requiere en GitHub los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (los crea el usuario; nunca se commitean).
- Dependencia de desarrollo: `wrangler` (versión fijada).
- Depende de `setup-astro-starter` y `add-qa-pipeline`.
