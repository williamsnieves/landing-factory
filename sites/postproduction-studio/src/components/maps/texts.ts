// Texts of <LocationMap /> in English and Spanish (docs/maps.md). Labels live here, never in the brief.
// Any other locale shows English.

export type MapLanguage = 'en' | 'es';

export interface MapTexts {
  /** Alt text of the map image; names the address. */
  alt: (address: string) => string;
  attribution: string;
  directionsHeading: string;
  /** Visible text of the three directions links. */
  google: string;
  apple: string;
  osm: string;
  loadInteractive: string;
  /** Said next to the interactive button: the click is the visitor's choice to connect to OpenStreetMap. */
  loadNote: string;
  embedTitle: (address: string) => string;
}

const EN: MapTexts = {
  alt: (address) => `Map of ${address}`,
  attribution: '© OpenStreetMap contributors',
  directionsHeading: 'Get directions',
  google: 'Google Maps',
  apple: 'Apple Maps',
  osm: 'OpenStreetMap',
  loadInteractive: 'Load the interactive map',
  loadNote:
    'The interactive map loads from openstreetmap.org only after you click.',
  embedTitle: (address) => `Interactive map of ${address}`,
};

const ES: MapTexts = {
  alt: (address) => `Mapa de ${address}`,
  attribution: '© Colaboradores de OpenStreetMap',
  directionsHeading: 'Cómo llegar',
  google: 'Google Maps',
  apple: 'Apple Maps',
  osm: 'OpenStreetMap',
  loadInteractive: 'Cargar el mapa interactivo',
  loadNote:
    'El mapa interactivo se carga desde openstreetmap.org solo después de hacer clic.',
  embedTitle: (address) => `Mapa interactivo de ${address}`,
};

const TEXTS: Record<MapLanguage, MapTexts> = { en: EN, es: ES };

export const mapTexts = (locale?: string): MapTexts =>
  TEXTS[(locale ?? 'en').split('-')[0] as MapLanguage] ?? EN;
