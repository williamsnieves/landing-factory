// Progressive enhancement of <LocationMap interactive />. An Astro-processed module script (bundled, hashed by the
// CSP), loaded only on pages with the component. Without it the button is a plain link to the OpenStreetMap site.
// Nothing is requested from OpenStreetMap before the visitor clicks: the embed URL waits in `data-consent-src`.

const MIN_HEIGHT = 320;

function load(trigger: HTMLElement): void {
  const src = trigger.dataset.consentSrc ?? '';
  // The component wrote this URL into the page (https only). No host name is spelled out here: the landing report
  // reads a known host in an inline script as a load without consent.
  if (!src.startsWith('https://')) return;
  const figure = trigger.closest<HTMLElement>('[data-location-map]');
  const frame = figure?.querySelector<HTMLElement>('[data-map-frame]');
  if (!figure || !frame) return;
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = trigger.dataset.embedTitle ?? 'Map';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer';
  iframe.className = 'block w-full border-0';
  iframe.style.height = `${Math.max(frame.offsetHeight, MIN_HEIGHT)}px`;
  frame.replaceChildren(iframe);
  figure.querySelector<HTMLElement>('[data-map-consent]')?.remove();
  iframe.focus();
}

for (const trigger of document.querySelectorAll<HTMLElement>(
  '[data-map-load]',
)) {
  trigger.setAttribute('role', 'button');
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    load(trigger);
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      load(trigger);
    }
  });
}
