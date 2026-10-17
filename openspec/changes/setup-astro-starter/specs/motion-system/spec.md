# Spec Delta

## Purpose

Proporciona primitivas de animación reutilizables (scroll suave, reveal, pin, parallax) para que las landings tengan motion de calidad sin sacrificar accesibilidad ni rendimiento.

## ADDED Requirements

### Requirement: Scroll suave opcional
El sistema SHALL ofrecer scroll suave activable por página y SHALL sincronizarlo con las animaciones ligadas al scroll.

#### Scenario: Scroll suave activo
- **WHEN** una página activa el scroll suave y el usuario no ha pedido movimiento reducido
- **THEN** el desplazamiento se interpola suavemente y las animaciones ligadas al scroll siguen la posición interpolada

### Requirement: Primitivas de animación declarativas
El sistema SHALL ofrecer primitivas `reveal`, `pin` y `parallax` aplicables a cualquier sección mediante atributos o un componente envoltorio, sin escribir código de animación en la sección.

#### Scenario: Reveal al entrar en viewport
- **WHEN** un elemento marcado con reveal entra en el viewport
- **THEN** pasa de su estado inicial (desplazado y transparente) a su estado final visible

#### Scenario: Sección fijada
- **WHEN** una sección marcada con pin alcanza la parte superior del viewport
- **THEN** permanece fijada durante la distancia de scroll configurada y después continúa el flujo normal

### Requirement: Respeto a prefers-reduced-motion
Cuando el usuario prefiera movimiento reducido, el sistema MUST desactivar scroll suave, pin y parallax y MUST mostrar los elementos con reveal directamente en su estado final.

#### Scenario: Usuario con movimiento reducido
- **WHEN** el navegador reporta `prefers-reduced-motion: reduce`
- **THEN** no se inicializa el scroll suave
- **AND** todos los elementos con reveal son visibles sin animación
- **AND** ninguna sección queda fijada

### Requirement: Contenido visible sin JavaScript
El contenido animado MUST ser visible y legible si el JavaScript no se ejecuta.

#### Scenario: JavaScript deshabilitado
- **WHEN** la página se carga con JavaScript deshabilitado
- **THEN** todos los elementos marcados con reveal son visibles

### Requirement: Limpieza de animaciones
Las animaciones SHALL liberarse al abandonar la página o al desmontar la isla que las creó, sin dejar listeners activos.

#### Scenario: Navegación entre páginas
- **WHEN** se navega a otra página con transiciones de vista habilitadas
- **THEN** las instancias de animación de la página anterior se destruyen
