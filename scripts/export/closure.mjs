// The import closure of the scripts an exported repository needs (design Decision 2): starting from fixed
// entry points, follow every static `import ... from './x'`, `export ... from './x'`, side-effect import and
// `import('./x')` with a relative string specifier, and collect the files. Bare specifiers (packages and
// `node:` modules) are ignored: packages become dependencies. A relative import that leaves `scripts/`, or an
// `import()` whose argument is not a string literal, stops the export, because the exported repository would
// miss that file.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** A problem with the import graph; `importer` and `specifier` name the offending import. */
export class ClosureError extends Error {
  constructor(message, { importer = '', specifier = '' } = {}) {
    super(message);
    this.name = 'ClosureError';
    this.importer = importer;
    this.specifier = specifier;
  }
}

const SOURCE_FILE = /\.[cm]?js$/;
const RESOLVE_SUFFIXES = ['', '.mjs', '.js', '/index.mjs', '/index.js'];

/**
 * The code of a module without comment-only lines (line comments, and block comments that start a line), so
 * an example import in documentation is not followed. A `//` inside a string such as `https://` is kept.
 */
export function stripComments(source) {
  const out = [];
  let inBlock = false;
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (inBlock) {
      if (trimmed.includes('*/')) inBlock = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/', 2)) inBlock = true;
      continue;
    }
    if (trimmed.startsWith('//')) continue;
    out.push(line);
  }
  return out.join('\n');
}

/**
 * Relative and literal dynamic specifiers of a module, plus the dynamic imports it cannot follow.
 * Returns { specifiers: string[], dynamic: string[] } where `dynamic` holds the argument text of each
 * `import(...)` that is not a plain string literal.
 */
export function findImports(source) {
  const code = stripComments(source);
  const specifiers = new Set();
  const dynamic = [];
  const add = (value) => {
    if (value.startsWith('./') || value.startsWith('../'))
      specifiers.add(value);
  };
  // import x from '...', import { a } from '...' (also multi-line), export * from '...', export { a } from '...'
  for (const m of code.matchAll(/\bfrom\s*(['"])([^'"\n]+)\1/g)) add(m[2]);
  // import '...'
  for (const m of code.matchAll(/(?:^|[;\s])import\s*(['"])([^'"\n]+)\1/g))
    add(m[2]);
  // import('...') and import(expression)
  for (const m of code.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
    const arg = m[1].trim();
    const literal = /^(['"])([^'"\n]*)\1$/.exec(arg);
    if (literal) add(literal[2]);
    else dynamic.push(arg || '(empty)');
  }
  return { specifiers: [...specifiers], dynamic };
}

function resolveImport(importerAbs, specifier) {
  const base = resolve(dirname(importerAbs), specifier);
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * @param {object} o
 * @param {string} o.root     repository root (absolute)
 * @param {string[]} o.entries entry points, relative to the root (for example `scripts/qa.mjs`)
 * @param {string} [o.scriptsDir] the only folder the closure may stay in (default `<root>/scripts`)
 * @returns {string[]} sorted root-relative paths with forward slashes, entries included
 */
export function importClosure({ root, entries, scriptsDir }) {
  const base = resolve(scriptsDir ?? join(root, 'scripts'));
  const inside = (abs) => abs === base || abs.startsWith(base + sep);
  const rel = (abs) => relative(root, abs).split(sep).join('/');
  const seen = new Set();
  const queue = entries.map((entry) => resolve(root, entry));
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    if (!existsSync(file))
      throw new ClosureError(`${rel(file)} does not exist`, {
        importer: rel(file),
      });
    seen.add(file);
    if (!SOURCE_FILE.test(file)) continue;
    const { specifiers, dynamic } = findImports(readFileSync(file, 'utf8'));
    if (dynamic.length)
      throw new ClosureError(
        `${rel(file)} has import(${dynamic[0]}), which is not a string literal; the export cannot follow it`,
        { importer: rel(file), specifier: dynamic[0] },
      );
    for (const specifier of specifiers) {
      const target = resolveImport(file, specifier);
      if (!target)
        throw new ClosureError(
          `${rel(file)} imports "${specifier}", which does not exist`,
          { importer: rel(file), specifier },
        );
      if (!inside(target))
        throw new ClosureError(
          `${rel(file)} imports "${specifier}", which is outside scripts/ (${rel(target)}); an exported repository would miss it`,
          { importer: rel(file), specifier },
        );
      queue.push(target);
    }
  }
  return [...seen].map(rel).sort();
}
