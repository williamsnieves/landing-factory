// The MCP server over stdio, driven like a real client: initialize, tools/list, errors, a malformed line.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { McpClient, makeFixtureRoot } from './mcp-helpers.mjs';

const fixture = makeFixtureRoot();
const clients = [];
const start = () => {
  const client = new McpClient({ LANDING_FACTORY_ROOT: fixture.root });
  clients.push(client);
  return client;
};
after(async () => {
  await Promise.all(clients.map((c) => c.close()));
  fixture.cleanup();
});

const EXPECTED_TOOLS = [
  'list_landings',
  'get_landing',
  'get_qa',
  'get_report',
  'brief_init',
  'brief_validate',
  'brief_missing',
  'brief_summary',
  'brief_update',
  'propose_landing',
  'preview_landing',
  'choose_direction',
  'generate_landing',
  'revise_landing',
  'run_qa',
  'run_report',
  'get_job',
  'list_jobs',
  'tail_job_log',
  'cancel_job',
];

let client;
before(() => {
  client = start();
});

test('initialize echoes a supported version and reports name and capabilities', async () => {
  const reply = await client.initialize('2025-11-25');
  assert.equal(reply.jsonrpc, '2.0');
  assert.equal(reply.result.protocolVersion, '2025-11-25');
  assert.equal(reply.result.serverInfo.name, 'landing-factory');
  assert.match(reply.result.serverInfo.version, /^\d+\.\d+\.\d+/);
  assert.deepEqual(reply.result.capabilities.tools, { listChanged: false });
});

test('initialize with an older supported version echoes it; an unknown one gets the newest', async () => {
  const old = start();
  assert.equal(
    (await old.initialize('2024-11-05')).result.protocolVersion,
    '2024-11-05',
  );
  const mid = start();
  assert.equal(
    (await mid.initialize('2025-03-26')).result.protocolVersion,
    '2025-03-26',
  );
  const unknown = start();
  assert.equal(
    (await unknown.initialize('1999-01-01')).result.protocolVersion,
    '2025-11-25',
  );
});

test('notifications/initialized gets no reply and ping returns {}', async () => {
  const before = client.stdoutLines.length;
  client.notify('notifications/initialized');
  const pong = await client.request('ping');
  assert.deepEqual(pong.result, {});
  // The only new line is the ping reply: the notification produced nothing.
  assert.equal(client.stdoutLines.length, before + 1);
});

test('tools/list offers every tool with an input schema, a description and annotations', async () => {
  const { result } = await client.request('tools/list');
  assert.deepEqual(
    result.tools.map((t) => t.name).sort(),
    [...EXPECTED_TOOLS].sort(),
  );
  for (const tool of result.tools) {
    assert.equal(tool.inputSchema?.type, 'object', tool.name);
    assert.ok(tool.description.length > 10, tool.name);
    assert.ok(tool.annotations, tool.name);
    const readOnly = tool.annotations.readOnlyHint === true;
    assert.ok(
      readOnly || tool.annotations.destructiveHint === false,
      tool.name,
    );
  }
  const byName = Object.fromEntries(result.tools.map((t) => [t.name, t]));
  for (const name of [
    'list_landings',
    'get_landing',
    'brief_validate',
    'get_job',
  ])
    assert.equal(byName[name].annotations.readOnlyHint, true, name);
  for (const name of ['brief_update', 'generate_landing', 'cancel_job'])
    assert.equal(byName[name].annotations.destructiveHint, false, name);
});

test('an unknown method is -32601 and the server keeps running', async () => {
  const reply = await client.request('resources/list');
  assert.equal(reply.error.code, -32601);
  assert.deepEqual((await client.request('ping')).result, {});
});

test('bad params are -32602: unknown tool, missing name, arguments that are not an object', async () => {
  const unknown = await client.request('tools/call', {
    name: 'publish_landing',
    arguments: {},
  });
  assert.equal(unknown.error.code, -32602);
  assert.match(unknown.error.message, /unknown tool/);
  assert.equal((await client.request('tools/call', {})).error.code, -32602);
  assert.equal(
    (
      await client.request('tools/call', {
        name: 'list_landings',
        arguments: [],
      })
    ).error.code,
    -32602,
  );
  assert.equal((await client.request('tools/call', null)).error.code, -32602);
  assert.deepEqual((await client.request('ping')).result, {});
});

test('a tool failure is a result with isError and a text explanation, not a JSON-RPC error', async () => {
  const reply = await client.request('tools/call', {
    name: 'get_landing',
    arguments: { slug: '../etc' },
  });
  assert.equal(reply.error, undefined);
  assert.equal(reply.result.isError, true);
  assert.match(reply.result.content[0].text, /invalid slug/);
  const wrongType = await client.request('tools/call', {
    name: 'get_landing',
    arguments: { slug: 5 },
  });
  assert.equal(wrongType.result.isError, true);
  const missing = await client.request('tools/call', {
    name: 'get_landing',
    arguments: {},
  });
  assert.equal(missing.result.isError, true);
  assert.match(missing.result.content[0].text, /slug: required/);
});

test('a successful call returns text content and structuredContent', async () => {
  const result = await client.call('list_landings');
  assert.equal(result.isError, undefined);
  assert.equal(result.content[0].type, 'text');
  assert.deepEqual(
    JSON.parse(result.content[0].text),
    result.structuredContent,
  );
  assert.deepEqual(
    result.structuredContent.landings.map((l) => l.slug),
    ['alpha', 'beta'],
  );
});

test('a malformed line gets a parse error and the server is still alive; invalid requests are -32600', async () => {
  client.write('{"jsonrpc": "2.0", "id": 99, "method": ');
  client.write('not json at all');
  client.write('[]');
  client.write('{"jsonrpc":"2.0","id":7}');
  await new Promise((done) => setTimeout(done, 200));
  const replies = client.stdoutLines
    .map((l) => JSON.parse(l))
    .filter((m) => m.error);
  const codes = replies.map((m) => m.error.code);
  assert.ok(codes.filter((c) => c === -32700).length >= 2);
  assert.ok(codes.includes(-32600));
  assert.deepEqual((await client.request('ping')).result, {});
});

test('a batch is answered with an array, notifications inside it are dropped', async () => {
  const done = new Promise((resolve) => {
    const timer = setInterval(() => {
      const line = client.stdoutLines.find(
        (l) => l.startsWith('[') && l.includes('"id":201'),
      );
      if (line) {
        clearInterval(timer);
        resolve(JSON.parse(line));
      }
    }, 20);
  });
  client.write(
    JSON.stringify([
      { jsonrpc: '2.0', id: 201, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
    ]),
  );
  const batch = await done;
  assert.equal(batch.length, 1);
  assert.deepEqual(batch[0].result, {});
});

test('stdout carries only JSON-RPC messages, one per line; logs stay on stderr', async () => {
  assert.ok(client.stdoutLines.length > 5);
  for (const line of client.stdoutLines) {
    const parsed = JSON.parse(line);
    for (const message of Array.isArray(parsed) ? parsed : [parsed])
      assert.equal(message.jsonrpc, '2.0', line);
  }
});

test('the server exits when its input closes', async () => {
  const short = start();
  await short.initialize();
  const exit = await Promise.race([
    (async () => {
      short.child.stdin.end();
      return short.exited;
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('did not exit')), 5000),
    ),
  ]);
  assert.equal(exit.code, 0);
});
