# Design

## Context

Ver `proposal.md` — Why. Sitio 100 % estático (`dist/`). La QA (`add-qa-pipeline`) ya corre en Actions.

## Goals / Non-Goals

**Goals:** previews por rama y producción con un push, gated por QA.

**Non-Goals:** dominios personalizados, analítica, funciones/SSR en Cloudflare.

## Decisions

1. **Deploy desde GitHub Actions con `wrangler pages deploy`** en vez de la integración Git nativa de Cloudflare. Motivo: la integración nativa no puede esperar a nuestra QA y despliega aunque falle. Con Actions, el job `deploy` tiene `needs: qa`. Alternativa: integración nativa + "branch build controls" → más simple pero sin gate.
2. **Un workflow `ci.yml`** con jobs `qa` → `deploy` (reemplaza a `qa.yml` reutilizando sus pasos) para no construir dos veces: `qa` sube `dist/` como artefacto y `deploy` lo descarga.
3. **`--branch=${{ github.head_ref || github.ref_name }}`**: Pages genera alias por rama (`<rama>.<proyecto>.pages.dev`), lo que da URL estable.
4. **Comentario del PR** con `marocchino/sticky-pull-request-comment` (o script con `actions/github-script` y marcador HTML) para actualizar en lugar de duplicar.
5. **PRs desde forks** no despliegan (no tienen secretos); el job se omite con mensaje.
6. **Cloudflare Pages vs Workers Static Assets**: Cloudflare está empujando Workers para sitios nuevos; mantenemos Pages por la roadmap y porque los previews por rama son nativos. Si Pages se depreca, migrar es cambiar el comando de deploy.

## Risks / Trade-offs

- [Token con permisos excesivos] → documentar token con solo "Cloudflare Pages: Edit".
- [Nombres de rama largos o con `/` generan alias truncados] → Pages normaliza; documentar el formato de URL.
- [Cada sitio generado necesitará su propio proyecto Pages] → el nombre de proyecto se lee de `site.config.json`/variable; `add-new-landing-skill` lo rellena.
