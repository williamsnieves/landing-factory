// MCP over stdio, hand-written: newline-delimited JSON-RPC 2.0 with initialize, ping, tools/list and tools/call.
// Only protocol messages are written to the output stream; logs go to stderr. No SDK dependency.
import { createInterface } from 'node:readline';

import { ParamsError, ToolError } from './paths.mjs';
import { redact } from './redact.mjs';

export const SUPPORTED_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Redact every string inside a JSON value. */
function redactDeep(value) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (isObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactDeep(item)]),
    );
  return value;
}

const errorResponse = (id, code, message) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

/** Minimal JSON Schema check for the subset the tools use. Returns an error text or null. */
export function checkInput(schema, value, path = 'arguments') {
  if (!schema) return null;
  const type = schema.type;
  const kind = Array.isArray(value)
    ? 'array'
    : value === null
      ? 'null'
      : typeof value;
  if (type === 'integer' ? !Number.isInteger(value) : type && kind !== type)
    return `${path}: expected ${type}, got ${kind}`;
  if (schema.enum && !schema.enum.includes(value))
    return `${path}: expected one of ${schema.enum.join(', ')}`;
  if (typeof value === 'string') {
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      return `${path}: longer than ${schema.maxLength} characters`;
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      return `${path}: does not match ${schema.pattern}`;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      return `${path}: below ${schema.minimum}`;
    if (schema.maximum !== undefined && value > schema.maximum)
      return `${path}: above ${schema.maximum}`;
  }
  if (type === 'array') {
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      return `${path}: more than ${schema.maxItems} items`;
    for (const [index, item] of value.entries()) {
      const problem = checkInput(schema.items, item, `${path}[${index}]`);
      if (problem) return problem;
    }
  }
  if (type === 'object') {
    for (const key of schema.required ?? [])
      if (value[key] === undefined) return `${path}.${key}: required`;
    for (const [key, item] of Object.entries(value)) {
      const sub = schema.properties?.[key];
      if (!sub) {
        if (schema.additionalProperties === false)
          return `${path}.${key}: unknown property`;
        continue;
      }
      const problem = checkInput(sub, item, `${path}.${key}`);
      if (problem) return problem;
    }
  }
  return null;
}

/**
 * `tools`: [{ name, description, inputSchema, outputSchema?, annotations, handler(args) }]. A handler returns the
 * structured result (a plain object) or throws ToolError for a failure the agent should read.
 */
export function createProtocol({ tools, version, log = () => {} }) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  const listing = tools.map(
    ({ name, title, description, inputSchema, outputSchema, annotations }) => ({
      name,
      ...(title ? { title } : {}),
      description,
      inputSchema,
      ...(outputSchema ? { outputSchema } : {}),
      annotations,
    }),
  );

  const toolFailure = (text) => ({
    content: [{ type: 'text', text: redact(text) }],
    isError: true,
  });

  async function callTool(params) {
    if (!isObject(params) || typeof params.name !== 'string')
      throw new ParamsError('tools/call needs params.name (a string)');
    const tool = byName.get(params.name);
    if (!tool) throw new ParamsError(`unknown tool "${params.name}"`);
    const args = params.arguments ?? {};
    if (!isObject(args))
      throw new ParamsError('params.arguments must be an object');
    const problem = checkInput(tool.inputSchema, args);
    if (problem) return toolFailure(`invalid arguments: ${problem}`);
    try {
      const data = await tool.handler(args);
      const safe = redactDeep(data);
      return {
        content: [{ type: 'text', text: JSON.stringify(safe, null, 2) }],
        structuredContent: safe,
      };
    } catch (error) {
      if (error instanceof ToolError) return toolFailure(error.message);
      log(`tool ${tool.name} crashed: ${error.stack ?? error}`);
      return toolFailure(`internal error in ${tool.name}: ${error.message}`);
    }
  }

  /** Answer one parsed message. Returns the response object, or null for a notification. */
  async function handle(message) {
    if (
      !isObject(message) ||
      message.jsonrpc !== '2.0' ||
      typeof message.method !== 'string'
    )
      return errorResponse(
        isObject(message) ? message.id : null,
        INVALID_REQUEST,
        'invalid JSON-RPC request',
      );
    const { id, method, params } = message;
    const isNotification = id === undefined;
    try {
      let result;
      switch (method) {
        case 'initialize': {
          const asked = isObject(params) ? params.protocolVersion : undefined;
          result = {
            protocolVersion: SUPPORTED_VERSIONS.includes(asked)
              ? asked
              : SUPPORTED_VERSIONS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'landing-factory', version },
          };
          break;
        }
        case 'ping':
          result = {};
          break;
        case 'tools/list':
          result = { tools: listing };
          break;
        case 'tools/call':
          result = await callTool(params);
          break;
        default:
          if (method.startsWith('notifications/')) return null;
          if (isNotification) return null;
          return errorResponse(
            id,
            METHOD_NOT_FOUND,
            `method not found: ${method}`,
          );
      }
      return isNotification ? null : { jsonrpc: '2.0', id, result };
    } catch (error) {
      if (isNotification) return null;
      if (error instanceof ParamsError)
        return errorResponse(id, INVALID_PARAMS, error.message);
      log(`internal error on ${method}: ${error.stack ?? error}`);
      return errorResponse(id, INTERNAL_ERROR, 'internal error');
    }
  }

  /** Answer one raw line: parse, handle (a batch too) and return the text to write, or null. */
  async function handleLine(line) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      return JSON.stringify(errorResponse(null, PARSE_ERROR, 'parse error'));
    }
    if (Array.isArray(parsed)) {
      if (!parsed.length)
        return JSON.stringify(
          errorResponse(null, INVALID_REQUEST, 'empty batch'),
        );
      const replies = (await Promise.all(parsed.map(handle))).filter(Boolean);
      return replies.length ? JSON.stringify(replies) : null;
    }
    const reply = await handle(parsed);
    return reply ? JSON.stringify(reply) : null;
  }

  return { handle, handleLine };
}

/** Read lines from `input`, write replies to `output`. Resolves when the input ends and all replies are written. */
export function serveStdio(protocol, input, output, log = () => {}) {
  const lines = createInterface({ input, crlfDelay: Infinity });
  const pending = new Set();
  lines.on('line', (line) => {
    if (!line.trim()) return;
    const work = protocol
      .handleLine(line)
      .then((text) => {
        if (text) output.write(`${text}\n`);
      })
      .catch((error) => log(`fatal handler error: ${error.stack ?? error}`))
      .finally(() => pending.delete(work));
    pending.add(work);
  });
  return new Promise((resolve) => {
    lines.on('close', () => Promise.allSettled([...pending]).then(resolve));
  });
}
