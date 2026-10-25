// The files of a build: a deterministic listing with sizes and SHA-1 digests (Vercel needs them, the plans print them).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export class BuildMissing extends Error {}

/** Every file under `dir` as { path (posix, relative), size, sha1 }, sorted by path. Symbolic links are refused. */
export function listBuild(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    throw new BuildMissing(
      `${dir} does not exist; build the site first (npm run build -w site-<slug>)`,
    );
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(
          `${relative(dir, full)} is a symbolic link; the build must hold plain files`,
        );
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const bytes = readFileSync(full);
        out.push({
          path: relative(dir, full).split(sep).join('/'),
          size: bytes.length,
          sha1: createHash('sha1').update(bytes).digest('hex'),
        });
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export const totalBytes = (files) => files.reduce((sum, f) => sum + f.size, 0);

export const formatBytes = (n) =>
  n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;
