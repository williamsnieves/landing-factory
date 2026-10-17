# Spec Delta

## Purpose

Mide de forma automática y reproducible si una landing cumple los criterios de aceptación del MVP y devuelve un veredicto y un informe que un agente puede usar para corregir y reintentar.

## ADDED Requirements

### Requirement: Comando único de QA
El sistema SHALL ofrecer un comando de QA que construya el sitio, lo sirva localmente, ejecute todas las comprobaciones sobre cada página generada y termine con código 0 solo si todas pasan los umbrales.

#### Scenario: Landing que cumple
- **WHEN** se ejecuta la QA sobre un sitio que cumple todos los umbrales
- **THEN** el comando termina con código 0 y el informe marca el veredicto como aprobado

#### Scenario: Landing que incumple
- **WHEN** alguna comprobación no alcanza su umbral
- **THEN** el comando termina con código distinto de 0 y el informe lista cada fallo con página, viewport y métrica

### Requirement: Capturas en tres anchos
La QA SHALL generar una captura de página completa de cada página a 375, 768 y 1440 px de ancho.

#### Scenario: Capturas generadas
- **WHEN** termina la QA de un sitio con una página
- **THEN** existen tres capturas de esa página, una por ancho, en la carpeta del informe

### Requirement: Detección de desbordes
La QA MUST fallar si en cualquiera de los tres anchos el documento tiene scroll horizontal o algún elemento de texto visible queda cortado por su contenedor.

#### Scenario: Elemento más ancho que el viewport
- **WHEN** a 375 px un elemento sobresale del ancho del viewport
- **THEN** la QA falla e identifica el selector del elemento y el ancho

### Requirement: Umbrales de Lighthouse
La QA MUST fallar si la puntuación de rendimiento, accesibilidad o SEO de Lighthouse de cualquier página es inferior al umbral configurado, que por defecto es 90.

#### Scenario: Rendimiento bajo
- **WHEN** una página obtiene 85 en rendimiento con umbral 90
- **THEN** la QA falla y el informe incluye la puntuación y las auditorías con mayor impacto

### Requirement: Verificación de movimiento reducido
La QA MUST cargar cada página con `prefers-reduced-motion: reduce` y fallar si queda contenido marcado como animable invisible o si persiste scroll suave o fijado de secciones.

#### Scenario: Reveal que no aparece
- **WHEN** con movimiento reducido un elemento animable permanece con opacidad 0 tras la carga
- **THEN** la QA falla indicando el elemento

### Requirement: Detección de diseño genérico
La QA MUST ejecutar el detector determinista de impeccable sobre el código de la landing y fallar si reporta hallazgos de severidad principal.

#### Scenario: Hallazgo principal
- **WHEN** el detector reporta un hallazgo de severidad principal
- **THEN** la QA falla y el informe incluye la regla, el fichero y la línea

### Requirement: Informe legible por máquina y por personas
Cada ejecución SHALL producir un informe JSON con veredicto, métricas por página y viewport y lista de fallos, y un resumen Markdown equivalente, en una carpeta propia por ejecución.

#### Scenario: Agente lee el informe
- **WHEN** un agente lee el JSON de una QA fallida
- **THEN** puede obtener para cada fallo el tipo de comprobación, la página, el viewport, el valor medido y el umbral

### Requirement: Umbrales configurables
Los umbrales SHALL leerse de un fichero de configuración del sitio y, si no existe, SHALL aplicarse los valores por defecto de la roadmap.

#### Scenario: Sin configuración
- **WHEN** se ejecuta la QA sin fichero de configuración
- **THEN** se aplican Lighthouse ≥ 90 en rendimiento, accesibilidad y SEO, anchos 375/768/1440 y ningún hallazgo principal de impeccable

### Requirement: QA en pull requests
Cada pull request SHALL ejecutar la QA en CI y adjuntar el informe y las capturas como artefacto descargable.

#### Scenario: PR abierto
- **WHEN** se abre o actualiza un pull request
- **THEN** se ejecuta la QA y el resultado aparece como check del PR con el informe adjunto
