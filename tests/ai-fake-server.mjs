// A local fake of the OpenAI Images endpoint for tests (node:http, no network). Not a test file.
import { createServer } from 'node:http';

/** A 1x1 WebP and a 1x1 PNG, base64. */
export const TINY_WEBP =
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
export const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** An obviously fake key, built at runtime so no key-shaped literal sits in the repo. */
export const fakeKey = () => ['sk', 'test', 'FAKEFAKEFAKE1234567890'].join('-');

/**
 * Start the server. `respond(request)` may return { status, headers, body } to override the default
 * answer (a WebP with a revised prompt and usage). `server.requests` records every request.
 */
export async function startFakeApi(respond = () => null) {
  const requests = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        // keep null
      }
      const request = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      };
      requests.push(request);
      const custom = respond(request);
      const answer = custom ?? {
        status: 200,
        body: {
          created: 1,
          data: [{ b64_json: TINY_WEBP, revised_prompt: 'A revised prompt.' }],
          usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 },
        },
      };
      res.writeHead(answer.status ?? 200, {
        'content-type': 'application/json',
        'x-request-id': 'req_fake_123',
        ...answer.headers,
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
    requests,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
