#!/usr/bin/env bash
# Generate a landing with one command: preflight, scaffold sites/<slug>/, then run the /new-landing skill
# non-interactively with `claude -p`. Run `scripts/new-landing.sh --help` for the options.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/new-landing.sh <slug> (--niche "<niche>" | --brief <file>) [options]

Generates sites/<slug>/ from a niche or a customer brief: preflight, `npm run new-site`, `npm install`, then
`claude -p "/new-landing ..."` (headless Claude Code). Output goes to the terminal and to
sites/<slug>/.run.log. Without --auto the run stops after the proposal so you can review it.

  <slug>                  lowercase letters, digits, single hyphens (also the folder under sites/)
  --niche "<text>"        what the landing is for, in your words (required unless there is a brief)
  --brief <file>          a customer brief (JSON, see scripts/brief.mjs and the /brief-intake skill). It is validated
                          first (exit 1 with the validator's errors, nothing created), copied to sites/<slug>/brief.json
                          with the local asset files it names, and read by every phase. An existing
                          sites/<slug>/brief.json is used the same way without the flag. With a brief --niche is
                          optional (the skill uses business.description) and --lang defaults to the brief's language.
  --refs a,b              slugs of patterns/<slug>.md sheets to draw from (0-3, optional)
  --sources a,b           image sources: commons (default) and/or met (The Met Open Access, public domain;
                          for historical or cultural niches). Preflight checks their hosts.
  --auto                  do not stop at the proposal checkpoint; build, QA and finish
  --dry-run               stop after PROPOSAL.md, design-system/<slug>/MASTER.md and tokens.css
  --max-attempts N        QA fix attempts before the run fails (default 5; 0 fails at the first red QA)
  --model <id>            model for claude -p (default: the CLI's default)
  --lang <tag>            language of the page (default: the brief's language, else es); with --langs, the default locale
  --langs <a,b>           a multi-locale landing (Astro i18n routing): two or more lowercase language tags, for example
                          en,es. The default locale is --lang, else the first. A brief with `languages` of two or more
                          does this on its own; the copy is then written in every locale.
  --title "<text>"        working title for the placeholder page (default: the slug)
  --resume                continue an existing sites/<slug>/ (skips preflight slug check, scaffold and install)
  --directions            build 2 or 3 visual directions (a hero and one section each, noindex pages at /directions/<id>/)
                          instead of the landing, record them in directions.json and DIRECTIONS.md, run QA and stop with
                          "Result: directions". The customer picks one: node scripts/directions.mjs choose ...
  --count 2|3             how many directions (default 3; only with --directions)
  --help                  show this help

Directions flow: run with --directions, send the customer the preview URLs of the site's branch, record the
choice with `node scripts/directions.mjs choose --site <slug> --direction <id> [--notes "..."]`, then continue with
--resume --auto. A resume on a site with directions.json and no recorded choice is refused (exit 1).

Review flow: run without --auto, read sites/<slug>/PROPOSAL.md, edit it if needed, then continue with
  scripts/new-landing.sh <slug> --niche "<niche>" --resume --auto   (or --brief sites/<slug>/brief.json)

Exit codes: 0 finished as asked (checkpoint reached, dry run done, or passed), 1 failed (preflight, QA
attempts exhausted, claude error), 2 bad usage.

Usage: claude runs with --output-format stream-json; the readable log is kept, the run's tokens and cost go to
sites/<slug>/.run-usage.json and to a "Usage:" line at the end of RUN.md (or "not reported").

Testing: LANDING_FACTORY_ROOT=<dir> creates and reads sites/<slug> in <dir> instead of this repo;
NEW_LANDING_SKIP=preflight,install,final-check skips those steps (used by tests/new-landing.test.mjs); the brief
commands honor LANDING_FACTORY_ROOT too.
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
LANG_SET=0
LANGS_TAGS=""
TITLE=""
SOURCES=""
BRIEF=""
DIRECTIONS=0
COUNT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --help | -h) usage; exit 0 ;;
    --niche) [ $# -ge 2 ] || die_usage "--niche needs a value"; NICHE="$2"; shift 2 ;;
    --refs) [ $# -ge 2 ] || die_usage "--refs needs a value"; REFS="$2"; shift 2 ;;
    --max-attempts) [ $# -ge 2 ] || die_usage "--max-attempts needs a value"; MAX_ATTEMPTS="$2"; shift 2 ;;
    --model) [ $# -ge 2 ] || die_usage "--model needs a value"; MODEL="$2"; shift 2 ;;
    --lang) [ $# -ge 2 ] || die_usage "--lang needs a value"; LANG_TAG="$2"; LANG_SET=1; shift 2 ;;
    --langs) [ $# -ge 2 ] || die_usage "--langs needs a value"; LANGS_TAGS="$2"; shift 2 ;;
    --brief) [ $# -ge 2 ] || die_usage "--brief needs a value"; BRIEF="$2"; shift 2 ;;
    --title) [ $# -ge 2 ] || die_usage "--title needs a value"; TITLE="$2"; shift 2 ;;
    --sources) [ $# -ge 2 ] || die_usage "--sources needs a value"; SOURCES="$2"; shift 2 ;;
    --count) [ $# -ge 2 ] || die_usage "--count needs a value"; COUNT="$2"; shift 2 ;;
    --directions) DIRECTIONS=1; shift ;;
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
if [ -n "$BRIEF" ]; then
  [ -f "$BRIEF" ] || die_usage "--brief $BRIEF does not exist"
  BRIEF="$(cd "$(dirname "$BRIEF")" && pwd)/$(basename "$BRIEF")"
fi
[[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || die_usage "--max-attempts must be a non-negative integer, got \"$MAX_ATTEMPTS\""
[[ "$LANG_TAG" =~ ^[a-z]{2,3}(-[A-Za-z0-9]+)*$ ]] || die_usage "--lang must be a language tag such as es or en, got \"$LANG_TAG\""
if [ -n "$COUNT" ]; then
  [ "$DIRECTIONS" -eq 1 ] || die_usage "--count only goes with --directions"
  [[ "$COUNT" =~ ^[23]$ ]] || die_usage "--count must be 2 or 3, got \"$COUNT\""
fi
[ "$DIRECTIONS" -eq 0 ] || [ "$DRY_RUN" -eq 0 ] || die_usage "--directions cannot be combined with --dry-run"
[ -z "$LANGS_TAGS" ] || [[ "$LANGS_TAGS" =~ ^[a-z]{2,3}(-[a-z0-9]+)*(,[a-z]{2,3}(-[a-z0-9]+)*)+$ ]] || die_usage "--langs takes two or more comma-separated lowercase language tags such as en,es, got \"$LANGS_TAGS\""
[ -z "$SOURCES" ] || [[ "$SOURCES" =~ ^(commons|met)(,(commons|met))*$ ]] || die_usage "--sources takes a comma list of commons, met, got \"$SOURCES\""
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
# A brief comes from --brief or from an existing sites/<slug>/brief.json; with one, --niche is optional.
HAS_BRIEF=0
if [ -n "$BRIEF" ] || [ -f "$SITE_DIR/brief.json" ]; then HAS_BRIEF=1; fi
if [ -n "${NICHE//[[:space:]]/}" ]; then
  case "$NICHE" in *$'\n'*) die_usage "--niche must be a single line" ;; esac
else
  NICHE=""
  [ "$HAS_BRIEF" -eq 1 ] || die_usage "--niche \"<text>\" or --brief <file> is required"
fi
skipped() { case ",${NEW_LANDING_SKIP:-}," in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

if [ "$RESUME" -eq 1 ]; then
  [ -f "$SITE_DIR/package.json" ] || die_usage "--resume needs an existing $SITE_DIR (no package.json found)"
fi

# A site with visual directions builds only after the customer's choice is recorded.
if [ "$RESUME" -eq 1 ] && [ "$DIRECTIONS" -eq 0 ] && [ -f "$SITE_DIR/directions.json" ]; then
  has_choice="$(node -e 'try { const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(d && d.choice ? "yes" : "no"); } catch { process.stdout.write("no"); }' "$SITE_DIR/directions.json")"
  if [ "$has_choice" != "yes" ]; then
    echo "new-landing: $SITE_DIR/directions.json has no recorded choice; the build waits for the customer." >&2
    echo "Record it with: node scripts/directions.mjs choose --site $SLUG --direction <id> [--notes \"...\"]" >&2
    exit 1
  fi
fi

# 0. The brief, when there is one, must be valid before anything else runs (nothing is created, claude is not started).
if [ -n "$BRIEF" ]; then
  node scripts/brief.mjs validate --file "$BRIEF" || { echo "new-landing: the brief is invalid; nothing was created" >&2; exit 1; }
  BRIEF_FILE="$BRIEF"
elif [ "$HAS_BRIEF" -eq 1 ]; then
  node scripts/brief.mjs validate --site "$SLUG" || { echo "new-landing: $SITE_DIR/brief.json is invalid; nothing was changed" >&2; exit 1; }
  BRIEF_FILE="$SITE_DIR/brief.json"
fi
if [ "$HAS_BRIEF" -eq 1 ] && [ "$LANG_SET" -eq 0 ]; then
  brief_lang="$(node -e 'try { process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).language || "")); } catch {}' "$BRIEF_FILE")"
  [ -z "$brief_lang" ] || LANG_TAG="$brief_lang"
  [[ "$LANG_TAG" =~ ^[a-z]{2,3}(-[A-Za-z0-9]+)*$ ]] || die_usage "the brief's language \"$LANG_TAG\" is not a language tag"
fi

# A brief with two or more languages makes a multi-locale landing (unless --langs was given).
if [ "$HAS_BRIEF" -eq 1 ] && [ -z "$LANGS_TAGS" ]; then
  LANGS_TAGS="$(node -e 'try { const b = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const l = [...new Set((b.languages || []).map(String))]; if (l.length > 1) process.stdout.write(l.join(",")); } catch {}' "$BRIEF_FILE")"
fi

# 1. Preflight: hosts, Chromium, free slug. Nothing is created before it passes.
if skipped preflight; then
  echo "new-landing: preflight skipped (NEW_LANDING_SKIP)"
elif [ "$RESUME" -eq 1 ]; then
  node scripts/preflight.mjs ${SOURCES:+--sources "$SOURCES"} || { echo "new-landing: preflight failed; nothing was changed" >&2; exit 1; }
else
  node scripts/preflight.mjs --slug "$SLUG" ${SOURCES:+--sources "$SOURCES"} || { echo "new-landing: preflight failed; nothing was created" >&2; exit 1; }
fi

# 2. Scaffold the site and register the workspace.
if [ "$RESUME" -eq 0 ]; then
  scaffold=(npm run new-site -- "$SLUG" --lang "$LANG_TAG")
  [ -z "$LANGS_TAGS" ] || scaffold+=(--langs "$LANGS_TAGS")
  [ -z "$TITLE" ] || scaffold+=(--title "$TITLE")
  [ ! -d "$SITE_DIR" ] || scaffold+=(--allow-existing-docs)
  "${scaffold[@]}"
  if skipped install; then
    echo "new-landing: npm install skipped (NEW_LANDING_SKIP)"
  else
    npm install --no-audit --no-fund
  fi
fi

# 2b. Put the brief (and the local asset files it names) into the site: sites/<slug>/brief.json.
if [ -n "$BRIEF" ]; then
  node scripts/brief.mjs import --file "$BRIEF" --site "$SLUG" || { echo "new-landing: could not import the brief" >&2; exit 1; }
fi

# 3. Run the skill. The prompt carries every option; the skill reads them from its arguments.
quoted_niche="${NICHE//\"/\\\"}"
PROMPT="/new-landing $SLUG"
[ -z "$NICHE" ] || PROMPT+=" --niche \"$quoted_niche\""
[ "$HAS_BRIEF" -eq 0 ] || PROMPT+=" --brief $SITE_DIR/brief.json"
[ -z "$REFS" ] || PROMPT+=" --refs $REFS"
[ -z "$SOURCES" ] || PROMPT+=" --sources $SOURCES"
[ "$AUTO" -eq 0 ] || PROMPT+=" --auto"
[ "$DRY_RUN" -eq 0 ] || PROMPT+=" --dry-run"
[ "$RESUME" -eq 0 ] || PROMPT+=" --resume"
[ "$DIRECTIONS" -eq 0 ] || PROMPT+=" --directions"
[ -z "$COUNT" ] || PROMPT+=" --count $COUNT"
PROMPT+=" --max-attempts $MAX_ATTEMPTS --lang $LANG_TAG"
[ -z "$LANGS_TAGS" ] || PROMPT+=" --langs $LANGS_TAGS"

CLAUDE_ARGS=(-p "$PROMPT" --permission-mode acceptEdits)
[ -z "$MODEL" ] || CLAUDE_ARGS+=(--model "$MODEL")
# Structured output: scripts/lib/claude-stream.mjs turns it back into the readable log and records the usage.
CLAUDE_ARGS+=(--output-format stream-json --verbose)

# Headless runs ignore a project's settings.json allow list until the folder is trusted
# interactively, so pass the same reviewed list explicitly (plus the skill and subagent tools).
ALLOWED_TOOLS="$(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const allow = (s.permissions && s.permissions.allow) || [];
  process.stdout.write([...allow, "Skill", "Agent"].join("\n"));
' "$ROOT/.claude/settings.json")"
while IFS= read -r tool; do
  [ -z "$tool" ] || CLAUDE_ARGS+=(--allowedTools "$tool")
done <<< "$ALLOWED_TOOLS"

LOG="$SITE_DIR/.run.log"
mkdir -p "$SITE_DIR"
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) new-landing.sh $SLUG ==="
  echo "claude ${CLAUDE_ARGS[*]}"
} >> "$LOG"

USAGE_FILE="$SITE_DIR/.run-usage.json"
rm -f "$USAGE_FILE"
echo "new-landing: running claude for $SLUG (log: $LOG)"
set +e
# Never cut off subagents or commands the run still waits on (claude -p stops background
# work 10 minutes after the last turn by default). The filter never fails; PIPESTATUS[0] is claude's own status.
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude "${CLAUDE_ARGS[@]}" 2>&1 \
  | node "$ROOT/scripts/lib/claude-stream.mjs" --usage "$USAGE_FILE" | tee -a "$LOG"
claude_status="${PIPESTATUS[0]}"
set -e

# Record the run's tokens and cost (or "not reported") at the end of RUN.md, under Totals.
if [ -f "$SITE_DIR/RUN.md" ]; then
  usage_line="$(node "$ROOT/scripts/lib/claude-stream.mjs" usage-line "$USAGE_FILE")"
  grep -q '^## Totals' "$SITE_DIR/RUN.md" || printf '\n## Totals\n' >> "$SITE_DIR/RUN.md"
  [ -z "$(tail -c1 "$SITE_DIR/RUN.md")" ] || printf '\n' >> "$SITE_DIR/RUN.md"
  printf '\n%s\n' "$usage_line" >> "$SITE_DIR/RUN.md"
  echo "new-landing: $usage_line"
fi
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
    if [ "$HAS_BRIEF" -eq 1 ]; then
      echo "  scripts/new-landing.sh $SLUG --brief $SITE_DIR/brief.json --resume --auto"
    else
      echo "  scripts/new-landing.sh $SLUG --niche \"$NICHE\" --resume --auto"
    fi
    ;;
  directions)
    if ! skipped final-check; then
      node scripts/directions.mjs check --site "$SLUG" || { echo "new-landing: the directions check failed" >&2; exit 1; }
    fi
    echo "new-landing: directions ready for $SLUG (see $SITE_DIR/DIRECTIONS.md). Push the branch for the preview URLs, then record the choice:"
    echo "  node scripts/directions.mjs choose --site $SLUG --direction <id> [--notes \"...\"]"
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
