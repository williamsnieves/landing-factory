// Tests for scripts/lib/openai-images.mjs against a local fake HTTP server. No network, no real key.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ImageApiError,
  buildRequest,
  generateImage,
  imageFormatOf,
  redact,
} from '../scripts/lib/openai-images.mjs';
import {
  TINY_PNG,
  TINY_WEBP,
  fakeKey,
  startFakeApi,
} from './ai-fake-server.mjs';

const args = {
  prompt: 'An abstract gradient of light and glass shapes',
  model: 'gpt-image-1.5',
  size: '1536x1024',
  quality: 'low',
};

test('generateImage posts to /v1/images/generations with the body, the bearer key and decodes the base64', async () => {
  const api = await startFakeApi();
  const key = fakeKey();
  try {
    const result = await generateImage({
      ...args,
      baseUrl: api.baseUrl,
      apiKey: key,
    });
    assert.equal(api.requests.length, 1);
    const [request] = api.requests;
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/v1/images/generations');
    assert.equal(request.headers.authorization, `Bearer ${key}`);
    assert.match(request.headers['content-type'], /application\/json/);
    assert.deepEqual(request.body, {
      model: 'gpt-image-1.5',
      prompt: args.prompt,
      size: '1536x1024',
      quality: 'low',
      n: 1,
      output_format: 'webp',
      output_compression: 90,
    });
    assert.equal(result.format, 'webp');
    assert.deepEqual(result.bytes, Buffer.from(TINY_WEBP, 'base64'));
    assert.equal(result.revisedPrompt, 'A revised prompt.');
    assert.deepEqual(result.usage, {
      input_tokens: 12,
      output_tokens: 34,
      total_tokens: 46,
    });
    assert.equal(result.requestId, 'req_fake_123');
    assert.ok(!JSON.stringify(result).includes(key), 'the key is not returned');
  } finally {
    await api.close();
  }
});

test('OPENAI_BASE_URL overrides the endpoint and png requests carry no compression', async () => {
  const api = await startFakeApi(() => ({
    body: { data: [{ b64_json: TINY_PNG }] },
  }));
  const saved = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_BASE_URL = `${api.baseUrl}/`;
  try {
    const result = await generateImage({
      ...args,
      format: 'png',
      apiKey: fakeKey(),
    });
    assert.equal(result.format, 'png');
    assert.equal(result.revisedPrompt, '');
    assert.equal(result.usage, null);
    assert.equal(api.requests[0].body.output_format, 'png');
    assert.ok(!('output_compression' in api.requests[0].body));
  } finally {
    if (saved === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = saved;
    await api.close();
  }
});

test('buildRequest has the URL and body and never a header or key', () => {
  const request = buildRequest({ ...args, baseUrl: 'http://x.test' });
  assert.equal(request.url, 'http://x.test/v1/images/generations');
  assert.deepEqual(Object.keys(request).sort(), ['body', 'url']);
  assert.throws(() => buildRequest({ ...args, format: 'gif' }), /unknown/);
});

test('a missing key fails before any request, naming the variable', async () => {
  const api = await startFakeApi();
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl }),
      (error) =>
        error instanceof ImageApiError &&
        error.code === 'no-key' &&
        /OPENAI_API_KEY/.test(error.message),
    );
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl, apiKey: '  ' }),
      /OPENAI_API_KEY/,
    );
    assert.equal(api.requests.length, 0);
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    await api.close();
  }
});

test('HTTP errors map to the status and message, and a key echoed in the body is masked', async () => {
  const key = fakeKey();
  const api = await startFakeApi((request) =>
    request.body.model === 'nope'
      ? {
          status: 404,
          body: { error: { message: 'The model `nope` does not exist.' } },
        }
      : {
          status: 401,
          body: {
            error: {
              message: `Incorrect API key provided: ${key}. Also sk-live-ANOTHERSECRET123456 was seen.`,
            },
          },
        },
  );
  try {
    await assert.rejects(
      generateImage({
        ...args,
        model: 'nope',
        baseUrl: api.baseUrl,
        apiKey: key,
      }),
      (error) =>
        error.code === 'api' &&
        error.status === 404 &&
        /HTTP 404: The model `nope` does not exist/.test(error.message) &&
        /req_fake_123/.test(error.message),
    );
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl, apiKey: key }),
      (error) => {
        assert.equal(error.status, 401);
        assert.ok(!error.message.includes(key), 'the key is masked');
        assert.ok(
          !error.message.includes('ANOTHERSECRET'),
          'a key-shaped value is masked',
        );
        assert.match(error.message, /\[redacted key\]/);
        assert.match(error.message, /\.\.\. \(\d+ chars\)/);
        return true;
      },
    );
  } finally {
    await api.close();
  }
});

test('bad responses are named: no image data, not an image, a non-JSON error', async () => {
  const key = fakeKey();
  const answers = [
    { body: { data: [] } },
    {
      body: {
        data: [{ b64_json: Buffer.from('hello world!!').toString('base64') }],
      },
    },
    { status: 502, body: '<html>Bad gateway</html>' },
  ];
  const api = await startFakeApi(() => answers.shift());
  try {
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl, apiKey: key }),
      /without image data/,
    );
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl, apiKey: key }),
      /not a WebP, PNG or JPEG/,
    );
    await assert.rejects(
      generateImage({ ...args, baseUrl: api.baseUrl, apiKey: key }),
      /HTTP 502: <html>Bad gateway/,
    );
  } finally {
    await api.close();
  }
});

test('a network failure is reported without the key, and fetch can be injected', async () => {
  const key = fakeKey();
  await assert.rejects(
    generateImage({
      ...args,
      apiKey: key,
      baseUrl: 'http://x.test',
      fetchImpl: async () => {
        throw new Error(`connect failed with ${key}`);
      },
    }),
    (error) => error.code === 'network' && !error.message.includes(key),
  );
  const result = await generateImage({
    ...args,
    apiKey: key,
    baseUrl: 'http://x.test',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'http://x.test/v1/images/generations');
      assert.equal(init.headers.authorization, `Bearer ${key}`);
      return new Response(JSON.stringify({ data: [{ b64_json: TINY_WEBP }] }), {
        status: 200,
      });
    },
  });
  assert.equal(result.requestId, '');
});

test('redact and imageFormatOf', () => {
  assert.equal(redact('a b c', 'zzz'), 'a b c');
  assert.ok(!redact('bad sk-abcdefghijkl1234', '').includes('abcdefghijkl'));
  assert.equal(imageFormatOf(Buffer.from(TINY_WEBP, 'base64')), 'webp');
  assert.equal(imageFormatOf(Buffer.from(TINY_PNG, 'base64')), 'png');
  assert.equal(
    imageFormatOf(
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ),
    'jpeg',
  );
  assert.equal(imageFormatOf(Buffer.from('short')), null);
});
