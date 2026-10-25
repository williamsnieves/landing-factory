// Masks anything shaped like a credential in text the server returns (log excerpts, error messages).
// Reuses the landing report's provider patterns and mask(), and also replaces the exact value of any
// environment variable whose name looks sensitive.
import { SECRET_PATTERNS } from '../report/source-scan.mjs';
import { mask } from '../report/mask.mjs';

const SENSITIVE_NAME = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)/i;
const GENERIC =
  /\b((?:api[_-]?key|token|secret|password)\s*[=:]\s*)(['"]?)([^\s'"]{8,})\2/gi;

/** Environment values worth hiding: sensitive names with a value of 8+ characters. */
export function sensitiveValues(env = process.env) {
  return Object.entries(env)
    .filter(
      ([name, value]) =>
        SENSITIVE_NAME.test(name) && value && value.length >= 8,
    )
    .map(([, value]) => value)
    .sort((a, b) => b.length - a.length);
}

export function redact(text, env = process.env) {
  let out = String(text ?? '');
  for (const value of sensitiveValues(env))
    out = out.split(value).join(mask(value));
  for (const [, re] of SECRET_PATTERNS)
    out = out.replace(new RegExp(re.source, re.flags), (m) => mask(m));
  return out.replace(
    GENERIC,
    (_, lead, quote, value) => `${lead}${quote}${mask(value)}${quote}`,
  );
}
