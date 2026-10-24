// Keeps deploy credentials out of everything the deploy prints. Secrets are read from the environment only;
// every text that may contain one (API errors, child-process output, plans) goes through `redact()`.
import { mask } from '../report/mask.mjs';

/** Environment variables that hold a deploy credential. */
export const SECRET_VARIABLES = [
  'VERCEL_TOKEN',
  'DEPLOY_SSH_KEY',
  'DEPLOY_FTP_PASSWORD',
  'CLOUDFLARE_API_TOKEN',
];

const PRIVATE_KEY_BLOCK =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;

/** The credential values present in `env` (trimmed, non-empty). */
export const secretValues = (env = process.env) =>
  SECRET_VARIABLES.map((name) => String(env[name] ?? '').trim()).filter(
    Boolean,
  );

/**
 * Text without any of the given secret values (exact replacement, line by line for multi-line keys),
 * without private key blocks and without `Bearer <token>` strings (masked with mask()).
 */
export function redact(text, secrets = []) {
  let out = String(text ?? '');
  out = out.replace(PRIVATE_KEY_BLOCK, '[redacted private key]');
  for (const secret of secrets.map(String).filter(Boolean)) {
    const parts = secret.includes('\n')
      ? secret.split(/\r?\n/).filter((line) => line.trim().length >= 8)
      : [secret];
    for (const part of [secret, ...parts])
      if (part) out = out.split(part).join('[redacted]');
  }
  return out.replace(BEARER, (match) => `Bearer ${mask(match.slice(7))}`);
}
