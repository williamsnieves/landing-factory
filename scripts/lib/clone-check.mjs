// The checks every command that reads or writes a clone of an exported landing's repository makes first
// (scripts/sync-export.mjs and scripts/cms.mjs pull): the site is exported and not transferred, and the clone is
// the root of a clean work tree whose origin is the recorded repository. Read-only; throws Refused.
import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, statSync } from 'node:fs';

import {
  isTransferred,
  normalizeRepoUrl,
  readExportRecord,
} from './export-record.mjs';

export class Refused extends Error {}

const git = (dir, args) =>
  execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

/**
 * The export record of sites/<slug>. Throws Refused when it is unreadable, missing (`missingHint` ends the
 * message) or says the repository was transferred.
 */
export function requireManagedRecord(root, slug, missingHint) {
  let record;
  try {
    record = readExportRecord(root, slug);
  } catch (error) {
    throw new Refused(error.message);
  }
  if (!record)
    throw new Refused(
      `sites/${slug} is not exported (no EXPORTED.json): ${missingHint}`,
    );
  if (isTransferred(record))
    throw new Refused(
      `sites/${slug} was transferred to ${record.transferredTo}; the factory does nothing more with it`,
    );
  return record;
}

/**
 * Throws Refused unless `clone` is the root of a clean work tree whose origin is the recorded repository.
 * `flag` names the option the folder came from, for the messages.
 */
export function checkClone(clone, record, flag = '--into') {
  if (!existsSync(clone) || !statSync(clone).isDirectory())
    throw new Refused(`${flag} ${clone} is not a folder`);
  let top;
  try {
    top = git(clone, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    throw new Refused(`${clone} is not a git work tree`);
  }
  if (realpathSync(top) !== realpathSync(clone))
    throw new Refused(
      `${clone} is not the root of its work tree (the root is ${top}); pass the root of the clone`,
    );
  const wanted = normalizeRepoUrl(record.repository);
  if (!wanted)
    throw new Refused(
      `EXPORTED.json has no usable repository URL (${JSON.stringify(record.repository ?? null)})`,
    );
  let origin = '';
  try {
    origin = git(clone, ['config', '--get', 'remote.origin.url']).trim();
  } catch {
    // no origin: handled below
  }
  if (!origin)
    throw new Refused(
      `${clone} has no origin remote; expected ${record.repository}`,
    );
  if (normalizeRepoUrl(origin) !== wanted)
    throw new Refused(
      `the origin of ${clone} is ${normalizeRepoUrl(origin) ?? 'not a repository location'} but EXPORTED.json records ${wanted}; use a clone of the recorded repository`,
    );
  if (git(clone, ['status', '--porcelain']).trim())
    throw new Refused(
      `${clone} has uncommitted changes; commit, stash or discard them first`,
    );
}
