// A small HTML tree (no dependency) for the checks that need to know what sits inside what: the conversion audit
// and the dark-patterns rule. It reads built pages, which are well formed, so it handles void elements, raw-text
// elements (script, style) and stray end tags, and nothing more.

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const RAW_TEXT = new Set(['script', 'style']);
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/y;
const ATTR =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};
const decode = (text) =>
  text.replace(
    /&(?:amp|quot|#39|lt|gt|nbsp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );

function parseAttrs(source) {
  const attrs = {};
  for (const match of source.matchAll(ATTR)) {
    const name = match[1].toLowerCase();
    if (name in attrs) continue;
    attrs[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

/** Parse an HTML document into { name: '#root', children }. Elements: { name, attrs, children, parent }; text: { name: '#text', text }. */
export function parseTree(html) {
  const root = { name: '#root', attrs: {}, children: [], parent: null };
  let current = root;
  const addText = (text) => {
    if (text) current.children.push({ name: '#text', text, parent: current });
  };
  let index = 0;
  const source = String(html);
  while (index < source.length) {
    const lt = source.indexOf('<', index);
    if (lt === -1) {
      addText(decode(source.slice(index)));
      break;
    }
    if (lt > index) addText(decode(source.slice(index, lt)));
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    TAG.lastIndex = lt;
    const match = TAG.exec(source);
    if (!match) {
      addText('<');
      index = lt + 1;
      continue;
    }
    index = lt + match[0].length;
    const name = match[2].toLowerCase();
    if (match[1]) {
      // end tag: close the nearest open element of that name, ignore a stray one
      for (let node = current; node && node !== root; node = node.parent)
        if (node.name === name) {
          current = node.parent;
          break;
        }
      continue;
    }
    const node = {
      name,
      attrs: parseAttrs(match[3]),
      children: [],
      parent: current,
    };
    current.children.push(node);
    if (RAW_TEXT.has(name)) {
      const close = new RegExp(`</${name}\\s*>`, 'ig');
      close.lastIndex = index;
      const end = close.exec(source);
      const text = source.slice(index, end ? end.index : source.length);
      if (text) node.children.push({ name: '#text', text, parent: node });
      index = end ? end.index + end[0].length : source.length;
    } else if (!VOID.has(name) && !/\/\s*$/.test(match[3])) current = node;
  }
  return root;
}

const isElement = (node) => node.name !== '#text';

/** Child elements of a node. */
export const elementChildren = (node) =>
  (node.children ?? []).filter(isElement);

/** Every descendant element (document order) for which `predicate` is true. */
export function findAll(node, predicate) {
  const found = [];
  const visit = (parent) => {
    for (const child of parent.children ?? []) {
      if (!isElement(child)) continue;
      if (predicate(child)) found.push(child);
      visit(child);
    }
  };
  visit(node);
  return found;
}

/** Visible text of a node: script and style content dropped, whitespace squeezed. */
export function textOf(node) {
  const parts = [];
  const visit = (parent) => {
    for (const child of parent.children ?? []) {
      if (child.name === '#text') parts.push(child.text);
      else if (!RAW_TEXT.has(child.name)) visit(child);
    }
  };
  if (node.name === '#text') return node.text.replace(/\s+/g, ' ').trim();
  visit(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** The nearest ancestor (not the node itself) for which `predicate` is true, or null. */
export function closest(node, predicate) {
  for (let up = node.parent; up; up = up.parent)
    if (up.name !== '#root' && predicate(up)) return up;
  return null;
}

/** A short CSS-like selector for a node: tag, id, first classes and the data-* flags; for messages only. */
export function selectorOf(node) {
  const id = node.attrs?.id ? `#${node.attrs.id}` : '';
  const classes = (node.attrs?.class ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${node.name}${id}${classes}`;
}
