# Spec Delta

## Purpose

Fija en el propio repo las reglas que cualquier agente o persona debe seguir al generar landings, para que calidad, accesibilidad y uso ético de referencias no dependan de la memoria de cada sesión.

## ADDED Requirements

### Requirement: Fichero de reglas para agentes
El repo SHALL incluir un `CLAUDE.md` en la raíz que describa stack, comandos, estructura de carpetas y flujo de trabajo con OpenSpec.

#### Scenario: Sesión nueva de agente
- **WHEN** un agente abre el repo por primera vez
- **THEN** encuentra en `CLAUDE.md` los comandos de dev, build, check y QA y la ubicación de cada tipo de pieza

### Requirement: Principio extraer patrones, no clonar
Las reglas MUST prohibir copiar a las landings imágenes, vídeos, modelos 3D, logos, copy, ilustraciones o código literal de webs de referencia, y MUST indicar que de las referencias solo se guardan fichas abstractas en `patterns/`.

#### Scenario: Petición de copiar un asset
- **WHEN** un agente lee las reglas antes de construir una sección inspirada en una referencia
- **THEN** las reglas le indican explícitamente que no puede reutilizar assets ni textos de esa referencia

### Requirement: Presupuestos de calidad explícitos
Las reglas SHALL fijar los umbrales de aceptación del MVP: Lighthouse ≥ 90 en rendimiento, accesibilidad y SEO; sin desbordes en 375, 768 y 1440 px; respeto a `prefers-reduced-motion`.

#### Scenario: Consulta de umbrales
- **WHEN** un agente necesita saber si una landing está lista
- **THEN** encuentra los umbrales numéricos en `CLAUDE.md`

### Requirement: Licencias de recursos externos
Las reglas MUST exigir que toda imagen o componente externo usado tenga licencia compatible y que su atribución quede registrada en el repo del sitio.

#### Scenario: Uso de imagen de banco abierto
- **WHEN** se añade una imagen de una colección abierta a una landing
- **THEN** su fuente, autor y licencia quedan registrados en el fichero de créditos del sitio
