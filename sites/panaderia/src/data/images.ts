import slices from '../assets/images/slices.jpg';
import starter from '../assets/images/starter.jpg';
import dough from '../assets/images/dough.jpg';
import oven from '../assets/images/oven.jpg';
import visit from '../assets/images/visit.jpg';
import archHands from '../assets/images/arch-hands.jpg';
import archDanish from '../assets/images/arch-danish.jpg';
import archLoaf from '../assets/images/arch-loaf.jpg';
import hogaza from '../assets/images/hogaza.jpg';
import rustico from '../assets/images/rustico.jpg';
import croissant from '../assets/images/croissant.jpg';
import danesa from '../assets/images/danesa.jpg';
import glutenFree1 from '../assets/images/tarta-santiago.jpg';
import glutenFree2 from '../assets/images/bizcocho-naranja.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  /** CSS object-position for the crop. */
  position: string;
}

export const images = {
  hero: {
    src: slices,
    alt: 'Primer plano de rebanadas de pan de masa madre, con la corteza dorada y la miga abierta.',
    position: '50% 80%',
  },
  starter: {
    src: starter,
    alt: 'Frasco de cristal con masa madre activa, llena de burbujas.',
    position: '50% 40%',
  },
  dough: {
    src: dough,
    alt: 'Manos estirando una masa sobre una mesa enharinada, con más piezas de masa reposando.',
    position: '40% 40%',
  },
  crumb: {
    src: slices,
    alt: 'Rebanadas de pan de masa madre con la miga abierta y alveolada.',
    position: '50% 70%',
  },
  oven: {
    src: oven,
    alt: 'Una panadera introduce masa con una pala en un horno de barro encendido.',
    position: '62% 50%',
  },
  archA: {
    src: archHands,
    alt: 'Manos enharinadas trabajando la masa.',
    position: '50% 50%',
  },
  archB: {
    src: archDanish,
    alt: 'Bollos de hojaldre con arándanos.',
    position: '50% 50%',
  },
  archC: {
    src: archLoaf,
    alt: 'Hogaza oscura en una cesta de mimbre.',
    position: '50% 50%',
  },
  visit: {
    src: visit,
    alt: 'Escaparate de una panadería con hogazas y panes variados sobre un estante de madera.',
    position: '50% 55%',
  },
} satisfies Record<string, Photo>;

export interface Product {
  name: string;
  price: string;
  glutenFree?: boolean;
  photo: Photo;
}

export const products: Product[] = [
  {
    name: 'Hogaza de masa madre',
    price: '6,50 €',
    photo: {
      src: hogaza,
      alt: 'Pan de masa madre cortado en rebanadas, de miga abierta.',
      position: '50% 50%',
    },
  },
  {
    name: 'Pan rústico de cesta',
    price: '5,80 €',
    photo: {
      src: rustico,
      alt: 'Hogaza rústica de corteza oscura en una cesta de mimbre.',
      position: '50% 50%',
    },
  },
  {
    name: 'Croissant de mantequilla',
    price: '2,20 €',
    photo: {
      src: croissant,
      alt: 'Croissant dorado y brillante.',
      position: '50% 50%',
    },
  },
  {
    name: 'Danesa de frutos rojos',
    price: '3,40 €',
    photo: {
      src: danesa,
      alt: 'Bollo de hojaldre relleno de crema y frutos rojos.',
      position: '50% 50%',
    },
  },
  {
    name: 'Tarta de Santiago',
    price: '4,20 €',
    glutenFree: true,
    photo: {
      src: glutenFree1,
      alt: 'Detalle de la cruz de Santiago dibujada con azúcar glas sobre una tarta de almendra.',
      position: '50% 50%',
    },
  },
  {
    name: 'Bizcocho de almendra y naranja',
    price: '3,60 €',
    glutenFree: true,
    photo: {
      src: glutenFree2,
      alt: 'Bizcocho de almendra y naranja con láminas de almendra y ralladura sobre una tabla de madera.',
      position: '50% 50%',
    },
  },
];

/** Photos under CC BY (credit required). CC0 photos are listed in CREDITS.md only. */
export const credits: { author: string; license: string; url: string }[] = [
  {
    author: 'Angel Ganev',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Slices_of_sourdough_bread.jpg',
  },
  {
    author: 'Janus Sandsgaard',
    license: 'CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Sourdough.jpg',
  },
  {
    author: 'Chris Rycroft',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Pastries_on_display.jpg',
  },
  {
    author: 'Murdockcrc',
    license: 'CC BY 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Swiss_Bread_LCD.jpg',
  },
  {
    author: 'inra.dist',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Boulangerie(fabric.baguette_bio)_Cl_J_Weber01.jpg',
  },
  {
    author: 'Souleymane DIARRA',
    license: 'CC BY 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Boulangerie_traditionnelle.jpg',
  },
  {
    author: 'Shixart1985',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Baker_woman%27s_hands_kneading_bread_dough.jpg',
  },
  {
    author: 'Keith Williamson',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Detalle_de_la_cruz_de_una_Tarta_de_Santiago.jpg',
  },
  {
    author: 'Ella Olsson',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Orange_almond_cake_(48839116778).jpg',
  },
];
