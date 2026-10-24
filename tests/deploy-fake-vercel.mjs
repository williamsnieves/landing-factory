// A local fake of the Vercel endpoints the deploy uses (node:http, no network). Not a test file.
import { createServer } from 'node:http';

/**
 * `respond(request)` may return { status, body } to override the default answer.
 * Defaults: files are accepted, the deployment is created QUEUED, the first poll says BUILDING, then READY.
 */
export async function startFakeVercel(
  respond = () => null,
  { states = ['BUILDING', 'READY'] } = {},
) {
  const requests = [];
  let polls = 0;
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      let json = null;
      try {
        json = JSON.parse(raw.toString('utf8'));
      } catch {
        // binary body
      }
      const url = new URL(req.url, 'http://fake');
      const request = {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: req.headers,
        raw,
        json,
      };
      requests.push(request);
      let answer = respond(request);
      if (!answer) {
        if (request.path === '/v2/files') answer = { status: 200, body: {} };
        else if (
          request.method === 'POST' &&
          request.path === '/v13/deployments'
        )
          answer = {
            status: 200,
            body: {
              id: 'dpl_fake1',
              url: 'acme-abc123.vercel.app',
              readyState: 'QUEUED',
            },
          };
        else if (
          request.method === 'GET' &&
          request.path.startsWith('/v13/deployments/')
        ) {
          const state = states[Math.min(polls++, states.length - 1)];
          answer = {
            status: 200,
            body: {
              id: 'dpl_fake1',
              url: 'acme-abc123.vercel.app',
              readyState: state,
              alias: ['acme.example', 'acme-abc123.vercel.app'],
              ...(state === 'ERROR' ? { errorMessage: 'Build failed' } : {}),
            },
          };
        } else
          answer = { status: 404, body: { error: { message: 'not found' } } };
      }
      res.writeHead(answer.status ?? 200, {
        'content-type': 'application/json',
      });
      res.end(
        typeof answer.body === 'string'
          ? answer.body
          : JSON.stringify(answer.body),
      );
    });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise((done) => server.close(done)),
  };
}
