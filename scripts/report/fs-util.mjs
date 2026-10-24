// File walking and text helpers shared by the report modules.
import { lstatSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Every file under `root` as { rel (forward slashes), abs, size }. Symlinks are listed but not followed.
 * `skipDirs` are directory names skipped anywhere in the tree.
 */
export function walkFiles(root, { skipDirs = [] } = {}) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) walk(abs);
      } else if (entry.isFile()) {
        files.push({
          rel: abs
            .slice(root.length + 1)
            .split(sep)
            .join('/'),
          abs,
          size: lstatSync(abs).size,
        });
      }
    }
  };
  walk(root);
  return files.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

export const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;
