// Test helper: serves tests/fixtures/analyze/ and maps /vendor/gsap/ and /vendor/lenis/ to node_modules
// (nothing is copied into the fixture directory). Also serves the starter's built dist/ when asked.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

/** options.roots: [[urlPrefix, directory]] checked in order; the last entry is the fallback. */
export async function startFixtureServer(extraRoutes = {}) {
  const roots = [
    ['/vendor/gsap/', join(ROOT, 'node_modules/gsap/dist')],
    ['/vendor/lenis/', join(ROOT, 'node_modules/lenis/dist')],
    ['/', join(ROOT, 'tests/fixtures/analyze')],
  ];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const custom = extraRoutes[url.pathname];
    if (custom) {
      const [status, headers, body] =
        typeof custom === 'function' ? custom(req) : custom;
      res.writeHead(status, headers).end(body);
      return;
    }
    const [prefix, dir] = roots.find(([p]) => url.pathname.startsWith(p));
    let target = normalize(
      join(dir, decodeURIComponent(url.pathname.slice(prefix.length))),
    );
    if (!target.startsWith(dir + sep) && target !== dir)
      return void res.writeHead(403).end();
    if (existsSync(target) && statSync(target).isDirectory())
      target = join(target, 'index.html');
    if (!existsSync(target)) return void res.writeHead(404).end('not found');
    res.writeHead(200, {
      'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    });
    createReadStream(target).pipe(res);
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((done) => {
        server.closeAllConnections?.();
        server.close(done);
      }),
  };
}
