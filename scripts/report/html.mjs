// A small HTML scanner (no dependency): tags with attributes, the text of <script> and <style>,
// and the URLs a page refers to. It reads built pages, so it does not need to handle every HTML quirk.

const ENTITIES = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};
const decode = (text) =>
  text.replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity]);

const TAG = /<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/y;
const ATTR =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const RAW_TEXT = new Set(['script', 'style']);

function parseAttrs(source) {
  const attrs = {};
  for (const match of source.matchAll(ATTR)) {
    const name = match[1].toLowerCase();
    if (name in attrs) continue; // first wins, as in browsers
    attrs[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

/**
 * Scan an HTML document. Returns { tags, scripts, styles } where tags are
 * { name, attrs, line } in document order, and scripts/styles are { attrs, text, line }.
 */
export function scanHtml(html) {
  const tags = [];
  const scripts = [];
  const styles = [];
  // Positions are asked in increasing order, so count newlines incrementally.
  let countedTo = 0;
  let countedLine = 1;
  const lineAt = (position) => {
    for (
      let i = html.indexOf('\n', countedTo);
      i !== -1 && i < position;
      i = html.indexOf('\n', countedTo)
    ) {
      countedLine += 1;
      countedTo = i + 1;
    }
    return countedLine;
  };
  let index = 0;
  while (index < html.length) {
    const lt = html.indexOf('<', index);
    if (lt === -1) break;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    TAG.lastIndex = lt;
    const match = TAG.exec(html);
    if (!match) {
      index = lt + 1;
      continue;
    }
    const name = match[1].toLowerCase();
    const attrs = parseAttrs(match[2]);
    const tag = { name, attrs, line: lineAt(lt), index: tags.length };
    tags.push(tag);
    index = lt + match[0].length;
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'ig');
      close.lastIndex = index;
      const end = close.exec(html);
      const text = html.slice(index, end ? end.index : html.length);
      (name === 'script' ? scripts : styles).push({
        attrs,
        text,
        line: tag.line,
        tagIndex: tag.index,
      });
      index = end ? end.index + end[0].length : html.length;
    }
  }
  return { tags, scripts, styles };
}

/** `type` values of a <script> that the browser does not execute (data blocks). */
const DATA_SCRIPT =
  /^(application\/(ld\+)?json|application\/importmap\+json|text\/template|text\/html|speculationrules)/i;
export const isExecutableScript = (attrs) => {
  const type = (attrs.type ?? '').trim();
  return !type ||
    /^(module|text\/javascript|application\/javascript)$/i.test(type)
    ? true
    : !DATA_SCRIPT.test(type) && /javascript|ecmascript/i.test(type);
};

/** Candidates of a srcset attribute: [{ url, weight }] where weight is the w or x descriptor (default 1). */
export function srcsetCandidates(value) {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .filter((parts) => parts[0])
    .map(([url, descriptor]) => ({
      url,
      weight: Number.parseFloat(descriptor) || 1,
    }));
}

/** Candidate URLs of a srcset attribute. */
export const srcsetUrls = (value) =>
  value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);

/** `url(...)` and `@import` targets of CSS text. */
export function cssUrls(css) {
  const urls = [];
  for (const match of css.matchAll(
    /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s'"]*))\s*\)/gi,
  )) {
    const url = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (url) urls.push(url);
  }
  for (const match of css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi))
    urls.push(match[1]);
  return urls;
}

const LINK_ASSET_RELS = new Set([
  'icon',
  'shortcut icon',
  'apple-touch-icon',
  'manifest',
  'preload',
  'modulepreload',
  'prefetch',
  'mask-icon',
]);

/**
 * Every URL reference of a scanned page, as { kind, url, tag, line }.
 * kinds: script, style, asset (icon, preload, ...), media (img, source, video, audio, track),
 * frame (iframe, embed, object), form (action), link (a href), meta-link (canonical, alternate, ...),
 * preconnect (origin only).
 */
export function pageReferences({ tags }) {
  const refs = [];
  const add = (kind, url, tag, attr = null) => {
    if (typeof url === 'string' && url.trim())
      refs.push({
        kind,
        url: url.trim(),
        tag: tag.name,
        line: tag.line,
        tagIndex: tag.index,
        attr,
      });
  };
  for (const tag of tags) {
    const a = tag.attrs;
    switch (tag.name) {
      case 'a':
      case 'area':
        add('link', a.href, tag);
        break;
      case 'link': {
        const rels = (a.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const rel = rels.join(' ');
        if (rels.includes('stylesheet')) add('style', a.href, tag);
        else if (rels.includes('preconnect') || rels.includes('dns-prefetch'))
          add('preconnect', a.href, tag);
        else if (
          rels.some((r) => LINK_ASSET_RELS.has(r)) ||
          LINK_ASSET_RELS.has(rel)
        )
          add('asset', a.href, tag);
        else add('meta-link', a.href, tag);
        if (a.imagesrcset)
          srcsetUrls(a.imagesrcset).forEach((u) => add('asset', u, tag));
        break;
      }
      case 'script':
        add('script', a.src, tag);
        break;
      case 'img':
      case 'source':
      case 'video':
      case 'audio':
      case 'track':
      case 'input':
        add('media', a.src, tag, 'src');
        if (a.poster) add('media', a.poster, tag);
        if (a.srcset)
          srcsetUrls(a.srcset).forEach((u) => add('media', u, tag, 'srcset'));
        break;
      case 'iframe':
      case 'embed':
        add('frame', a.src, tag);
        break;
      case 'object':
        add('frame', a.data, tag);
        break;
      case 'form':
        add('form', a.action, tag);
        break;
      default:
    }
    if (a.formaction) add('form', a.formaction, tag);
  }
  return refs;
}
