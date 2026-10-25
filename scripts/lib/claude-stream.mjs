#!/usr/bin/env node
// Turns the `claude -p --output-format stream-json --verbose` event stream into the readable log new-landing.sh
// keeps, and records the run's usage.
//
//   claude -p ... --output-format stream-json --verbose 2>&1 | node scripts/lib/claude-stream.mjs --usage <file>
//   node scripts/lib/claude-stream.mjs usage-line <file>      prints the one-line summary for RUN.md Totals
//
// Readable form: the assistant's text as written, one `[tool] Name: detail` line per tool call, the final result text
// when it adds something, and `[claude] error: ...` when the run ended in an error. A line that is not JSON (stderr,
// a different format) is passed through unchanged, so a stream that cannot be parsed still ends up in the log.
// The final `result` event's usage and total_cost_usd go to the --usage file; without one the file says
// `{ "reported": false }`. The filter always exits 0: the exit code of claude is the caller's (PIPESTATUS).
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const clip = (text, max = 140) => {
  const one = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};

function toolDetail(input = {}) {
  const value =
    input.command ??
    input.file_path ??
    input.path ??
    input.pattern ??
    input.url ??
    input.description ??
    input.prompt ??
    input.skill;
  return clip(value ?? '');
}

/** Readable lines for one parsed event. */
export function describeEvent(event) {
  const lines = [];
  if (event?.type === 'assistant') {
    for (const block of event.message?.content ?? []) {
      if (block.type === 'text' && block.text?.trim())
        lines.push(block.text.trimEnd());
      else if (block.type === 'tool_use') {
        const detail = toolDetail(block.input);
        lines.push(
          detail ? `[tool] ${block.name}: ${detail}` : `[tool] ${block.name}`,
        );
      }
    }
  } else if (event?.type === 'result' && event.is_error) {
    lines.push(
      `[claude] error: ${event.subtype ?? 'unknown'}${event.result ? ` - ${clip(event.result, 300)}` : ''}`,
    );
  }
  return lines;
}

/** Usage record from a `result` event. */
export function usageFromResult(event) {
  const usage = event?.usage;
  if (!usage || typeof usage !== 'object') return { reported: false };
  return {
    reported: true,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    totalCostUsd:
      typeof event.total_cost_usd === 'number' ? event.total_cost_usd : null,
    durationMs:
      typeof event.duration_ms === 'number' ? event.duration_ms : null,
    numTurns: typeof event.num_turns === 'number' ? event.num_turns : null,
    recordedAt: new Date().toISOString(),
  };
}

/** One line for RUN.md Totals. */
export function usageLine(usage) {
  if (!usage?.reported)
    return 'Usage: not reported (Claude Code gave no usage for this run).';
  const n = (v) => Number(v ?? 0).toLocaleString('en-US');
  const parts = [
    `input ${n(usage.inputTokens)} tokens`,
    `output ${n(usage.outputTokens)}`,
    `cache write ${n(usage.cacheCreationTokens)}`,
    `cache read ${n(usage.cacheReadTokens)}`,
  ];
  if (usage.totalCostUsd !== null && usage.totalCostUsd !== undefined)
    parts.push(`cost $${usage.totalCostUsd.toFixed(4)} USD`);
  if (usage.numTurns !== null && usage.numTurns !== undefined)
    parts.push(`${usage.numTurns} turns`);
  return `Usage: ${parts.join(', ')} (reported by Claude Code).`;
}

/**
 * Process lines of the stream. `write(line)` receives each readable line; returns the usage record
 * (`{ reported: false }` when no result event carried one).
 */
export async function processStream(input, write) {
  let usage = { reported: false };
  let lastText = null;
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    let event = null;
    if (line.trim().startsWith('{')) {
      try {
        event = JSON.parse(line);
      } catch {
        event = null;
      }
    }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      write(line);
      continue;
    }
    if (event.type === 'result') {
      usage = usageFromResult(event);
      for (const text of describeEvent(event)) write(text);
      if (
        !event.is_error &&
        typeof event.result === 'string' &&
        event.result.trim() &&
        event.result.trim() !== lastText
      )
        write(event.result.trimEnd());
      continue;
    }
    for (const text of describeEvent(event)) {
      write(text);
      if (event.type === 'assistant' && !text.startsWith('[tool] '))
        lastText = text.trim();
    }
  }
  return usage;
}

function writeAtomic(path, data) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

async function main(argv) {
  if (argv[0] === 'usage-line') {
    let usage = { reported: false };
    try {
      usage = JSON.parse(readFileSync(argv[1], 'utf8'));
    } catch {
      // missing or unreadable: not reported
    }
    process.stdout.write(`${usageLine(usage)}\n`);
    return;
  }
  const at = argv.indexOf('--usage');
  const usagePath = at >= 0 ? argv[at + 1] : null;
  let usage = { reported: false };
  try {
    usage = await processStream(process.stdin, (line) =>
      process.stdout.write(`${line}\n`),
    );
  } catch (error) {
    process.stderr.write(`claude-stream: ${error.message}\n`);
  }
  if (usagePath) writeAtomic(usagePath, usage);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).then(
    () => process.exit(0),
    () => process.exit(0),
  );
}
