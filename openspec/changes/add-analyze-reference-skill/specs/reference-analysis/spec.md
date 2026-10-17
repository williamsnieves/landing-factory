# Spec Delta

## Purpose

Convierte webs de referencia en fichas abstractas de patrones de diseño y motion, reutilizables para crear landings originales, sin almacenar ni reproducir contenido protegido del sitio analizado.

## ADDED Requirements

### Requirement: Análisis de una URL a ficha abstracta
Dada una URL pública y una nota opcional de qué interesa de ella, el sistema SHALL generar una ficha en `patterns/<slug>.md` con: mapa y orden de secciones, tipo de hero, retícula y espaciados, escala tipográfica, paleta en términos genéricos, densidad, inventario de animaciones con la técnica de cada una y librerías detectadas.

#### Scenario: Análisis correcto
- **WHEN** se ejecuta el análisis sobre una URL accesible sin reserva de minería
- **THEN** se crea `patterns/<slug>.md` con todas las secciones de la plantilla rellenas
- **AND** la ficha registra URL, fecha de análisis y el foco indicado

### Requirement: Respeto a reservas del titular
Antes de analizar, el sistema MUST comprobar `robots.txt` y señales de reserva de minería de texto y datos del sitio, y MUST abortar sin generar ficha si el acceso del agente está prohibido o existe reserva expresa.

#### Scenario: Sitio con reserva
- **WHEN** el `robots.txt` del sitio prohíbe el acceso a la ruta o declara reserva de minería
- **THEN** el análisis se detiene, no se guarda ninguna ficha y se informa del motivo

### Requirement: Sin contenido del sitio en el repo
La ficha y cualquier fichero versionado MUST NOT contener imágenes, vídeos, modelos 3D, logos, ilustraciones, textos del sitio (más allá de su título y URL) ni fragmentos de su código fuente.

#### Scenario: Validación de la ficha
- **WHEN** se valida una ficha que incluye una URL de imagen del sitio, un bloque de código copiado o frases de su copy
- **THEN** la validación falla indicando la línea infractora

#### Scenario: Material temporal
- **WHEN** el análisis termina, con éxito o con error
- **THEN** las capturas y volcados temporales se han eliminado y ninguno queda en el área versionada del repo

### Requirement: Paleta y tipografía genéricas
La ficha SHALL describir colores y tipos en términos genéricos (por ejemplo "fondo casi negro, acento cálido saturado", "grotesca de gran tamaño + serif para cuerpo") y MUST NOT incluir nombres de fuentes de marca propias del sitio ni valores hex exactos de su identidad.

#### Scenario: Paleta en la ficha
- **WHEN** se revisa la sección de paleta de una ficha generada
- **THEN** contiene descripciones de rol y tono, no códigos de color

### Requirement: Detección de técnicas de motion
Para cada animación relevante observada, la ficha SHALL indicar disparador (carga, scroll, hover), tipo (reveal, pin, parallax, scrub, transición de página, shader/3D) y la librería o técnica probable con su nivel de confianza.

#### Scenario: Sección fijada con scroll
- **WHEN** el sitio fija una sección mientras se anima su contenido con el scroll
- **THEN** la ficha recoge una entrada con disparador scroll, tipo pin+scrub y la librería detectada

### Requirement: Formato de ficha validable
Toda ficha SHALL seguir una plantilla con frontmatter (url, slug, fecha, foco, librerías) y secciones fijas, y el repo SHALL ofrecer un validador que compruebe estructura y reglas de contenido.

#### Scenario: Ficha incompleta
- **WHEN** se valida una ficha a la que le falta la sección de motion
- **THEN** el validador falla indicando la sección ausente

### Requirement: URL inaccesible
Si la URL no responde, requiere autenticación o bloquea el navegador automatizado, el sistema SHALL abortar sin ficha y explicar el motivo.

#### Scenario: Página con login
- **WHEN** la URL redirige a un formulario de login
- **THEN** no se genera ficha y se informa de que la página no es pública
