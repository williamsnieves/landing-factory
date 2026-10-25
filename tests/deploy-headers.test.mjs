// scripts/deploy/headers.mjs: _headers rules translated to vercel.json, Caddy, Nginx and .htaccess.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  allHeaders,
  canonicalName,
  generateHeaderConfig,
  parseHeadersFile,
  toCaddy,
  toHtaccess,
  toNginx,
  toVercelJson,
} from '../scripts/deploy/headers.mjs';
import { STARTER_HEADERS } from './deploy-helpers.mjs';

const MULTI = `# fixture with several rules
/*
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: frame-ancestors 'self'
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=86400
  Access-Control-Allow-Origin: *
/downloads/report.pdf
  Content-Disposition: attachment; filename="report.pdf"
/blog/:slug/feed
  X-Robots-Tag: noindex
/old/*
  ! X-Frame-Options
`;

const FIXTURES = { starter: STARTER_HEADERS, multi: MULTI };
const OUTPUTS = {
  vercel: (rules) => JSON.stringify(toVercelJson(rules)),
  caddy: (rules) => toCaddy(rules),
  nginx: (rules) => toNginx(rules),
  htaccess: (rules) => toHtaccess(rules),
};
// How each target spells a header value after quoting.
const escaped = {
  vercel: (v) => JSON.stringify(v).slice(1, -1),
  caddy: (v) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
  nginx: (v) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
  htaccess: (v) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"'),
};

test('canonicalName restores the usual header spelling', () => {
  assert.equal(
    canonicalName('x-content-type-options'),
    'X-Content-Type-Options',
  );
  assert.equal(canonicalName('cache-control'), 'Cache-Control');
});

for (const [fixture, text] of Object.entries(FIXTURES)) {
  const rules = parseHeadersFile(text);
  for (const [target, render] of Object.entries(OUTPUTS)) {
    test(`every header of every rule appears in the ${target} output (${fixture})`, () => {
      const output = render(rules);
      for (const h of allHeaders(rules)) {
        assert.ok(
          output.toLowerCase().includes(h.name.toLowerCase()),
          `${target}: header name ${h.name}`,
        );
        if (target === 'nginx' && /\$/.test(h.value)) continue;
        assert.ok(
          output.includes(escaped[target](h.value)),
          `${target}: value of ${h.name}: ${h.value}`,
        );
      }
    });
  }
}

test('vercel.json keeps one headers entry per rule, immutable assets, and trailing slashes', () => {
  const json = toVercelJson(parseHeadersFile(STARTER_HEADERS));
  assert.equal(json.trailingSlash, true);
  assert.equal(json.cleanUrls, false);
  const astro = json.headers.find((h) => h.source === '/_astro/(.*)');
  assert.deepEqual(astro.headers, [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  ]);
  const all = json.headers.find((h) => h.source === '/(.*)');
  const names = all.headers.map((h) => h.key);
  for (const name of [
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Content-Security-Policy',
    'Strict-Transport-Security',
  ])
    assert.ok(names.includes(name), name);
  const generated = generateHeaderConfig(
    'vercel',
    parseHeadersFile(STARTER_HEADERS),
  );
  assert.deepEqual(JSON.parse(generated['vercel.json']), json);
});

test('/_astro/* keeps its year-long immutable caching on every target', () => {
  const rules = parseHeadersFile(STARTER_HEADERS);
  const value = 'public, max-age=31536000, immutable';
  assert.match(
    toCaddy(rules),
    /@rule\d path \/_astro\/\*[\s\S]*header @rule\d \{\s*Cache-Control "public, max-age=31536000, immutable"/,
  );
  assert.match(
    toNginx(rules),
    /location \^~ \/_astro\/ \{\s*add_header Cache-Control "public, max-age=31536000, immutable" always;/,
  );
  const htaccess = toHtaccess(rules);
  assert.match(htaccess, /RewriteRule \^_astro\/\.\*\$ - \[E=LF_RULE1:1\]/);
  assert.ok(
    htaccess.includes(
      `Header always set Cache-Control "${value}" env=LF_RULE1`,
    ),
  );
  // Only the asset rule carries the cache header.
  assert.equal((htaccess.match(/Cache-Control/g) ?? []).length, 1);
});

test('Nginx repeats the global headers inside every location, because add_header is not inherited', () => {
  const rules = parseHeadersFile(MULTI);
  const nginx = toNginx(rules);
  const blocks = nginx.split(/\n {4}location /).slice(1);
  assert.ok(blocks.length >= 4);
  for (const block of blocks) {
    const body = block.split('\n}')[0];
    if (!/add_header/.test(body)) continue;
    assert.match(body, /add_header X-Content-Type-Options "nosniff" always;/);
    assert.match(body, /add_header Strict-Transport-Security/);
  }
  assert.match(nginx, /location = \/downloads\/report\.pdf \{/);
  assert.match(nginx, /location ~ \^\/blog\/\[\^\/\]\+\/feed\$ \{/);
  assert.match(
    nginx,
    /location \^~ \/fonts\/ \{[^}]*Cache-Control "public, max-age=86400"/,
  );
});

test('the 404 page is served for unknown paths on every server target', () => {
  const rules = parseHeadersFile(STARTER_HEADERS);
  assert.match(
    toCaddy(rules),
    /handle_errors \{\s*rewrite \* \/404\.html\s*file_server/,
  );
  const nginx = toNginx(rules);
  assert.match(nginx, /error_page 404 \/404\.html;/);
  assert.match(nginx, /try_files \$uri \$uri\/ =404;/);
  assert.match(toHtaccess(rules), /^ErrorDocument 404 \/404\.html$/m);
});

test('.htaccess forces HTTPS, hides directory listings, and sets headers with Header always set', () => {
  const htaccess = toHtaccess(parseHeadersFile(STARTER_HEADERS));
  assert.match(htaccess, /^Options -Indexes$/m);
  assert.match(htaccess, /RewriteCond %\{HTTPS\} off/);
  assert.match(
    htaccess,
    /RewriteRule \^ https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\} \[L,R=301\]/,
  );
  assert.match(htaccess, /<IfModule mod_headers\.c>/);
  assert.match(
    htaccess,
    /Header always set Strict-Transport-Security "max-age=31536000"/,
  );
  assert.match(htaccess, /Header always set X-Content-Type-Options "nosniff"/);
});

test('a detached header (! Name) is unset on Caddy and Apache and left out elsewhere', () => {
  const rules = parseHeadersFile(MULTI);
  assert.match(toCaddy(rules), /-X-Frame-Options/);
  assert.match(
    toHtaccess(rules),
    /Header always unset X-Frame-Options env=LF_RULE\d/,
  );
});

test('named placeholders become a regular expression matcher on Caddy', () => {
  assert.match(
    toCaddy(parseHeadersFile(MULTI)),
    /@rule\d path_regexp \^\/blog\/\[\^\/\]\+\/feed\$/,
  );
});

test('values with quotes are escaped and line breaks or $ in Nginx are refused', () => {
  const rules = parseHeadersFile('/*\n  X-Test: say "hi"\n');
  assert.ok(toCaddy(rules).includes('X-Test "say \\"hi\\""'));
  assert.ok(toHtaccess(rules).includes('X-Test "say \\"hi\\""'));
  assert.throws(
    () => toNginx(parseHeadersFile('/*\n  X-Test: a$b\n')),
    /nginx/,
  );
});

test('generateHeaderConfig names the files of each target', () => {
  const rules = parseHeadersFile(STARTER_HEADERS);
  assert.deepEqual(Object.keys(generateHeaderConfig('vps', rules)), [
    'Caddyfile.snippet',
    'nginx.conf.snippet',
  ]);
  assert.deepEqual(Object.keys(generateHeaderConfig('shared', rules)), [
    '.htaccess',
  ]);
  assert.deepEqual(generateHeaderConfig('cloudflare', rules), {});
  const caddy = generateHeaderConfig('vps', rules, {
    site: 'acme.example',
    root: '/srv/acme/current',
  })['Caddyfile.snippet'];
  assert.match(caddy, /^acme\.example \{$/m);
  assert.match(caddy, /root \* \/srv\/acme\/current/);
});
