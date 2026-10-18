import creditsData from './credits.json';
import hero from '../assets/images/hero.jpg';
import photoBlossom from '../assets/images/azahar.jpg';
import waiting from '../assets/images/waiting.jpg';
import general from '../assets/images/general.jpg';
import higiene from '../assets/images/higiene.jpg';
import aligners from '../assets/images/aligners.jpg';
import photoBridge from '../assets/images/implantes.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  /** CSS object-position for the crop. */
  position: string;
  /** Optional CSS zoom (crop by scaling inside the frame), e.g. 1.4. */
  zoom?: number;
  /** transform-origin for the zoom. */
  origin?: string;
}

/** Inline style for a photo: object-position plus an optional zoom crop. */
export const photoStyle = (p: Photo): string =>
  `object-position: ${p.position};` +
  (p.zoom
    ? ` transform: scale(${p.zoom}); transform-origin: ${p.origin ?? '50% 50%'};`
    : '');

/** Widths generated for the hero photo; also used by the preload link. */
export const heroWidths = [480, 720, 960, 1200];

// Every photo is representative stock, never the clinic's own. Each source file
// is used at most twice on the page and never twice in one section.
export const images = {
  hero: {
    src: hero,
    alt: 'Una maceta con una planta pequeña sobre el alféizar de una ventana grande, con luz natural.',
    position: '50% 62%',
  },
  general: {
    src: general,
    alt: 'Instrumento dental de acero inoxidable sobre una superficie gris clara.',
    position: '0% 50%',
    zoom: 2.4,
    origin: '0% 50%',
  },
  hygiene: {
    src: higiene,
    alt: 'Tres cepillos de dientes de distintos colores sobre una tela blanca.',
    position: '50% 50%',
    zoom: 1.4,
    origin: '85% 25%',
  },
  aligners: {
    src: aligners,
    alt: 'Dos alineadores dentales transparentes sobre una superficie clara.',
    position: '80% 50%',
    zoom: 1.5,
    origin: '85% 45%',
  },
  implants: {
    src: photoBridge,
    alt: 'Maqueta de una dentadura con dos implantes y piezas blancas sobre fondo azul.',
    position: '50% 60%',
  },
  stepTalk: {
    src: waiting,
    alt: 'Sala de espera con cuatro sillas junto a una pared azul clara y un cuadro de un puente sobre un estanque.',
    position: '50% 60%',
  },
  stepLook: {
    src: general,
    alt: 'Instrumento dental de acero inoxidable, de los que se usan para revisar la boca.',
    position: '0% 50%',
    zoom: 2.4,
    origin: '0% 50%',
  },
  stepExplain: {
    src: photoBridge,
    alt: 'Maqueta de dentadura que sirve para explicar cómo es un tratamiento.',
    position: '50% 60%',
  },
  stepDecide: {
    src: photoBlossom,
    alt: 'Flor de azahar blanca con sus estambres, entre hojas verdes.',
    position: '50% 45%',
  },
  clinicWaiting: {
    src: waiting,
    alt: 'Sala de espera con sillas tapizadas y un cuadro en la pared. Foto de archivo.',
    position: '50% 70%',
  },
  clinicPlants: {
    src: hero,
    alt: 'Planta en una maceta de mimbre junto a una ventana. Foto de archivo.',
    position: '50% 70%',
    zoom: 1.2,
    origin: '50% 70%',
  },
  clinicValencia: {
    src: photoBlossom,
    alt: 'Detalle de una flor de azahar, la flor del naranjo, típica de Valencia.',
    position: '40% 50%',
  },
} satisfies Record<string, Photo>;

/** Photos under CC BY / CC BY-SA shown in the footer. Generated from assets.json by `node scripts/credits.mjs --site clinica-dental`. */
export const credits: { author: string; license: string; url: string }[] =
  creditsData;
