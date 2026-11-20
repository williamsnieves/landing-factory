// Progressive enhancement of <VideoLoop />. An Astro-processed module script (bundled, hashed by the CSP), loaded
// only on pages with the component. Without it the poster shows and nothing plays.
//
// Rules: nothing plays under `prefers-reduced-motion: reduce`; a clip plays while at least a quarter of it is in view
// and the tab is visible; it pauses otherwise; the pause button sets a per-clip choice the observers respect.

const PLAY_RATIO = 0.25;

interface Clip {
  figure: HTMLElement;
  video: HTMLVideoElement;
  button: HTMLButtonElement | null;
  inView: boolean;
  userPaused: boolean;
}

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const clips: Clip[] = [];
let observer: IntersectionObserver | null = null;

function setButton(clip: Clip): void {
  const { button } = clip;
  if (!button) return;
  const paused = clip.userPaused;
  button.setAttribute(
    'aria-label',
    (paused ? button.dataset.labelPlay : button.dataset.labelPause) ?? '',
  );
  button.setAttribute('aria-pressed', String(paused));
  button
    .querySelector('[data-video-icon-pause]')
    ?.classList.toggle('hidden', paused);
  button
    .querySelector('[data-video-icon-play]')
    ?.classList.toggle('hidden', !paused);
}

function sync(clip: Clip): void {
  const want =
    !reduceQuery.matches && clip.inView && !clip.userPaused && !document.hidden;
  if (want && clip.video.paused) {
    clip.video.muted = true;
    clip.video.play().catch(() => {
      // Autoplay refused (data saver, low power): the poster stays, the button still works.
    });
  } else if (!want && !clip.video.paused) clip.video.pause();
}

function observe(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const clip = clips.find((c) => c.figure === entry.target);
    if (!clip) continue;
    // A clip taller than the screen can never be a quarter in view: half a viewport of it counts as well.
    clip.inView =
      entry.isIntersecting &&
      (entry.intersectionRatio >= PLAY_RATIO ||
        entry.intersectionRect.height >= window.innerHeight / 2);
    sync(clip);
  }
}

function start(): void {
  if (reduceQuery.matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(observe, {
    threshold: [0, 0.1, PLAY_RATIO, 0.5, 1],
  });
  for (const clip of clips) observer.observe(clip.figure);
}

function stop(): void {
  observer?.disconnect();
  observer = null;
}

for (const figure of document.querySelectorAll<HTMLElement>('[data-video]')) {
  const video = figure.querySelector<HTMLVideoElement>('video');
  if (!video) continue;
  const clip: Clip = {
    figure,
    video,
    button: figure.querySelector<HTMLButtonElement>('[data-video-toggle]'),
    inView: false,
    userPaused: false,
  };
  clips.push(clip);
  video.muted = true;
  video.addEventListener('playing', () => {
    figure.setAttribute('data-video-started', '');
    figure.dataset.videoState = 'playing';
  });
  video.addEventListener('pause', () => {
    figure.dataset.videoState = 'paused';
  });
  if (clip.button && !reduceQuery.matches) {
    clip.button.hidden = false;
    setButton(clip);
    clip.button.addEventListener('click', () => {
      clip.userPaused = !clip.userPaused;
      setButton(clip);
      sync(clip);
    });
  }
}

if (clips.length) {
  start();
  document.addEventListener('visibilitychange', () => {
    for (const clip of clips) sync(clip);
  });
  reduceQuery.addEventListener('change', () => {
    if (reduceQuery.matches) {
      stop();
      for (const clip of clips) {
        clip.video.pause();
        if (clip.button) clip.button.hidden = true;
      }
    } else {
      for (const clip of clips) {
        if (clip.button) {
          clip.button.hidden = false;
          setButton(clip);
        }
      }
      start();
    }
  });
  document.addEventListener('astro:before-swap', stop, { once: true });
}
