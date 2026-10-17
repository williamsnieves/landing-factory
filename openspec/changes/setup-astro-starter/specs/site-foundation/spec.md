# Spec Delta

## Purpose

Define la base técnica común sobre la que se construye cualquier landing del sistema: build estático, layout accesible con SEO, tokens de diseño y estructura de carpetas predecible para los agentes.

## ADDED Requirements

### Requirement: Build estático reproducible
El sistema SHALL producir un sitio estático en `dist/` con un único comando de build, sin errores de tipos ni de compilación, partiendo de una instalación limpia de dependencias.

#### Scenario: Build desde cero
- **WHEN** se ejecuta `npm ci` seguido de `npm run build` en un checkout limpio
- **THEN** el comando termina con código 0
- **AND** `dist/index.html` existe

#### Scenario: Comprobación de tipos
- **WHEN** se ejecuta `npm run check`
- **THEN** el comando termina con código 0 y sin errores reportados

### Requirement: Servidor de desarrollo
El sistema SHALL ofrecer un servidor de desarrollo local con recarga en caliente.

#### Scenario: Arranque en desarrollo
- **WHEN** se ejecuta `npm run dev`
- **THEN** la página de inicio responde con HTTP 200 en el puerto local indicado por la salida del comando

### Requirement: Layout base con metadatos SEO
Toda página SHALL renderizarse dentro de un layout base que emita `lang` en `<html>`, `<title>`, meta description, metadatos Open Graph y viewport, a partir de props de la página.

#### Scenario: Página con metadatos
- **WHEN** una página usa el layout base con título y descripción
- **THEN** el HTML generado contiene `<html lang="...">`, `<title>`, `<meta name="description">`, `og:title`, `og:description` y `<meta name="viewport">`

### Requirement: Accesibilidad estructural del layout
El layout base SHALL incluir un enlace "saltar al contenido", un único `<main>` con id destino y landmarks semánticos.

#### Scenario: Navegación por teclado
- **WHEN** un usuario pulsa Tab por primera vez en cualquier página
- **THEN** el primer elemento enfocado es el enlace "saltar al contenido" y al activarlo el foco pasa al `<main>`

### Requirement: Tokens de diseño centralizados
Colores, tipografías, escala tipográfica, espaciados y radios SHALL definirse como variables CSS en un único punto, y las utilidades de estilo SHALL consumir esas variables, de modo que cambiar el tema de un sitio no requiera editar componentes.

#### Scenario: Cambio de paleta
- **WHEN** se modifica el valor de la variable de color primario en el fichero de tokens
- **THEN** todos los componentes que usan el color primario reflejan el nuevo valor tras el build sin otros cambios

### Requirement: Estructura de carpetas del sistema
El repo SHALL contener las carpetas `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/` y `scripts/`, cada una con un README breve que explique su propósito.

#### Scenario: Estructura presente
- **WHEN** se lista el repo tras aplicar el change
- **THEN** existen todas las carpetas indicadas y cada una tiene su README

### Requirement: Islas interactivas sin JavaScript por defecto
Las páginas SHALL ser HTML estático por defecto; los componentes React SHALL hidratarse solo cuando declaren una directiva de cliente explícita.

#### Scenario: Página sin islas
- **WHEN** se construye una página que no usa componentes con directiva de cliente
- **THEN** el HTML resultante no carga el runtime de React
