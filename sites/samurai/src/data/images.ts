import yashima from '../assets/images/yashima-screen.jpg';
import domaru from '../assets/images/domaru.jpg';
import rokumai from '../assets/images/rokumai-gusoku.jpg';
import kabuto from '../assets/images/kabuto.jpg';
import menpo from '../assets/images/menpo.jpg';
import tachi from '../assets/images/tachi.jpg';
import katana from '../assets/images/katana.jpg';
import wakizashi from '../assets/images/wakizashi.jpg';
import tsuba from '../assets/images/tsuba.jpg';
import teaBowlImg from '../assets/images/raku-bowl.jpg';
import calligraphy from '../assets/images/calligraphy.jpg';
import yokohama from '../assets/images/samurai-yokohama.jpg';
import actor from '../assets/images/actor-armor.jpg';
import infantry from '../assets/images/infantry-1869.jpg';
import creditsData from './credits.json';

export interface Photo {
  src: ImageMetadata;
  /** Describes what is visible. */
  alt: string;
  /** Caption: only what the museum record says (title, date, medium). */
  caption: string;
  /** CSS object-position for the crop. */
  position: string;
}

/**
 * Every photo is a museum object from The Met Open Access (public domain).
 * Captions repeat only what the museum record states: title, date, medium.
 */
export const photos = {
  yashima: {
    src: yashima,
    alt: 'Biombo de seis paneles con jinetes y barcos en una batalla, sobre un fondo de pan de oro y nubes.',
    caption:
      'Episodio del Heike monogatari (la batalla de Yashima). Biombo de seis paneles, siglo XVII, Escuela Tosa. Una imagen hecha siglos después de los hechos que cuenta.',
    position: '50% 50%',
  },
  domaru: {
    src: domaru,
    alt: 'Coraza de láminas unidas con cordones de colores: rosa, ocre, azul marino y crema.',
    caption:
      'Armadura dō-maru, hacia 1550. Hierro, cuero, laca, seda y cobre dorado.',
    position: '50% 45%',
  },
  rokumai: {
    src: rokumai,
    alt: 'Armadura completa sobre un soporte: yelmo negro con una cimera dorada, máscara roja y coraza de láminas oscuras.',
    caption:
      'Armadura rokumai-dō gusoku con caja, finales del siglo XVII; coraza fechada en 1689. Hierro, cuero, laca, tela, madera y piel de oso.',
    position: '50% 40%',
  },
  kabuto: {
    src: kabuto,
    alt: 'Casco de hierro negro con cubrenuca de láminas, sobre un soporte de madera clara.',
    caption:
      'Casco (kabuto), principios del siglo XVII. Hierro, cuero, tela y laca.',
    position: '50% 42%',
  },
  menpo: {
    src: menpo,
    alt: 'Máscara de hierro oscuro con rasgos de rostro humano, dientes de metal y una gola de láminas con cordones.',
    caption:
      'Máscara facial con gola (sō-menpō), siglos XVII-XVIII. Hierro, cuero y seda.',
    position: '50% 40%',
  },
  tachi: {
    src: tachi,
    alt: 'Fotografía en blanco y negro de una espada curva con su vaina y un cordón enrollado.',
    caption:
      'Hoja y montura de un tachi: hoja del siglo XVI, montura de mediados del siglo XIX.',
    position: '50% 52%',
  },
  katana: {
    src: katana,
    alt: 'Empuñadura esmaltada con flores y un cordón violeta, guardamano dorado y el arranque de la hoja.',
    caption:
      'Hoja y montura de una katana: hoja del siglo XVI, montura de mediados a finales del siglo XIX. Acero, madera, laca, oro y esmalte.',
    position: '50% 45%',
  },
  wakizashi: {
    src: wakizashi,
    alt: 'Hoja de espada corta, curva y pulida, sobre fondo negro; en la espiga se ven cuatro orificios.',
    caption:
      'Hoja de un wakizashi (la foto muestra solo la hoja): hoja del siglo XVI, montura del siglo XIX.',
    position: '50% 50%',
  },
  tsuba: {
    src: tsuba,
    alt: 'Guardamano circular de hierro oscuro con motivos de flores y hojas calados.',
    caption: 'Guardamano (tsuba), finales del siglo XVII. Hierro y cobre.',
    position: '50% 50%',
  },
  raku: {
    src: teaBowlImg,
    alt: 'Cuenco de cerámica negra de forma sencilla, con el borde ondulado.',
    caption:
      'Cuenco de té raku negro, principios del siglo XVII. Cerámica con vidriado raku.',
    position: '50% 50%',
  },
  calligraphy: {
    src: calligraphy,
    alt: 'Rollo colgante con dos grandes caracteres trazados con pincel y tinta negra.',
    caption:
      '«Bluish-Green Fish Scales», Kanō Tan’yū. Rollo colgante, mediados del siglo XVII. Tinta sobre papel.',
    position: '50% 30%',
  },
  yokohama: {
    src: yokohama,
    alt: 'Fotografía antigua de un hombre de pie, con kimono claro, una espada al cinto y un abanico en la mano.',
    caption:
      '«Samurai, Yokohama», Felice Beato, 1864-65. Albúmina de plata. Una pose de estudio.',
    position: '50% 25%',
  },
  actor: {
    src: actor,
    alt: 'Fotografía coloreada a mano de un joven con coraza de láminas amarillas y rojas, con una espada atrás y otra en la mano.',
    caption:
      '«Actor in Samurai Armor», Suzuki Shin’ichi, década de 1870. Albúmina coloreada. Es un actor posando con armadura, no un guerrero en campaña.',
    position: '50% 30%',
  },
  infantry: {
    src: infantry,
    alt: 'Fotografía antigua de una larga fila de hombres con sombreros cónicos, fusiles y tambores, en un camino de tierra.',
    caption: '«Japanese Infantry, Yokohama, Japan», 1869. Albúmina de plata.',
    position: '50% 55%',
  },
} satisfies Record<string, Photo>;

/** Generated from assets.json by `node scripts/credits.mjs --site samurai`. */
export const credits: { author: string; license: string; url: string }[] =
  creditsData;
