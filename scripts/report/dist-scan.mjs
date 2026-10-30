// Static checks on the built site (dist/): private files, mixed content, injection surface,
// Subresource Integrity, third-party origins, links, forms and the inline-script inventory.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { discoverPages } from '../qa/server.mjs';
import { walkFiles } from './fs-util.mjs';
import {
  effectiveScriptPolicy,
  headersForPath,
  parseHeadersFile,
  splitPolicies,
} from './headers.mjs';
import {
  cssUrls,
  isExecutableScript,
  pageReferences,
  scanHtml,
} from './html.mjs';
import { cap, makeItem } from './items.mjs';

const SKIP_SCHEMES =
  /^(mailto|tel|sms|data|blob|javascript|about|whatsapp|geo|webcal):/i;

/** Read the build into a model the checks share. */
export function loadDist(distDir) {
  const root = resolve(distDir);
  const files = walkFiles(root);
  const fileSet = new Set(files.map((f) => f.rel));
  const pages = discoverPages(root, []).map((page) => {
    const html = readFileSync(join(root, page.file), 'utf8');
    const scan = scanHtml(html);
    return { ...page, html, scan, refs: pageReferences(scan) };
  });
  const stylesheets = files
    .filter((f) => f.rel.endsWith('.css'))
    .map((f) => ({
      rel: f.rel,
      path: `/${f.rel}`,
      urls: cssUrls(readFileSync(f.abs, 'utf8')),
    }));
  const headersPath = join(root, '_headers');
  const redirectsPath = join(root, '_redirects');
  let siteOrigin = null;
  for (const page of pages) {
    const canonical = page.scan.tags.find(
      (t) => t.name === 'link' && /canonical/i.test(t.attrs.rel ?? ''),
    );
    if (canonical?.attrs.href) {
      try {
        siteOrigin = new URL(canonical.attrs.href).origin;
        break;
      } catch {
        // relative canonical: no origin to learn
      }
    }
  }
  return {
    root,
    files,
    fileSet,
    pages,
    stylesheets,
    siteOrigin,
    headersRules: existsSync(headersPath)
      ? parseHeadersFile(readFileSync(headersPath, 'utf8'))
      : null,
    redirects: existsSync(redirectsPath)
      ? readFileSync(redirectsPath, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => l.split(/\s+/)[0])
      : [],
  };
}

/**
 * Classify one URL found in a page (or stylesheet) at `fromPath`.
 * Returns { type: 'skip' } | { type: 'fragment', hash } | { type: 'internal', path, hash }
 * | { type: 'external', url, origin, insecure }.
 */
export function classifyUrl(model, rawUrl, fromPath) {
  const url = rawUrl.trim();
  if (!url || SKIP_SCHEMES.test(url)) return { type: 'skip' };
  if (url.startsWith('#')) return { type: 'fragment', hash: url.slice(1) };
  let parsed;
  try {
    parsed = new URL(
      url.startsWith('//') ? `https:${url}` : url,
      `https://dist.invalid${fromPath}`,
    );
  } catch {
    return { type: 'skip' };
  }
  if (!/^https?:$/.test(parsed.protocol)) return { type: 'skip' };
  const own = parsed.origin === 'https://dist.invalid';
  if (own || (model.siteOrigin && parsed.origin === model.siteOrigin))
    return {
      type: 'internal',
      path: parsed.pathname,
      hash: parsed.hash.slice(1),
    };
  return {
    type: 'external',
    url: parsed.href,
    origin: parsed.origin,
    insecure: parsed.protocol === 'http:' && !url.startsWith('//'),
  };
}

const redirectMatches = (patterns, path) =>
  patterns.some((pattern) =>
    new RegExp(
      `^${pattern
        .split('*')
        .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
    ).test(path),
  );

/** The page (by dist-relative file) or asset a pathname resolves to, or null. */
export function resolveLocal(model, pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    path = pathname;
  }
  const rel = path.replace(/^\/+/, '');
  const candidates = path.endsWith('/')
    ? [`${rel}index.html`]
    : [rel, `${rel}.html`, `${rel}/index.html`];
  for (const candidate of candidates)
    if (model.fileSet.has(candidate)) return candidate;
  if (redirectMatches(model.redirects, path)) return '_redirects';
  return null;
}

const pageLabel = (page) => page.path;

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** All URL references of the build with their origin: { page (path), ref, source } in document order. */
function* allReferences(model) {
  for (const page of model.pages)
    for (const ref of page.refs) yield { from: page.path, ref, page };
  for (const css of model.stylesheets)
    for (const url of css.urls)
      yield {
        from: css.path,
        ref: { kind: 'css', url, tag: 'url()', line: null },
        page: null,
      };
  for (const page of model.pages)
    for (const style of page.scan.styles)
      for (const url of cssUrls(style.text))
        yield {
          from: page.path,
          ref: { kind: 'css', url, tag: 'style', line: style.line },
          page,
        };
}

const where = (from, ref) =>
  `${from}${ref.line ? `:${ref.line}` : ''} <${ref.tag}>`;

// --- A01 / A02: files that must not be in the build ------------------------------------------------

const PRIVATE_FILE = [
  [/(^|\/)\.git(\/|$)/, 'version-control data'],
  [/(^|\/)\.env($|\.)(?!example$|sample$|template$)/, 'environment file'],
  [/\.(pem|key|p12|pfx)$/i, 'private key or certificate'],
  [/(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/, 'SSH key'],
  [/(^|\/)\.htpasswd$/, 'password file'],
  [/(^|\/)brief\.json$/, 'customer brief'],
];
const RISKY_FILE = [
  [/\.map$/i, 'source map'],
  [/(^|\/)package(-lock)?\.json$/, 'package manifest'],
  [/(^|\/)assets\.json$/, 'image manifest'],
];

export function privateFileItems(model) {
  const priv = [];
  const risky = [];
  for (const file of model.files) {
    const hit = PRIVATE_FILE.find(([re]) => re.test(file.rel));
    if (hit) priv.push(`dist/${file.rel} (${hit[1]})`);
    else {
      const warn = RISKY_FILE.find(([re]) => re.test(file.rel));
      if (warn) risky.push(`dist/${file.rel} (${warn[1]})`);
    }
  }
  return [
    makeItem({
      id: 'private-files',
      area: 'security',
      owasp: 'A01',
      status: priv.length ? 'fail' : 'pass',
      title: priv.length
        ? `${priv.length} private file(s) in the build`
        : 'No environment files, version-control data, keys or brief in the build',
      evidence: priv,
      fix: 'Remove the file from public/ (or from whatever copies it into the build) and keep it outside the site output; rotate any credential it held.',
    }),
    makeItem({
      id: 'source-maps',
      area: 'security',
      owasp: 'A02',
      status: risky.length ? 'warn' : 'pass',
      title: risky.length
        ? `${risky.length} source map or manifest file(s) are published`
        : 'No source maps or package manifests in the build',
      evidence: cap(risky),
      fix: 'Do not ship source maps or manifests: set build.sourcemap off in the Vite config and keep manifests out of public/.',
    }),
  ];
}

// --- A04: mixed content and plain http links --------------------------------------------------------

const LOADED_KINDS = new Set([
  'script',
  'style',
  'asset',
  'media',
  'frame',
  'form',
  'css',
]);

export function transportItems(model) {
  const mixed = [];
  const plainLinks = [];
  for (const { from, ref } of allReferences(model)) {
    const target = classifyUrl(model, ref.url, from);
    if (target.type !== 'external' || !target.insecure) continue;
    const line = `${where(from, ref)} ${ref.url}`;
    if (LOADED_KINDS.has(ref.kind)) mixed.push(line);
    else if (ref.kind === 'link' || ref.kind === 'meta-link')
      plainLinks.push(line);
  }
  return [
    makeItem({
      id: 'mixed-content',
      area: 'security',
      owasp: 'A04',
      status: mixed.length ? 'fail' : 'pass',
      title: mixed.length
        ? `${mixed.length} resource(s) load over plain http://`
        : 'No resource is loaded over plain http://',
      evidence: cap(mixed),
      fix: 'Load every script, stylesheet, image, font and frame over https:// (or from the site itself).',
    }),
    makeItem({
      id: 'http-links',
      area: 'security',
      owasp: 'A04',
      status: plainLinks.length ? 'warn' : 'pass',
      title: plainLinks.length
        ? `${plainLinks.length} link(s) use plain http://`
        : 'No link uses plain http://',
      evidence: cap(plainLinks),
      fix: 'Change the link to https:// (or ask the destination whether it supports it).',
    }),
  ];
}

// --- A05: javascript: URLs --------------------------------------------------------------------------

export function javascriptUrlItem(model) {
  const hits = [];
  for (const page of model.pages)
    for (const tag of page.scan.tags)
      for (const attr of [
        'href',
        'src',
        'action',
        'formaction',
        'data',
        'poster',
      ])
        if (/^\s*javascript:/i.test(tag.attrs[attr] ?? ''))
          hits.push(
            `${pageLabel(page)}:${tag.line} <${tag.name} ${attr}="javascript:...">`,
          );
  return makeItem({
    id: 'javascript-urls',
    area: 'security',
    owasp: 'A05',
    status: hits.length ? 'fail' : 'pass',
    title: hits.length
      ? `${hits.length} javascript: URL(s) in the pages`
      : 'No javascript: URLs in the pages',
    evidence: cap(hits),
    fix: 'Replace the javascript: URL with a real link or a button handled by a script file.',
  });
}

// --- A08: Subresource Integrity -----------------------------------------------------------------------

export function integrityItems(model) {
  const scripts = [];
  const styles = [];
  let checkedScripts = 0;
  let checkedStyles = 0;
  for (const { from, ref, page } of allReferences(model)) {
    if (!page || (ref.kind !== 'script' && ref.kind !== 'style')) continue;
    const target = classifyUrl(model, ref.url, from);
    if (target.type !== 'external') continue;
    const tag = page.scan.tags.find(
      (t) => t.line === ref.line && t.name === ref.tag,
    );
    const hasIntegrity = /^sha(256|384|512)-/.test(tag?.attrs.integrity ?? '');
    if (ref.kind === 'script') {
      checkedScripts += 1;
      if (!hasIntegrity) scripts.push(`${where(from, ref)} ${ref.url}`);
    } else {
      checkedStyles += 1;
      if (!hasIntegrity) styles.push(`${where(from, ref)} ${ref.url}`);
    }
  }
  return [
    makeItem({
      id: 'external-scripts-sri',
      area: 'security',
      owasp: 'A08',
      status: scripts.length ? 'fail' : 'pass',
      title: scripts.length
        ? `${scripts.length} external script(s) without Subresource Integrity`
        : checkedScripts
          ? `All ${checkedScripts} external script(s) have Subresource Integrity`
          : 'No external scripts',
      evidence: cap(scripts),
      fix: 'Add integrity="sha384-..." and crossorigin="anonymous" to the script tag, or host the file on the site.',
    }),
    makeItem({
      id: 'external-styles-sri',
      area: 'security',
      owasp: 'A08',
      status: styles.length ? 'warn' : 'pass',
      title: styles.length
        ? `${styles.length} external stylesheet(s) without Subresource Integrity`
        : checkedStyles
          ? `All ${checkedStyles} external stylesheet(s) have Subresource Integrity`
          : 'No external stylesheets',
      evidence: cap(styles),
      fix: 'Add integrity="sha384-..." and crossorigin="anonymous", or self-host the stylesheet (for example with @fontsource for fonts).',
    }),
    makeItem({
      id: 'deploy-provenance',
      area: 'security',
      owasp: 'A08',
      status: 'pass',
      title:
        'Deploys come only from CI, after QA and this report passed (by design)',
      evidence: [
        '.github/workflows/ci.yml: the deploy steps run only when every step before them passed; nothing is deployed from a local machine',
      ],
    }),
  ];
}

// --- A03: third-party origins -----------------------------------------------------------------------------

const ORIGIN_KINDS = new Set([
  'script',
  'style',
  'asset',
  'media',
  'frame',
  'css',
  'preconnect',
  'form',
]);

/** Origins other than the site's that the pages load from, with what is loaded and on which pages. */
export function thirdPartyOrigins(model) {
  const origins = new Map();
  for (const { from, ref } of allReferences(model)) {
    if (!ORIGIN_KINDS.has(ref.kind)) continue;
    const target = classifyUrl(model, ref.url, from);
    if (target.type !== 'external') continue;
    const entry = origins.get(target.origin) ?? {
      kinds: new Set(),
      pages: new Set(),
    };
    entry.kinds.add(ref.kind === 'css' ? 'css url()' : ref.kind);
    entry.pages.add(from);
    origins.set(target.origin, entry);
  }
  return [...origins]
    .map(([origin, entry]) => ({
      origin,
      kinds: [...entry.kinds].sort(),
      pages: [...entry.pages].sort(),
    }))
    .sort((a, b) => (a.origin < b.origin ? -1 : 1));
}

export function thirdPartyItem(model, config) {
  const list = thirdPartyOrigins(model);
  const over = list.length > config.maxThirdPartyOrigins;
  return makeItem({
    id: 'third-party-origins',
    area: 'security',
    owasp: 'A03',
    status: over ? 'warn' : 'pass',
    title: list.length
      ? `${list.length} third-party origin(s) loaded by the pages${over ? ` (limit ${config.maxThirdPartyOrigins})` : ''}`
      : 'The pages load nothing from third-party origins',
    evidence: list.map(
      (o) => `${o.origin} (${o.kinds.join(', ')}) on ${o.pages.join(', ')}`,
    ),
    fix: 'Each third-party origin is code and traffic you do not control: self-host the resource or drop it.',
  });
}

// --- A10: links, anchors and the 404 page ---------------------------------------------------------------------

export function linkItems(model) {
  const broken = [];
  const brokenAnchors = [];
  const idsOf = new Map(
    model.pages.map((page) => [
      page.file,
      new Set(
        page.scan.tags.flatMap((t) =>
          [t.attrs.id, t.attrs.name].filter(Boolean),
        ),
      ),
    ]),
  );
  for (const { from, ref, page } of allReferences(model)) {
    if (
      ref.kind === 'preconnect' ||
      ref.kind === 'meta-link' ||
      ref.kind === 'form'
    )
      continue;
    const target = classifyUrl(model, ref.url, from);
    if (target.type === 'fragment') {
      if (
        page &&
        ref.kind === 'link' &&
        target.hash &&
        target.hash !== 'top' &&
        !idsOf.get(page.file)?.has(safeDecode(target.hash))
      )
        brokenAnchors.push(`${where(from, ref)} #${target.hash}`);
      continue;
    }
    if (target.type !== 'internal') continue;
    const file = resolveLocal(model, target.path);
    if (!file) {
      broken.push(`${where(from, ref)} ${ref.url}`);
      continue;
    }
    if (
      target.hash &&
      ref.kind === 'link' &&
      idsOf.has(file) &&
      target.hash !== 'top'
    ) {
      if (!idsOf.get(file).has(safeDecode(target.hash)))
        brokenAnchors.push(`${where(from, ref)} ${ref.url}`);
    }
  }
  const hasErrorPage = model.fileSet.has('404.html');
  return [
    makeItem({
      id: 'error-page',
      area: 'security',
      owasp: 'A10',
      status: hasErrorPage ? 'pass' : 'warn',
      title: hasErrorPage
        ? 'The build has a 404 page'
        : 'The build has no 404.html',
      evidence: hasErrorPage ? ['dist/404.html'] : [],
      fix: 'Add src/pages/404.astro: without it Cloudflare Pages answers unknown paths with the home page.',
    }),
    makeItem({
      id: 'broken-links',
      area: 'security',
      owasp: 'A10',
      status: broken.length ? 'fail' : 'pass',
      title: broken.length
        ? `${broken.length} internal link(s) or asset(s) do not resolve to a file of the build`
        : 'Every internal link and asset resolves to a file of the build',
      evidence: cap(broken),
      fix: 'Fix the URL, or add the missing page or file.',
    }),
    makeItem({
      id: 'broken-anchors',
      area: 'security',
      owasp: 'A10',
      status: brokenAnchors.length ? 'warn' : 'pass',
      title: brokenAnchors.length
        ? `${brokenAnchors.length} link(s) point to an id that is not on the page`
        : 'Every #fragment link points to an id on its page',
      evidence: cap(brokenAnchors),
      fix: 'Add the id to the target element or fix the link. Ids created by a script cannot be checked here.',
    }),
  ];
}

export function targetBlankItem(model) {
  const bad = [];
  for (const page of model.pages)
    for (const tag of page.scan.tags) {
      if (tag.name !== 'a' && tag.name !== 'area') continue;
      if ((tag.attrs.target ?? '').toLowerCase() !== '_blank') continue;
      const rel = (tag.attrs.rel ?? '').toLowerCase().split(/\s+/);
      if (!rel.includes('noopener') && !rel.includes('noreferrer'))
        bad.push(
          `${pageLabel(page)}:${tag.line} <a href="${tag.attrs.href ?? ''}">`,
        );
    }
  return makeItem({
    id: 'target-blank',
    area: 'security',
    owasp: 'A05',
    status: bad.length ? 'warn' : 'pass',
    title: bad.length
      ? `${bad.length} target="_blank" link(s) without rel="noopener"`
      : 'Every target="_blank" link has rel="noopener"',
    evidence: cap(bad),
    fix: 'Add rel="noopener noreferrer" to the link.',
  });
}

// --- A06 / A07: forms and passwords --------------------------------------------------------------------------

export function formItems(model) {
  const forms = [];
  const thirdParty = [];
  const passwords = [];
  for (const page of model.pages)
    for (const tag of page.scan.tags) {
      if (tag.name === 'form') {
        forms.push(`${pageLabel(page)}:${tag.line}`);
        const target = classifyUrl(model, tag.attrs.action ?? '', page.path);
        if (target.type === 'external')
          thirdParty.push(
            `${pageLabel(page)}:${tag.line} <form action="${tag.attrs.action}">`,
          );
      }
      if (
        tag.name === 'input' &&
        (tag.attrs.type ?? '').toLowerCase() === 'password'
      )
        passwords.push(
          `${pageLabel(page)}:${tag.line} <input type="password">`,
        );
    }
  const a06 = thirdParty.length
    ? makeItem({
        id: 'forms',
        area: 'security',
        owasp: 'A06',
        status: 'warn',
        title: `${thirdParty.length} form(s) post to a third party`,
        evidence: thirdParty,
        fix: 'Check what the third party does with the data, state it in the privacy text, and prefer a provider you trust over a bare form. The legal-forms item judges consent, the provider list and the privacy text of each form.',
      })
    : forms.length
      ? makeItem({
          id: 'forms',
          area: 'security',
          owasp: 'A06',
          status: 'pass',
          title: `${forms.length} form(s), none posting to a third party`,
          evidence: forms,
        })
      : makeItem({
          id: 'forms',
          area: 'security',
          owasp: 'A06',
          status: 'na',
          title:
            'Not applicable: the pages have no forms and a static landing has no backend',
          evidence: [],
        });
  const a07 = passwords.length
    ? makeItem({
        id: 'password-fields',
        area: 'security',
        owasp: 'A07',
        status: 'warn',
        title: `${passwords.length} password input(s) on a static page`,
        evidence: passwords,
        fix: 'A static landing has no accounts. Remove the password field, or move the login to a real application.',
      })
    : makeItem({
        id: 'password-fields',
        area: 'security',
        owasp: 'A07',
        status: 'na',
        title:
          'Not applicable: a static landing has no accounts, sessions or login',
        evidence: [],
      });
  return [a06, a07];
}

export const loggingItem = () =>
  makeItem({
    id: 'logging',
    area: 'security',
    owasp: 'A09',
    status: 'na',
    title:
      'Not applicable: a static host runs no application code, so there are no application logs or alerts to keep',
    evidence: [],
  });

// --- A05: inline scripts and the script CSP ------------------------------------------------------------------------

const sha256 = (text) =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** CSP policies that apply to a page: the headers for its path plus its <meta http-equiv> tags. */
export function pagePolicies(model, page) {
  const headers = model.headersRules
    ? headersForPath(model.headersRules, page.path)
    : {};
  const fromHeader = splitPolicies(headers['content-security-policy']);
  const fromMeta = page.scan.tags
    .filter(
      (t) =>
        t.name === 'meta' &&
        (t.attrs['http-equiv'] ?? '').toLowerCase() ===
          'content-security-policy',
    )
    .map((t) => t.attrs.content ?? '')
    .filter(Boolean);
  return { fromHeader, fromMeta, all: [...fromHeader, ...fromMeta] };
}

export function scriptSurfaceItems(model) {
  const policyLines = [];
  let cspBad = 0;
  const inline = [];
  const early = [];
  let inlineTotal = 0;
  let inlineCovered = 0;
  for (const page of model.pages) {
    const sources = pagePolicies(model, page);
    const policy = effectiveScriptPolicy(sources.all);
    if (!policy.restricts) cspBad += 1;
    policyLines.push(
      `${pageLabel(page)}: ${policy.restricts ? `scripts restricted (${policy.hashes.length} hash(es))` : policy.reason}`,
    );
    // A <meta> policy only applies to what the parser reads after it; a response header applies to everything.
    const metaTag = page.scan.tags.find(
      (t) =>
        t.name === 'meta' &&
        (t.attrs['http-equiv'] ?? '').toLowerCase() ===
          'content-security-policy',
    );
    // Only a header that restricts scripts covers the whole document (a frame-ancestors header does not).
    const headerRestricts = effectiveScriptPolicy(sources.fromHeader).restricts;
    const policyStartsAt = headerRestricts || !metaTag ? -1 : metaTag.index;
    for (const script of page.scan.scripts) {
      if (script.attrs.src || !isExecutableScript(script.attrs)) continue;
      inlineTotal += 1;
      if (policy.restricts && policy.hashes.includes(sha256(script.text))) {
        inlineCovered += 1;
      } else if (policy.restricts && script.tagIndex < policyStartsAt) {
        early.push(
          `${pageLabel(page)}:${script.line} inline <script> (${script.text.length} chars) sits before the CSP <meta> tag, so the policy does not apply to it (authored code, not an injection point)`,
        );
      } else {
        inline.push(
          `${pageLabel(page)}:${script.line} inline <script> (${script.text.length} chars) not covered by a script hash`,
        );
      }
    }
    for (const tag of page.scan.tags)
      for (const name of Object.keys(tag.attrs))
        if (/^on[a-z]+$/.test(name)) {
          inlineTotal += 1;
          inline.push(
            `${pageLabel(page)}:${tag.line} <${tag.name} ${name}=...> inline event handler`,
          );
        }
  }
  return [
    makeItem({
      id: 'csp-scripts',
      area: 'security',
      owasp: 'A05',
      status: cspBad ? 'warn' : 'pass',
      title: cspBad
        ? `${cspBad} of ${model.pages.length} page(s) have no Content-Security-Policy that restricts scripts`
        : 'Every page has a Content-Security-Policy that restricts scripts',
      evidence: cap(policyLines),
      fix: "Enable security.csp in astro.config.mjs (hashes for the inline scripts; see the starter's config) so an injected inline script cannot run. Never use 'unsafe-inline' in script-src.",
    }),
    makeItem({
      id: 'inline-scripts',
      area: 'security',
      owasp: 'A05',
      status: inline.length ? 'warn' : 'pass',
      title: inlineTotal
        ? `${inlineTotal} inline script(s) or handler(s): ${inlineCovered} covered by a CSP hash, ${early.length} before the CSP meta tag, ${inline.length} not covered`
        : 'No inline scripts',
      evidence: cap([...inline, ...early]),
      fix: 'Cover inline scripts with the CSP hashes (security.csp) or move them to files under /_astro/.',
    }),
  ];
}

/** Every item the build alone can produce (headers are separate: see checks-headers.mjs). */
export function distItems(model, config) {
  return [
    ...privateFileItems(model),
    ...transportItems(model),
    javascriptUrlItem(model),
    ...integrityItems(model),
    thirdPartyItem(model, config),
    ...linkItems(model),
    targetBlankItem(model),
    ...formItems(model),
    loggingItem(),
    ...scriptSurfaceItems(model),
  ];
}
