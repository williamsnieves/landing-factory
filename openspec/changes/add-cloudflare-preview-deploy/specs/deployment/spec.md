# Spec Delta

## Purpose

Publica cada versión del sitio en una URL revisable — preview por rama y producción desde la rama principal — solo cuando la QA ha pasado.

## ADDED Requirements

### Requirement: Preview por rama
Cada push a una rama con pull request abierto SHALL publicar un preview del sitio en una URL estable asociada a esa rama.

#### Scenario: Push a rama de feature
- **WHEN** se hace push a una rama con un PR abierto y la QA pasa
- **THEN** el sitio queda publicado en una URL de preview de esa rama

### Requirement: Producción desde la rama principal
Un push a la rama principal SHALL publicar el sitio en la URL de producción del proyecto.

#### Scenario: Merge a main
- **WHEN** se mergea un PR en `main` y la QA pasa
- **THEN** la URL de producción sirve la nueva versión

### Requirement: Despliegue condicionado a la QA
El despliegue MUST NOT ejecutarse si la QA del mismo commit ha fallado.

#### Scenario: QA fallida
- **WHEN** la QA de un commit falla
- **THEN** no se crea ningún deployment para ese commit y el check de despliegue aparece como omitido

### Requirement: URL del preview en el PR
El sistema SHALL publicar la URL del preview en el pull request en un único comentario que se actualiza en cada despliegue.

#### Scenario: Segundo push
- **WHEN** se hace un segundo push a la misma rama del PR
- **THEN** el comentario existente se actualiza con la nueva URL y el commit, sin crear otro comentario

### Requirement: Secretos fuera del repo
Las credenciales de despliegue MUST leerse de secretos del entorno de CI y MUST NOT aparecer en ficheros versionados ni en logs.

#### Scenario: Secretos ausentes
- **WHEN** el workflow se ejecuta sin los secretos configurados
- **THEN** el paso de despliegue termina con un mensaje que indica qué secretos faltan, sin exponer valores

### Requirement: Cabeceras de caché y seguridad
El sitio publicado SHALL servir los assets con hash con caché inmutable de larga duración y las páginas HTML con cabeceras de seguridad básicas (nosniff, referrer-policy, frame-ancestors).

#### Scenario: Asset con hash
- **WHEN** se solicita un fichero de `/_astro/` del sitio publicado
- **THEN** la respuesta incluye `Cache-Control` con `immutable` y `max-age` de al menos un año
