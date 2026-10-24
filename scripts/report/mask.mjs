// The only way a matched secret may appear in any output (console, report.json, report.md).

/** First four characters and the length: `ghp_... (40 chars)`. Never the whole value. */
export function mask(value) {
  const text = String(value ?? '');
  if (!text) return '(empty)';
  return `${text.slice(0, 4)}... (${text.length} chars)`;
}
