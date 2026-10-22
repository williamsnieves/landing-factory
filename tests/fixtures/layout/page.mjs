// Generates small static pages for the layout-signature tests. Each option changes one visible feature;
// the defaults are the "shared grammar" of the generated landings: 2-column sections, an eyebrow label,
// rounded photos, a pill button, a wordmark footer.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const image = (hue, light) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},40%,${light}%)"/><stop offset="1" stop-color="hsl(${hue},60%,${light - 35}%)"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><circle cx="420" cy="140" r="70" fill="hsl(${hue},50%,${light + 25}%)"/></svg>`,
  )}`;

export function layoutPage({
  radius = 24,
  buttonShape = 'pill', // pill | rect | text
  eyebrow = true,
  footer = 'wordmark', // wordmark | columns | minimal
  cols = 2, // 1 | 2 | 3
  upper = false,
  align = 'left',
  rotate = 0,
  accent = 'hsl(24, 70%, 40%)',
  paper = '#fbf7f0',
  hue = 24,
  mono = false,
} = {}) {
  const font = mono ? 'ui-monospace, monospace' : 'Georgia, serif';
  const button =
    buttonShape === 'text'
      ? 'color:inherit;text-decoration:underline;padding:0;'
      : `background:${accent};color:#fff;padding:14px 28px;border-radius:${buttonShape === 'pill' ? '999px' : '0'};`;
  const img = (n) =>
    `<img alt="" width="600" height="400" src="${image(hue + n * 20, 70)}" />`;
  const text = (n) => `
      <div class="copy">
        ${eyebrow ? `<p class="eyebrow">Section ${n}</p>` : ''}
        <h2>${n === 1 ? 'A page about one thing' : `Heading number ${n}`}</h2>
        <p>Plain words about the thing, a few lines long, so the block has some weight on the page and the density feature has something to count. It says what it is and who it is for.</p>
        <a class="btn" href="#">Book a visit</a>
      </div>`;
  const section = (n) => {
    if (cols === 1) return `${text(n)}${img(n)}`;
    if (cols === 3)
      return [1, 2, 3]
        .map(
          (k) =>
            `<div class="card">${img(n + k)}<h3>Card ${k}</h3><p>Short text for the card number ${k}.</p></div>`,
        )
        .join('');
    return `${text(n)}${img(n)}`;
  };
  const footerHtml = {
    wordmark: '<p class="mark">Maison</p>',
    columns:
      '<div class="cols"><div><h3>Visit</h3><p>Street 1</p></div><div><h3>Links</h3><ul><li>One</li><li>Two</li></ul></div><div><h3>Credits</h3><p>Photos</p></div></div>',
    minimal: '<p>Small print.</p>',
  }[footer];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Layout fixture</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 ${font}; background: ${paper}; color: #1b1b1b; }
  header { display: flex; justify-content: space-between; padding: 20px 64px; }
  header a { color: inherit; margin-left: 20px; }
  section { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 48px; align-items: center; padding: 90px 64px; min-height: 560px; }
  h1, h2 { font-size: 64px; line-height: 1.05; margin: 0 0 16px; text-align: ${align}; ${upper ? 'text-transform: uppercase;' : ''} }
  h2 { font-size: 44px; }
  .eyebrow { font: 12px ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.18em; margin: 0 0 12px; }
  .btn { display: inline-block; text-decoration: none; margin-top: 12px; ${button} }
  img { width: 100%; height: 320px; object-fit: cover; border-radius: ${radius}px; transform: rotate(${rotate}deg); }
  .card img { height: 200px; }
  footer { padding: 48px 64px; background: #222; color: #eee; overflow: hidden; }
  .mark { font-size: 220px; line-height: 1; margin: 0; white-space: nowrap; }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
</style></head>
<body>
<header><a href="#">Maison</a><nav><a href="#s1">One</a><a href="#s2">Two</a></nav></header>
<main>
${[1, 2, 3, 4].map((n) => `<section id="s${n}">${section(n)}</section>`).join('\n')}
</main>
<footer>${footerHtml}</footer>
</body></html>
`;
}

/** Write a page into `<dir>/<name>/index.html` and return that folder. */
export function writeLayoutPage(dir, name, options) {
  const folder = join(dir, name);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'index.html'), layoutPage(options));
  return folder;
}
