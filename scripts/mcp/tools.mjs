// The tools the MCP server offers. Readers carry readOnlyHint; writers carry destructiveHint: false.
// Job tools start background jobs from the fixed command table (commands.mjs) and return at once.
import {
  briefInit,
  briefMissing,
  briefSummary,
  briefUpdate,
  briefValidate,
  getLanding,
  listLandings,
  readQa,
  readReport,
} from './landings.mjs';
import { MAX_TAIL_LINES } from './jobs.mjs';
import { QA_SKIPS } from './commands.mjs';
import { assertSlug } from './paths.mjs';

const READ = { readOnlyHint: true, openWorldHint: false };
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
const JOB = { ...WRITE, openWorldHint: true };

const str = (description, extra = {}) => ({
  type: 'string',
  description,
  ...extra,
});
const slug = str(
  'Landing slug: lowercase letters, digits and single hyphens (folder under sites/).',
);
const obj = (properties, required = [], extra = {}) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
  ...extra,
});
const jobId = str('Job id returned by a job tool or list_jobs.');
const refs = {
  type: 'array',
  items: str('Pattern sheet slug'),
  maxItems: 3,
  description: 'Slugs of patterns/<slug>.md sheets to draw from (0 to 3).',
};
const model = str('Model id for claude -p (letters, digits, dots, hyphens).');
const niche = str(
  'What the landing is for, one line. Optional when the landing has a brief.',
  { maxLength: 500 },
);

/** `jobs` is a createJobs() instance, `root` the repository root the tools read. */
export function createTools({ root, jobs }) {
  const startJob = (kind) => (args) => jobs.start(kind, args);
  return [
    {
      name: 'list_landings',
      description:
        'List every landing under sites/ with its deploy target, brief presence, last run result and latest QA and report verdicts.',
      inputSchema: obj({}),
      annotations: READ,
      handler: () => ({ landings: listLandings(root) }),
    },
    {
      name: 'get_landing',
      description:
        'Describe one landing: target, brief summary, last run result and phase, run totals and usage, latest QA and report verdicts, preview URL if known.',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => getLanding(root, s),
    },
    {
      name: 'get_qa',
      description:
        'Latest QA result of a landing (verdict, failures, Lighthouse scores) from qa/<slug>/latest/report.json. Null with a reason when none exists.',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => readQa(root, s),
    },
    {
      name: 'get_report',
      description:
        'Latest landing report of a landing (security, performance, legal): verdict, counts and the items that did not pass. Null with a reason when none exists.',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => readReport(root, s),
    },
    {
      name: 'brief_init',
      description:
        'Create sites/<slug>/brief.json as an empty skeleton. Never overwrites an existing brief.',
      inputSchema: obj(
        { slug, niche, lang: str('Page language tag such as es or en.') },
        ['slug'],
      ),
      annotations: WRITE,
      handler: (args) => briefInit(root, args),
    },
    {
      name: 'brief_validate',
      description:
        'Validate a landing brief against the schema. Returns the errors with their field paths.',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => briefValidate(root, s),
    },
    {
      name: 'brief_missing',
      description:
        'List the brief fields still empty, required first, then recommended in interview order, each with a question hint.',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => briefMissing(root, s),
    },
    {
      name: 'brief_summary',
      description:
        'A short readable summary of the brief (assumed values are marked).',
      inputSchema: obj({ slug }, ['slug']),
      annotations: READ,
      handler: ({ slug: s }) => briefSummary(root, s),
    },
    {
      name: 'brief_update',
      description:
        'Deep-merge a patch into the brief (arrays are replaced) and save it only if the result validates. Identity, legal holder and AI-image consent can never be marked assumed.',
      inputSchema: obj(
        {
          slug,
          patch: {
            type: 'object',
            description: 'Fields to merge into brief.json.',
          },
          assumed: {
            type: 'array',
            description:
              'Values chosen for the customer: { field, reason } entries added to brief.assumed.',
            items: obj(
              {
                field: str('Field path, for example contact.hours'),
                reason: str('Why it was assumed'),
              },
              ['field', 'reason'],
            ),
          },
        },
        ['slug', 'patch'],
      ),
      annotations: WRITE,
      handler: (args) => briefUpdate(root, args),
    },
    {
      name: 'propose_landing',
      description:
        'Start a background job that runs the generation up to the proposal checkpoint (PROPOSAL.md for review). Returns a job id at once; follow it with get_job.',
      inputSchema: obj(
        {
          slug,
          niche,
          refs,
          lang: str('Page language tag such as es or en.'),
          model,
        },
        ['slug'],
      ),
      annotations: JOB,
      handler: startJob('propose'),
    },
    {
      name: 'generate_landing',
      description:
        'Start a background job for a full generation (--auto), or resume an approved proposal with resume: true. Takes 30 to 70 minutes and costs tokens. Returns a job id at once.',
      inputSchema: obj(
        {
          slug,
          resume: {
            type: 'boolean',
            description:
              'Continue an existing sites/<slug>/ (true after a proposal was reviewed).',
          },
          niche,
          refs,
          model,
          maxAttempts: {
            type: 'integer',
            minimum: 0,
            maximum: 20,
            description: 'QA fix attempts before the run fails (default 5).',
          },
        },
        ['slug'],
      ),
      annotations: JOB,
      handler: startJob('generate'),
    },
    {
      name: 'run_qa',
      description:
        'Start a background job that builds a landing and runs the QA checks. Returns a job id at once; read the outcome with get_qa.',
      inputSchema: obj(
        {
          slug,
          skip: {
            type: 'array',
            items: str('Check to skip', { enum: QA_SKIPS }),
            description: 'Checks to skip.',
          },
        },
        ['slug'],
      ),
      annotations: JOB,
      handler: startJob('qa'),
    },
    {
      name: 'run_report',
      description:
        'Start a background job that writes the landing report (static checks; add an https url for the live checks too). Returns a job id at once; read the outcome with get_report.',
      inputSchema: obj(
        { slug, url: str('Deployed URL, https:// only, for the live checks.') },
        ['slug'],
      ),
      annotations: JOB,
      handler: startJob('report'),
    },
    {
      name: 'get_job',
      description:
        'State of a job: running, passed, failed, cancelled or lost, with phase, elapsed time, exit code, result and usage.',
      inputSchema: obj({ id: jobId }, ['id']),
      annotations: READ,
      handler: ({ id }) => jobs.get(id),
    },
    {
      name: 'list_jobs',
      description:
        'List jobs, newest first, optionally filtered by state or slug.',
      inputSchema: obj({
        state: str('Only jobs in this state', {
          enum: ['running', 'passed', 'failed', 'cancelled', 'lost'],
        }),
        slug: str('Only jobs of this landing'),
      }),
      annotations: READ,
      handler: ({ state, slug: s }) => {
        if (s !== undefined) assertSlug(s);
        return { jobs: jobs.list({ state, slug: s }) };
      },
    },
    {
      name: 'tail_job_log',
      description: `The last lines of a job's log (default 50, at most ${MAX_TAIL_LINES}), with credentials masked.`,
      inputSchema: obj(
        {
          id: jobId,
          lines: { type: 'integer', minimum: 1, maximum: MAX_TAIL_LINES },
        },
        ['id'],
      ),
      annotations: READ,
      handler: ({ id, lines }) => jobs.tail(id, lines),
    },
    {
      name: 'cancel_job',
      description:
        'Stop a running job: SIGTERM to its process group, SIGKILL after a grace period. The state becomes cancelled once it has stopped.',
      inputSchema: obj({ id: jobId }, ['id']),
      annotations: WRITE,
      handler: ({ id }) => jobs.cancel(id),
    },
  ];
}
