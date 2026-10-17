// Build and serve helpers. Every server started here must be closed by the caller
// (qa.mjs does it in a finally block and on SIGINT/SIGTERM).
import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createServer as createNetServer } from 'node:net';
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from 'node:path';

const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

export function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, HOST, () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

/** Absolute path to the astro CLI entry, so we can spawn it with `node` (no npx process tree). */
function astroBin(cwd) {
  const require = createRequire(join(cwd, 'package.json'));
  const pkgPath = require.resolve('astro/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.astro;
  return join(dirname(pkgPath), bin);
}

/** Run `astro build`; rejects with the captured output on failure. */
export function build(cwd) {
  return new Promise((resolveBuild, reject) => {
    const child = spawn(process.execPath, [astroBin(cwd), 'build'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveBuild(output);
      else
        reject(
          new Error(
            `astro build failed with exit code ${code}\n${output.trim()}`,
          ),
        );
    });
  });
}

async function waitForUrl(url, child, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null)
      throw new Error(`preview server exited early (code ${child.exitCode})`);
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs} ms`);
}

/** Serve the project's built `dist/` with `astro preview` on a free port. */
export async function startPreview(cwd) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [
      astroBin(cwd),
      'preview',
      '--host',
      HOST,
      '--port',
      String(port),
      '--ignore-lock',
    ],
    {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const baseUrl = `http://${HOST}:${port}`;
  const close = () =>
    new Promise((done) => {
      if (child.exitCode !== null || child.signalCode) return done();
      child.once('close', done);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000).unref();
    });
  try {
    await waitForUrl(`${baseUrl}/`, child);
  } catch (error) {
    await close();
    throw new Error(`${error.message}\n${log.trim()}`);
  }
  return { baseUrl, close, kind: 'astro preview' };
}

/** Serve any directory of static files (used by --dist, e.g. test fixtures). */
export async function startStatic(dir) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      let target = normalize(join(root, decodeURIComponent(url.pathname)));
      if (target !== root && !target.startsWith(root + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (existsSync(target) && statSync(target).isDirectory())
        target = join(target, 'index.html');
      if (!existsSync(target)) {
        res.writeHead(404, { 'content-type': MIME['.txt'] }).end('Not found');
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[extname(target)] ?? 'application/octet-stream',
      });
      createReadStream(target).pipe(res);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  const port = await freePort();
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, HOST, ok);
  });
  return {
    baseUrl: `http://${HOST}:${port}`,
    kind: 'static',
    close: () =>
      new Promise(
        (done) => (server.closeAllConnections?.(), server.close(() => done())),
      ),
  };
}

/** Find every .html file under `dist` and map it to a URL path. */
export function discoverPages(dist, exclude = []) {
  const root = resolve(dist);
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html'))
        files.push(relative(root, full).split(sep).join('/'));
    }
  };
  if (!existsSync(root)) throw new Error(`Directory not found: ${root}`);
  walk(root);
  return files
    .filter((file) => !exclude.includes(file))
    .sort()
    .map((file) => {
      let path;
      if (file === 'index.html') path = '/';
      else if (file.endsWith('/index.html'))
        path = `/${file.slice(0, -'index.html'.length)}`;
      else path = `/${file}`;
      return {
        file,
        path,
        slug:
          path === '/'
            ? 'index'
            : path
                .replace(/^\/|\/$/g, '')
                .replace(/\.html$/, '')
                .replace(/[^\w-]+/g, '-'),
      };
    });
}
