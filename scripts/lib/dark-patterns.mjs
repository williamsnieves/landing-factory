// Dark patterns that fail the final check (design: add-neuromarketing-review, Decision 5). They are unethical
// whatever the evidence, so unlike the conversion audit this is a failing rule:
//
//   prechecked-checkbox  an <input type="checkbox" checked> inside a <form>
//   countdown-element    an element marked data-countdown
//   countdown-script     a page script that pairs setInterval with unit labels (days, hours, minutes, seconds)
//   confirmshaming       a link or button that declines with self-blame ("No, I prefer to keep losing money")
//
// Patterns are whole phrases, narrow on purpose: fair cases (an unchecked consent box, a deadline written as a
// date, "No, gracias") must pass. Fix a false positive by narrowing a pattern and adding the fair sentence to
// tests/dark-patterns.test.mjs, never by loosening the check. Spanish and English only.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

import { isExecutableScript } from '../report/html.mjs';
import { foldText } from './copy-claims.mjs';
import { closest, findAll, selectorOf, textOf } from './html-tree.mjs';

/** Optional polite refusal at the start of a decline: "no", "no thanks", "no, gracias", "nope". */
const REFUSAL = String.raw`(?:(?:no|nope|nah)[\s,.!:;-]*(?:thanks|thank\s+you|gracias)?[\s,.!:;-]*)?`;

/** Self-blame phrases, on folded text (lowercase, accents removed). Each is a decline that insults the visitor. */
const SHAME = {
  en: [
    String.raw`i\s+(?:prefer|choose|want)\s+to\s+(?:keep\s+)?(?:losing|wasting|overpaying|paying\s+more|staying\s+(?:broke|poor|unhealthy|average)|being\s+(?:broke|poor|average|unhealthy))`,
    String.raw`i\s+(?:hate|dislike)\s+(?:saving|money|success|growing|being\s+(?:healthy|successful|rich))`,
    String.raw`i(?:'d|\s+would)\s+rather\s+(?:lose|waste|overpay|pay\s+more|stay\s+(?:broke|poor|average)|fail|struggle|be\s+(?:broke|poor|average))`,
    String.raw`i\s+(?:don't|do\s+not)\s+(?:want|need|care)\s+(?:to\s+|about\s+)?(?:save|saving|grow|growing|succeed|succeeding|improve|improving|be\s+(?:rich|healthy|successful|smart))`,
    String.raw`i\s+(?:like|love|enjoy)\s+(?:losing|wasting|overpaying|paying\s+more|being\s+(?:broke|poor|average))`,
    String.raw`i(?:'m|\s+am)\s+(?:fine|happy|ok|okay)\s+(?:with\s+)?(?:losing|overpaying|paying\s+more|being\s+(?:broke|poor|average))`,
    String.raw`keep\s+me\s+(?:poor|broke|unhealthy|in\s+the\s+dark|average)`,
    String.raw`i(?:'m|\s+am)\s+(?:not\s+interested\s+in\s+(?:saving|growing|success))`,
  ],
  es: [
    String.raw`prefiero\s+(?:seguir\s+)?(?:perdiendo|malgastando|gastando\s+de\s+mas|pagando\s+(?:de\s+)?mas|perder|fracasar|pagar\s+(?:de\s+)?mas)`,
    String.raw`(?:odio|detesto)\s+(?:ahorrar|el\s+dinero|crecer|el\s+exito|estar\s+sano)`,
    String.raw`prefiero\s+quedarme\s+(?:sin|en\s+la\s+ruina|pobre|igual\s+de\s+mal)`,
    String.raw`(?:quiero|prefiero)\s+seguir\s+(?:perdiendo|pagando\s+de\s+mas|pobre|en\s+la\s+ruina)`,
    String.raw`no\s+(?:quiero|me\s+importa|me\s+interesa)\s+(?:ahorrar|crecer|mejorar|tener\s+exito|ser\s+rico|ser\s+rica|vender\s+mas|ganar\s+dinero|cuidar\s+mi\s+(?:salud|negocio))`,
    String.raw`me\s+gusta\s+(?:perder|malgastar|pagar\s+(?:de\s+)?mas|ser\s+pobre|estar\s+en\s+la\s+ruina)`,
    String.raw`soy\s+(?:un|una)\s+(?:tonto|tonta|vago|vaga|perdedor|perdedora|fracasado|fracasada)`,
    String.raw`estoy\s+(?:bien|contento|contenta)\s+(?:perdiendo|pagando\s+(?:de\s+)?mas|siendo\s+pobre)`,
    String.raw`dejame\s+(?:pobre|en\s+la\s+ruina|sin\s+ahorros)`,
  ],
};

const SHAME_PATTERNS = Object.entries(SHAME).flatMap(([lang, list]) =>
  list.map((source) => ({
    lang,
    regex: new RegExp(`^${REFUSAL}(?:${source})`, 'u'),
  })),
);

/** The labels of a countdown: at least two distinct time units, quoted, in English or Spanish. */
const UNIT_GROUPS = [
  /^(?:days?|dias?)$/,
  /^(?:hours?|horas?|hrs?)$/,
  /^(?:minutes?|mins?|minutos?)$/,
  /^(?:seconds?|secs?|segundos?)$/,
];

/** Does this JavaScript tick a visible timer: `setInterval` together with two or more quoted time-unit labels? */
export function scriptTicksCountdown(source) {
  if (!/\bsetInterval\s*\(/.test(source)) return false;
  const units = new Set();
  for (const match of source.matchAll(/["'`]\s*([A-Za-zÀ-ÿ]{2,9})\s*["'`]/g)) {
    const word = foldText(match[1]);
    UNIT_GROUPS.forEach((group, index) => {
      if (group.test(word)) units.add(index);
    });
  }
  return units.size >= 2;
}

/** Is this text a confirmshaming decline ("No, I prefer to keep losing money")? Returns the language or null. */
export function confirmshamingLanguage(text) {
  const folded = foldText(text)
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return SHAME_PATTERNS.find((p) => p.regex.test(folded))?.lang ?? null;
}

/**
 * Dark patterns on one page. `tree` is the parsed document (html-tree.mjs), `scripts` the page's JavaScript as
 * [{ name, text }] (inline scripts and the files it references). Returns [{ id, item, message }].
 */
export function scanDarkPatterns({ page, tree, scripts = [] }) {
  const hits = [];
  const add = (id, message) =>
    hits.push({ id, item: `${page}#${id}`, message: `${page}: ${message}` });

  for (const input of findAll(
    tree,
    (n) =>
      n.name === 'input' &&
      (n.attrs.type ?? '').toLowerCase() === 'checkbox' &&
      'checked' in n.attrs,
  )) {
    if (!closest(input, (n) => n.name === 'form')) continue;
    const field = input.attrs.name || input.attrs.id || '(unnamed)';
    add(
      'prechecked-checkbox',
      `the form field "${field}" is a checkbox that is already checked; consent and extras must start unchecked`,
    );
  }

  for (const el of findAll(tree, (n) => 'data-countdown' in n.attrs))
    add(
      'countdown-element',
      `${selectorOf(el)} is marked data-countdown; a ticking timer is manufactured urgency. A real deadline is written as a date`,
    );

  for (const script of scripts)
    if (scriptTicksCountdown(script.text))
      add(
        'countdown-script',
        `${script.name} ticks a timer (setInterval with time-unit labels); a countdown is manufactured urgency. A real deadline is written as a date`,
      );

  for (const el of findAll(
    tree,
    (n) => n.name === 'a' || n.name === 'button',
  )) {
    const text = textOf(el) || el.attrs['aria-label'] || '';
    const lang = text ? confirmshamingLanguage(text) : null;
    if (lang)
      add(
        'confirmshaming',
        `"${text}" declines by blaming the visitor (confirmshaming, ${lang}); a decline says "No, thanks" and nothing more`,
      );
  }
  return hits;
}

/**
 * The JavaScript a page runs, as [{ name, text }]: its inline executable scripts and the local files its
 * `<script src>` and `<link rel="modulepreload">` tags point to (found under `dist`). Chunks imported by those
 * files are not followed: a countdown is authored code, so it sits in the entry the page references.
 */
export function pageScripts(distDir, tree) {
  const scripts = [];
  const seen = new Set();
  const root = normalize(distDir) + sep;
  const addFile = (href) => {
    const clean = String(href).split(/[?#]/)[0];
    if (!/\.m?js$/i.test(clean) || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(clean))
      return;
    const file = normalize(join(distDir, clean.replace(/^\/+/, '')));
    if (!file.startsWith(root) || seen.has(file)) return;
    seen.add(file);
    if (existsSync(file) && statSync(file).isFile())
      scripts.push({
        name: clean.replace(/^\/+/, ''),
        text: readFileSync(file, 'utf8'),
      });
  };
  for (const el of findAll(tree, (n) => n.name === 'script')) {
    if (!isExecutableScript(el.attrs)) continue;
    if (el.attrs.src) addFile(el.attrs.src);
    else scripts.push({ name: 'an inline script', text: textOfRaw(el) });
  }
  for (const el of findAll(
    tree,
    (n) =>
      n.name === 'link' &&
      /\bmodulepreload\b/i.test(n.attrs.rel ?? '') &&
      n.attrs.href,
  ))
    addFile(el.attrs.href);
  return scripts;
}

const textOfRaw = (el) => el.children.map((c) => c.text ?? '').join('');
