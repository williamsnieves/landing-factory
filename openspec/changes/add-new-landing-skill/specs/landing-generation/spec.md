# Spec Delta

## Purpose

Genera con una sola orden una landing original y desplegable para un nicho dado, reutilizando patrones abstractos de referencias y cumpliendo los criterios de calidad del sistema sin retoques manuales.

## ADDED Requirements

### Requirement: Orden única de generación
El sistema SHALL ofrecer una orden que, dados un slug, un nicho y opcionalmente fichas de `patterns/`, cree el proyecto del sitio y ejecute de principio a fin brief, síntesis, design system, construcción y QA sin intervención cuando se pide modo automático.

#### Scenario: Ejecución automática
- **WHEN** se ejecuta la orden con slug, nicho y modo automático
- **THEN** al terminar existe el proyecto del sitio con su propuesta, su design system, la landing construida y el informe de QA

### Requirement: Propuesta revisable antes de construir
Antes de construir, el sistema SHALL producir una propuesta con mapa de páginas, secciones y su objetivo, plan de motion y fichas usadas; en modo interactivo MUST detenerse hasta que el usuario la apruebe o la modifique.

#### Scenario: Modo interactivo
- **WHEN** la orden se ejecuta sin modo automático
- **THEN** se guarda la propuesta y la ejecución se detiene esperando aprobación antes de generar código

### Requirement: Design system por nicho
Cada sitio SHALL tener un `design-system/<slug>/MASTER.md` con patrón, estilo, paleta, tipografías y anti-patrones del nicho, y los tokens del sitio SHALL derivarse de él.

#### Scenario: Tokens derivados
- **WHEN** se genera el sitio
- **THEN** los valores de color y tipografía de los tokens del sitio coinciden con los definidos en su `MASTER.md`

### Requirement: Contenido original y con licencia
Todo el copy del sitio MUST ser original, y toda imagen o componente externo MUST tener licencia que permita su uso y MUST figurar en el `CREDITS.md` del sitio con fuente, autor y licencia.

#### Scenario: Imagen sin crédito
- **WHEN** el sitio contiene una imagen externa que no figura en `CREDITS.md`
- **THEN** la verificación final de la generación falla indicando la imagen

#### Scenario: Copy de una referencia
- **WHEN** una frase del sitio coincide literalmente con texto de una web de referencia usada
- **THEN** la generación no se da por terminada hasta reescribirla

### Requirement: Bucle de QA hasta aprobar
Tras construir, el sistema SHALL ejecutar la QA, corregir los fallos reportados y repetir hasta aprobar o hasta un máximo configurable de intentos; si se agotan, MUST terminar con estado fallido y un resumen de lo pendiente.

#### Scenario: Corrección automática
- **WHEN** la primera QA falla por desborde a 375 px
- **THEN** el sistema corrige el desborde y vuelve a ejecutar la QA

#### Scenario: Intentos agotados
- **WHEN** la QA sigue fallando tras el número máximo de intentos
- **THEN** la orden termina con código distinto de 0 y el registro de la ejecución lista los fallos restantes

### Requirement: Registro de la ejecución
Cada generación SHALL dejar un registro con entradas usadas, decisiones de diseño, intentos de QA con su resultado y duración total.

#### Scenario: Revisión posterior
- **WHEN** se abre el registro de una generación terminada
- **THEN** se ven las fichas usadas, el número de intentos de QA y el resultado final

### Requirement: Diversidad entre nichos
Sitios generados para nichos distintos SHALL ser visualmente diferentes: distinta paleta, tipografía y estructura de hero.

#### Scenario: Tres nichos
- **WHEN** se generan sitios para tres nichos distintos
- **THEN** ningún par de sitios comparte a la vez paleta, familia tipográfica principal y tipo de hero
