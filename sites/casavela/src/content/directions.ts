// The visual directions listed on the noindex index page (a directions run; see sites/casavela/DIRECTIONS.md).
// Each idea is the one-line summary the customer reads before opening the direction.

export interface DirectionLink {
  id: 'a' | 'b' | 'c';
  name: string;
  idea: string;
}

export const directions: DirectionLink[] = [
  {
    id: 'a',
    name: 'Dirección A · Claridad',
    idea: 'Claridad de producto: titular a dos tonos, tarjeta de valoración gratuita y una calculadora hipotecaria fija que te acompaña mientras lees, en violeta sobre blanco.',
  },
  {
    id: 'b',
    name: 'Dirección B · Sin letra pequeña',
    idea: 'Rejilla a la vista, etiquetas técnicas y una tabla que dice qué incluye cada servicio, qué cuesta y qué falta por confirmar. Sin adornos y sin letra pequeña.',
  },
  {
    id: 'c',
    name: 'Dirección C · De barrio',
    idea: 'De barrio: cercana y práctica. Una calle de Valencia, qué hacemos, dónde estamos, el horario y cómo hablar con nosotros desde la primera pantalla, con WhatsApp siempre a mano.',
  },
];
