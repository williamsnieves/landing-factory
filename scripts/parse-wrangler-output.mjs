#!/usr/bin/env node
// Extracts the deployment URL and branch alias URL from a `wrangler pages deploy` run.
//
// Primary source: the ND-JSON file wrangler writes when WRANGLER_OUTPUT_FILE_PATH is set
// (entries `pages-deploy` with `url` and `pages-deploy-detailed` with `url` + `alias`).
// Fallback: scan the captured stdout for *.pages.dev URLs.
//
// Usage: node scripts/parse-wrangler-output.mjs <output.ndjson> [stdout.log]
// Prints `url=...` and `alias=...` lines (GITHUB_OUTPUT format); a missing value is left empty.
import { existsSync, readFileSync } from 'node:fs';

export function parseWranglerOutput(ndjson = '', stdout = '') {
  let url = '';
  let alias = '';
  for (const line of ndjson.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      entry.type === 'pages-deploy' ||
      entry.type === 'pages-deploy-detailed'
    ) {
      if (entry.url) url = entry.url;
    }
    if (entry.type === 'pages-deploy-detailed' && entry.alias)
      alias = entry.alias;
  }
  if (!url || !alias) {
    const found = [
      ...new Set(stdout.match(/https:\/\/[a-z0-9.-]+\.pages\.dev/gi) ?? []),
    ];
    if (!url && found[0]) url = found[0];
    if (!alias) {
      // The deployment URL is `<hash>.<project>.pages.dev`; the alias is any other URL.
      alias = found.find((u) => u !== url) ?? '';
    }
  }
  return { url, alias };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [ndjsonPath, stdoutPath] = process.argv.slice(2);
  const read = (p) => (p && existsSync(p) ? readFileSync(p, 'utf8') : '');
  const { url, alias } = parseWranglerOutput(
    read(ndjsonPath),
    read(stdoutPath),
  );
  console.log(`url=${url}`);
  console.log(`alias=${alias}`);
}
