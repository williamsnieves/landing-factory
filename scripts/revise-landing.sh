#!/usr/bin/env bash
# Apply a customer's feedback to a built landing as targeted edits: one revision round, with the checks and a record.
# Runs the /revise-landing skill non-interactively with `claude -p`. Run `scripts/revise-landing.sh --help` for the options.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage: scripts/revise-landing.sh <slug> --feedback <file> [--restyle] [options]

Applies the customer's feedback (a text file, at most 4000 characters) to sites/<slug>/ as targeted edits, without
regenerating anything: `claude -p "/revise-landing <slug> --round N --feedback-file <file> ..."`. The skill updates
brief.json first when a customer fact changes, runs QA, the static report, the layout signature and check-landing,
and records the round in sites/<slug>/revisions.json (the script adds the usage). Notes of the latest round are in
sites/<slug>/REVISION.md; output also goes to sites/<slug>/.revise.log.

  <slug>                  the site under sites/
  --feedback <file>       the customer's feedback, as given (required; not empty, at most 4000 characters)
  --restyle               approve a new look: another palette and/or font pairing on the same layout (ui-ux-pro-max only;
                          tokens, MASTER.md and fonts change; sections, copy, images and motion stay)
  --max-attempts N        QA fix attempts before the round fails (default 5; 0 fails at the first red QA)
  --model <id>            model for claude -p (default: the CLI's default)
  --help                  show this help

Refused (exit 1): a missing site, a site transferred to its customer, a site with direction pages and no build, a site
without a finished build (RUN.md "Result: passed"). A round that asks for a different archetype or structure stops with
"Result: needs-rebuild" (exit 0): use scripts/new-landing.sh --directions or a new build. Without --restyle, feedback
that asks for another palette or font family stops with "Result: needs-restyle" (exit 0) and the command to run
again with --restyle. It never commits, pushes, deploys or syncs; to carry a passed round into the landing's
repository see node scripts/sync-export.mjs.

Exit codes: 0 passed, needs-rebuild or needs-restyle, 1 failed or refused, 2 bad usage (including an empty, too long
or missing feedback file).

Testing: LANDING_FACTORY_ROOT=<dir> reads sites/<slug> in <dir>; REVISE_LANDING_SKIP=final-check skips the final
check-landing run. Run from a terminal or a Claude session, not from GitHub Actions (it needs Claude Code credentials).
EOF
}

die_usage() {
  echo "revise-landing: $1" >&2
  echo "Try: scripts/revise-landing.sh --help" >&2
  exit 2
}

SLUG=""
FEEDBACK=""
MAX_ATTEMPTS=5
MODEL=""
RESTYLE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --help | -h) usage; exit 0 ;;
    --feedback) [ $# -ge 2 ] || die_usage "--feedback needs a value"; FEEDBACK="$2"; shift 2 ;;
    --max-attempts) [ $# -ge 2 ] || die_usage "--max-attempts needs a value"; MAX_ATTEMPTS="$2"; shift 2 ;;
    --restyle) RESTYLE=1; shift ;;
    --model) [ $# -ge 2 ] || die_usage "--model needs a value"; MODEL="$2"; shift 2 ;;
    -*) die_usage "unknown option $1" ;;
    *)
      [ -z "$SLUG" ] || die_usage "unexpected argument \"$1\" (the slug is already \"$SLUG\")"
      SLUG="$1"; shift ;;
  esac
done

[ -n "$SLUG" ] || die_usage "a site slug is required"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || die_usage "invalid slug \"$SLUG\": use lowercase letters, digits and single hyphens"
[ -n "$FEEDBACK" ] || die_usage "--feedback <file> is required"
[ -f "$FEEDBACK" ] || die_usage "--feedback $FEEDBACK is not a file"
[[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || die_usage "--max-attempts must be a non-negative integer, got \"$MAX_ATTEMPTS\""
[ -z "$MODEL" ] || [[ "$MODEL" =~ ^[a-z0-9.-]+$ ]] || die_usage "--model must match ^[a-z0-9.-]+\$, got \"$MODEL\""
FEEDBACK="$(cd "$(dirname "$FEEDBACK")" && pwd)/$(basename "$FEEDBACK")"
feedback_problem="$(node -e '
  const text = require("fs").readFileSync(process.argv[1], "utf8");
  const length = [...text].length;
  if (!text.trim()) process.stdout.write("is empty");
  else if (length > 4000) process.stdout.write("is longer than 4000 characters (" + length + ")");
' "$FEEDBACK")"
[ -z "$feedback_problem" ] || die_usage "--feedback $FEEDBACK $feedback_problem"
command -v claude > /dev/null 2>&1 || die_usage "the claude CLI is not on PATH (install Claude Code first)"

cd "$ROOT"
# LANDING_FACTORY_ROOT (tests only) moves where sites/ lives; the node helpers honor it too.
if [ -n "${LANDING_FACTORY_ROOT:-}" ]; then SITE_DIR="$LANDING_FACTORY_ROOT/sites/$SLUG"; else SITE_DIR="sites/$SLUG"; fi
skipped() { case ",${REVISE_LANDING_SKIP:-}," in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

# 1. Refusals: nothing is changed and claude is not started.
node scripts/revisions.mjs preflight --site "$SLUG" > /dev/null || { echo "revise-landing: refused; nothing was changed" >&2; exit 1; }
ROUND="$(node scripts/revisions.mjs next --site "$SLUG")" || { echo "revise-landing: revisions.json is invalid; nothing was changed" >&2; exit 1; }

# 2. Run the skill. The prompt carries the round number and the feedback path; the skill reads them from its arguments.
PROMPT="/revise-landing $SLUG --round $ROUND --feedback-file $FEEDBACK --max-attempts $MAX_ATTEMPTS"
[ "$RESTYLE" -eq 0 ] || PROMPT="$PROMPT --restyle"
CLAUDE_ARGS=(-p "$PROMPT" --permission-mode acceptEdits)
[ -z "$MODEL" ] || CLAUDE_ARGS+=(--model "$MODEL")
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

LOG="$SITE_DIR/.revise.log"
USAGE_FILE="$SITE_DIR/.run-usage.json"
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) revise-landing.sh $SLUG round $ROUND ==="
  echo "claude ${CLAUDE_ARGS[*]}"
} >> "$LOG"
# The notes file of the previous round must not be mistaken for this round's result.
rm -f "$SITE_DIR/REVISION.md" "$USAGE_FILE"
echo "revise-landing: running claude for $SLUG, round $ROUND (log: $LOG)"
set +e
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude "${CLAUDE_ARGS[@]}" 2>&1 \
  | node "$ROOT/scripts/lib/claude-stream.mjs" --usage "$USAGE_FILE" | tee -a "$LOG"
claude_status="${PIPESTATUS[0]}"
set -e
if [ "$claude_status" -ne 0 ]; then
  echo "revise-landing: claude exited with status $claude_status; see $LOG" >&2
  exit 1
fi

# 3. The skill records its outcome in REVISION.md ("Result: ...") and the round in revisions.json.
RESULT="$(sed -n 's/^Result: *\([a-z-]*\).*$/\1/p' "$SITE_DIR/REVISION.md" 2> /dev/null | head -n 1 || true)"
case "$RESULT" in
  failed)
    # A failed round is recorded too when the skill got that far; its absence is not an error here.
    node scripts/revisions.mjs attach-usage --site "$SLUG" --round "$ROUND" --usage "$USAGE_FILE" > /dev/null 2>&1 || true
    ;;
  passed | needs-rebuild | needs-restyle)
    node scripts/revisions.mjs attach-usage --site "$SLUG" --round "$ROUND" --usage "$USAGE_FILE" \
      || { echo "revise-landing: round $ROUND was not recorded correctly in $SITE_DIR/revisions.json" >&2; exit 1; }
    ;;
esac
case "$RESULT" in
  passed)
    if ! skipped final-check; then
      node scripts/check-landing.mjs --site "$SLUG" || { echo "revise-landing: final check failed" >&2; exit 1; }
    fi
    echo "revise-landing: round $ROUND of $SLUG passed. Review $SITE_DIR/REVISION.md; if the landing has its own repository, carry the round there with:"
    echo "  node scripts/sync-export.mjs --site $SLUG --into <clone>"
    ;;
  needs-rebuild)
    echo "revise-landing: round $ROUND of $SLUG needs a rebuild, not a revision: see $SITE_DIR/REVISION.md."
    echo "A person decides: scripts/new-landing.sh $SLUG --directions (a new look to choose from) or a new build."
    ;;
  needs-restyle)
    echo "revise-landing: round $ROUND of $SLUG needs a restyle (another palette or font family on the same layout): see $SITE_DIR/REVISION.md."
    echo "A person approves the new look by running again with --restyle:"
    echo "  scripts/revise-landing.sh $SLUG --restyle --feedback $FEEDBACK"
    ;;
  failed)
    echo "revise-landing: round $ROUND failed; see $SITE_DIR/REVISION.md" >&2
    exit 1
    ;;
  *)
    echo "revise-landing: the run ended without a result (REVISION.md says \"${RESULT:-nothing}\"); see $LOG" >&2
    exit 1
    ;;
esac
