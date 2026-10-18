#!/usr/bin/env bash
# Generate a landing with one command: preflight, scaffold sites/<slug>/, then run the /new-landing skill
# non-interactively with `claude -p`. Run `scripts/new-landing.sh --help` for the options.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/new-landing.sh <slug> --niche "<niche>" [options]

Generates sites/<slug>/ from a niche: preflight, `npm run new-site`, `npm install`, then
`claude -p "/new-landing ..."` (headless Claude Code). Output goes to the terminal and to
sites/<slug>/.run.log. Without --auto the run stops after the proposal so you can review it.

  <slug>                  lowercase letters, digits, single hyphens (also the folder under sites/)
  --niche "<text>"        what the landing is for, in your words (required)
  --refs a,b              slugs of patterns/<slug>.md sheets to draw from (0-3, optional)
  --auto                  do not stop at the proposal checkpoint; build, QA and finish
  --dry-run               stop after PROPOSAL.md, design-system/<slug>/MASTER.md and tokens.css
  --max-attempts N        QA fix attempts before the run fails (default 5; 0 fails at the first red QA)
  --model <id>            model for claude -p (default: the CLI's default)
  --lang <tag>            language of the page (default es)
  --title "<text>"        working title for the placeholder page (default: the slug)
  --resume                continue an existing sites/<slug>/ (skips preflight slug check, scaffold and install)
  --help                  show this help

Review flow: run without --auto, read sites/<slug>/PROPOSAL.md, edit it if needed, then continue with
  scripts/new-landing.sh <slug> --niche "<niche>" --resume --auto

Exit codes: 0 finished as asked (checkpoint reached, dry run done, or passed), 1 failed (preflight, QA
attempts exhausted, claude error), 2 bad usage.

Testing: LANDING_FACTORY_ROOT=<dir> creates and reads sites/<slug> in <dir> instead of this repo;
NEW_LANDING_SKIP=preflight,install,final-check skips those steps (used by tests/new-landing.test.mjs).
Run from a terminal or a Claude session, not from GitHub Actions (it needs Claude Code credentials).
EOF
}

die_usage() {
  echo "new-landing: $1" >&2
  echo "Try: scripts/new-landing.sh --help" >&2
  exit 2
}

SLUG=""
NICHE=""
REFS=""
AUTO=0
DRY_RUN=0
RESUME=0
MAX_ATTEMPTS=5
MODEL=""
LANG_TAG="es"
TITLE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --help | -h) usage; exit 0 ;;
    --niche) [ $# -ge 2 ] || die_usage "--niche needs a value"; NICHE="$2"; shift 2 ;;
    --refs) [ $# -ge 2 ] || die_usage "--refs needs a value"; REFS="$2"; shift 2 ;;
    --max-attempts) [ $# -ge 2 ] || die_usage "--max-attempts needs a value"; MAX_ATTEMPTS="$2"; shift 2 ;;
    --model) [ $# -ge 2 ] || die_usage "--model needs a value"; MODEL="$2"; shift 2 ;;
    --lang) [ $# -ge 2 ] || die_usage "--lang needs a value"; LANG_TAG="$2"; shift 2 ;;
    --title) [ $# -ge 2 ] || die_usage "--title needs a value"; TITLE="$2"; shift 2 ;;
    --auto) AUTO=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --resume) RESUME=1; shift ;;
    -*) die_usage "unknown option $1" ;;
    *)
      [ -z "$SLUG" ] || die_usage "unexpected argument \"$1\" (the slug is already \"$SLUG\")"
      SLUG="$1"; shift ;;
  esac
done

[ -n "$SLUG" ] || die_usage "a site slug is required"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die_usage "invalid slug \"$SLUG\": use lowercase letters, digits and single hyphens"
[ -n "${NICHE//[[:space:]]/}" ] || die_usage "--niche \"<text>\" is required"
case "$NICHE" in *$'\n'*) die_usage "--niche must be a single line" ;; esac
[[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || die_usage "--max-attempts must be a non-negative integer, got \"$MAX_ATTEMPTS\""
[[ "$LANG_TAG" =~ ^[a-z]{2,3}(-[A-Za-z0-9]+)*$ ]] || die_usage "--lang must be a language tag such as es or en, got \"$LANG_TAG\""
if [ -n "$REFS" ]; then
  IFS=',' read -r -a REF_LIST <<< "$REFS"
  [ "${#REF_LIST[@]}" -le 3 ] || die_usage "--refs takes at most 3 pattern sheets"
  for ref in "${REF_LIST[@]}"; do
    [[ "$ref" =~ ^[a-z0-9_]+(-[a-z0-9]+)*$ ]] || die_usage "invalid sheet slug \"$ref\" in --refs"
    [ -f "$ROOT/patterns/$ref.md" ] || die_usage "patterns/$ref.md does not exist (run /analyze-reference first)"
  done
fi
command -v claude > /dev/null 2>&1 || die_usage "the claude CLI is not on PATH (install Claude Code first)"

cd "$ROOT"
# LANDING_FACTORY_ROOT (tests only) moves where sites/ lives; new-site and preflight honor it too.
if [ -n "${LANDING_FACTORY_ROOT:-}" ]; then SITE_DIR="$LANDING_FACTORY_ROOT/sites/$SLUG"; else SITE_DIR="sites/$SLUG"; fi
skipped() { case ",${NEW_LANDING_SKIP:-}," in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

if [ "$RESUME" -eq 1 ]; then
  [ -f "$SITE_DIR/package.json" ] || die_usage "--resume needs an existing $SITE_DIR (no package.json found)"
fi

# 1. Preflight: hosts, Chromium, free slug. Nothing is created before it passes.
if skipped preflight; then
  echo "new-landing: preflight skipped (NEW_LANDING_SKIP)"
elif [ "$RESUME" -eq 1 ]; then
  node scripts/preflight.mjs || { echo "new-landing: preflight failed; nothing was changed" >&2; exit 1; }
else
  node scripts/preflight.mjs --slug "$SLUG" || { echo "new-landing: preflight failed; nothing was created" >&2; exit 1; }
fi

# 2. Scaffold the site and register the workspace.
if [ "$RESUME" -eq 0 ]; then
  scaffold=(npm run new-site -- "$SLUG" --lang "$LANG_TAG")
  [ -z "$TITLE" ] || scaffold+=(--title "$TITLE")
  [ ! -d "$SITE_DIR" ] || scaffold+=(--allow-existing-docs)
  "${scaffold[@]}"
  if skipped install; then
    echo "new-landing: npm install skipped (NEW_LANDING_SKIP)"
  else
    npm install --no-audit --no-fund
  fi
fi

# 3. Run the skill. The prompt carries every option; the skill reads them from its arguments.
quoted_niche="${NICHE//\"/\\\"}"
PROMPT="/new-landing $SLUG --niche \"$quoted_niche\""
[ -z "$REFS" ] || PROMPT+=" --refs $REFS"
[ "$AUTO" -eq 0 ] || PROMPT+=" --auto"
[ "$DRY_RUN" -eq 0 ] || PROMPT+=" --dry-run"
[ "$RESUME" -eq 0 ] || PROMPT+=" --resume"
PROMPT+=" --max-attempts $MAX_ATTEMPTS --lang $LANG_TAG"

CLAUDE_ARGS=(-p "$PROMPT" --permission-mode acceptEdits)
[ -z "$MODEL" ] || CLAUDE_ARGS+=(--model "$MODEL")

LOG="$SITE_DIR/.run.log"
mkdir -p "$SITE_DIR"
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) new-landing.sh $SLUG ==="
  echo "claude ${CLAUDE_ARGS[*]}"
} >> "$LOG"

echo "new-landing: running claude for $SLUG (log: $LOG)"
set +e
claude "${CLAUDE_ARGS[@]}" 2>&1 | tee -a "$LOG"
claude_status="${PIPESTATUS[0]}"
set -e
if [ "$claude_status" -ne 0 ]; then
  echo "new-landing: claude exited with status $claude_status; see $LOG" >&2
  exit 1
fi

# 4. The skill records its outcome in RUN.md ("Result: ..."); the exit code follows it.
RESULT="$(sed -n 's/^Result: *\([a-z-]*\).*$/\1/p' "$SITE_DIR/RUN.md" 2> /dev/null | head -n 1)"
case "$RESULT" in
  passed)
    if [ "$AUTO" -eq 1 ] && [ "$DRY_RUN" -eq 0 ] && ! skipped final-check; then
      node scripts/check-landing.mjs --site "$SLUG" || { echo "new-landing: final check failed" >&2; exit 1; }
    fi
    echo "new-landing: $SLUG passed. Review $SITE_DIR/RUN.md, then commit and open a PR."
    ;;
  checkpoint)
    echo "new-landing: proposal ready for review: $SITE_DIR/PROPOSAL.md"
    echo "Edit it if needed, then continue with:"
    echo "  scripts/new-landing.sh $SLUG --niche \"$NICHE\" --resume --auto"
    ;;
  dry-run-done)
    echo "new-landing: dry run done: $SITE_DIR/PROPOSAL.md and design-system/$SLUG/MASTER.md"
    ;;
  failed)
    echo "new-landing: the run failed; remaining failures are listed in $SITE_DIR/RUN.md" >&2
    exit 1
    ;;
  *)
    echo "new-landing: the run ended without a result (RUN.md says \"${RESULT:-nothing}\"); see $LOG" >&2
    exit 1
    ;;
esac
