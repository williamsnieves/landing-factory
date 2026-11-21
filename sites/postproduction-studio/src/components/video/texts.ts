// Texts of <VideoLoop /> in English and Spanish (docs/video.md): the label of the pause and play button.
// Labels live here, never in the brief. Any other locale shows English.

export type VideoLanguage = 'en' | 'es';

export interface VideoTexts {
  /** Accessible name of the button while the clip plays. */
  pause: string;
  /** Accessible name of the button while the clip is paused. */
  play: string;
}

const EN: VideoTexts = { pause: 'Pause video', play: 'Play video' };
const ES: VideoTexts = {
  pause: 'Pausar el vídeo',
  play: 'Reproducir el vídeo',
};

const TEXTS: Record<VideoLanguage, VideoTexts> = { en: EN, es: ES };

export const videoTexts = (locale?: string): VideoTexts =>
  TEXTS[(locale ?? 'en').split('-')[0] as VideoLanguage] ?? EN;
