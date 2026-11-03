// A bounded wait for a new deployment's certificate: a fresh Pages project answers TLS errors for about two
// minutes after the first deploy. The live checks run unchanged afterwards, so this never turns a failure into a pass.
import { request, sleep } from './http.mjs';

export const WAIT_TLS_INTERVAL_MS = 10_000;

/**
 * Request the home page of `baseUrl`'s origin until it answers or `seconds` run out.
 * `now` returns milliseconds. Returns { waitedMs, attempts, answered }. Logs one line per failed attempt
 * (the error only, never a body).
 */
export async function waitForTls({
  baseUrl,
  seconds,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
  sleepFn = sleep,
  now = () => Date.now(),
  log = (line) => console.error(line),
  intervalMs = WAIT_TLS_INTERVAL_MS,
}) {
  const origin = new URL(baseUrl).origin;
  const host = new URL(baseUrl).host;
  const start = now();
  const deadline = start + seconds * 1000;
  let attempts = 0;
  for (;;) {
    attempts += 1;
    const answer = await request(`${origin}/`, {
      timeoutMs,
      fetchImpl,
      retries: 0,
    });
    if (answer.ok) return { waitedMs: now() - start, attempts, answered: true };
    log(
      `[report] waiting for TLS on ${host}: attempt ${attempts}, ${answer.error}`,
    );
    if (now() + intervalMs > deadline)
      return { waitedMs: now() - start, attempts, answered: false };
    await sleepFn(intervalMs);
  }
}
