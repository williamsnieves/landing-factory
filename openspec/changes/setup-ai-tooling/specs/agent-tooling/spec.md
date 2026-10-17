# Spec Delta

## Purpose

Garantiza que cualquier sesión de Claude Code sobre el repo dispone de las mismas herramientas (MCP y skills de diseño), con versiones fijadas, roles claros y sin telemetría no deseada.

## ADDED Requirements

### Requirement: Servidores MCP versionados
El repo SHALL declarar en un fichero de configuración versionado un servidor MCP de documentación de Astro y un servidor MCP de navegador, disponibles al abrir el proyecto en Claude Code.

#### Scenario: Sesión nueva
- **WHEN** se abre el repo en Claude Code y se aprueban los servidores del proyecto
- **THEN** están disponibles las herramientas de búsqueda en la documentación de Astro y de control de navegador

### Requirement: Skills de diseño instaladas en el proyecto
Las skills ui-ux-pro-max, taste-skill e impeccable SHALL estar disponibles a nivel de proyecto, y su origen y versión o commit SHALL quedar registrados en un manifiesto versionado.

#### Scenario: Consulta de versiones
- **WHEN** se lee el manifiesto de herramientas
- **THEN** cada skill aparece con su repositorio de origen, versión o commit, licencia y fecha de instalación

### Requirement: Setup reproducible e idempotente
El repo SHALL incluir un comando de setup que instale o verifique todas las herramientas del agente, y ejecutarlo dos veces seguidas MUST dejar el mismo resultado sin errores.

#### Scenario: Doble ejecución
- **WHEN** se ejecuta el setup dos veces en el mismo checkout
- **THEN** ambas ejecuciones terminan con código 0 y la segunda no modifica ficheros versionados

#### Scenario: Herramienta ausente
- **WHEN** falta una skill o un binario requerido y no hay red para instalarlo
- **THEN** el setup termina con código distinto de 0 indicando qué herramienta falta

### Requirement: Telemetría de terceros desactivada
El setup MUST desactivar la telemetría anónima de impeccable y la de OpenSpec para este proyecto.

#### Scenario: Tras el setup
- **WHEN** el setup termina correctamente
- **THEN** la telemetría de impeccable consta como desactivada y la variable de opt-out de OpenSpec está configurada para el proyecto

### Requirement: Roles exclusivos por skill
Las reglas del proyecto SHALL asignar a cada skill de diseño un único rol: tokens de diseño (ui-ux-pro-max), dirección de arte e imágenes (taste-skill), crítica y pulido (impeccable).

#### Scenario: Agente elige herramienta
- **WHEN** un agente necesita definir la paleta y tipografías de un nicho
- **THEN** las reglas le indican usar ui-ux-pro-max y no las otras dos skills para esa tarea
