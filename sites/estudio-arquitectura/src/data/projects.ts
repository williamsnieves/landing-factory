import type { ImageMetadata } from 'astro';
import type { PlanVariant } from './plans';
import photoSalon from '../assets/images/vivienda-salon.jpg';
import photoMezzanine from '../assets/images/cocina-escalera.jpg';
import photoStair from '../assets/images/escalera.jpg';
import photoKitchen from '../assets/images/cocina.jpg';
import photoOffice from '../assets/images/oficina-reforma.jpg';

export interface Project {
  n: number;
  id: string;
  name: string;
  kind: string;
  /** Sample surface, shown as text. */
  area: string;
  year: string;
  description: string;
  photo: ImageMetadata;
  alt: string;
  position: string;
  plan: PlanVariant;
}

/** Sample projects: names, surfaces and years are invented. */
export const projects: Project[] = [
  {
    n: 1,
    id: 'proyecto-1',
    name: 'Vivienda en planta alta',
    kind: 'Rehabilitación integral',
    area: '72 m²',
    year: '2023',
    description:
      'Un piso de los años cincuenta redistribuido: la cocina se abre al salón, aparece un baño nuevo y la luz de fachada llega hasta el fondo.',
    photo: photoSalon,
    alt: 'Salón con la cocina abierta a la izquierda y una gran puerta corredera de vidrio hacia la terraza.',
    position: '50% 60%',
    plan: 'vivienda',
  },
  {
    n: 2,
    id: 'proyecto-2',
    name: 'Piso con altillo',
    kind: 'Reforma de vivienda',
    area: '56 m²',
    year: '2022',
    description:
      'Techos altos en un piso pequeño. Un altillo con escalera metálica gana un dormitorio sin cerrar el estar.',
    photo: photoMezzanine,
    alt: 'Estar y comedor de una vivienda con mesa de madera, armarios de colores y una escalera metálica que sube a un altillo.',
    position: '60% 50%',
    plan: 'altillo',
  },
  {
    n: 3,
    id: 'proyecto-3',
    name: 'Escalera y portal',
    kind: 'Elementos comunes',
    area: '28 m² por planta',
    year: '2024',
    description:
      'Se repara la escalera original, se renueva la iluminación y se añade un ascensor en el hueco, sin tocar las viviendas.',
    photo: photoStair,
    alt: 'Hueco de una escalera visto desde abajo: barandillas blancas y curvas que se alejan en perspectiva junto a una lámpara redonda.',
    position: '30% 50%',
    plan: 'escalera',
  },
  {
    n: 4,
    id: 'proyecto-4',
    name: 'Cocina y carpintería',
    kind: 'Reforma parcial',
    area: '10 m²',
    year: '2023',
    description:
      'Una cocina estrecha con encimera de madera maciza, un frente de lamas y estantes: la carpintería se dibuja a medida.',
    photo: photoKitchen,
    alt: 'Cocina pequeña con encimera de madera maciza, estantes con escuadras negras y un panel de lamas verticales junto a una ventana.',
    position: '50% 50%',
    plan: 'cocina',
  },
  {
    n: 5,
    id: 'proyecto-5',
    name: 'Oficina para un equipo de ocho',
    kind: 'Espacio de trabajo',
    area: '128 m²',
    year: '2024',
    description:
      'Una planta diáfana con luz de fachada, una sala de reuniones acristalada y las instalaciones a la vista, bien ordenadas.',
    photo: photoOffice,
    alt: 'Sala de trabajo diáfana con mesas compartidas, conductos de ventilación vistos en el techo y una cristalera hacia una terraza.',
    position: '50% 50%',
    plan: 'oficina',
  },
];
