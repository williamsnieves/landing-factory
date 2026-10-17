#!/usr/bin/env bash
# Install or verify the agent tooling for Claude Code (design skills, MCP config).
#
#   bash scripts/setup-agent.sh            install: fetch anything missing, disable telemetry
#   bash scripts/setup-agent.sh --verify   fast, offline, read-only check
#   FORCE=1 bash scripts/setup-agent.sh    re-fetch every skill from the pinned source
#
# Pins live in agent-tooling.lock.json. Skills are vendored (committed) under
# .claude/skills/, so install is normally a no-op apart from the telemetry opt-out.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/agent-tooling.lock.json"
MODE="install"
case "${1:-}" in
  ""|install) MODE="install" ;;
  --verify|verify) MODE="verify" ;;
  -h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}"; exit 0 ;;
  *) echo "setup-agent: unknown argument '$1' (use install or --verify)" >&2; exit 2 ;;
esac

errors=()
TMP_DIRS=()
cleanup() { [ "${#TMP_DIRS[@]}" -eq 0 ] || rm -rf "${TMP_DIRS[@]}"; }
trap cleanup EXIT
fail() { errors+=("$1"); }

command -v node >/dev/null 2>&1 || { echo "setup-agent: missing required binary: node" >&2; exit 1; }
[ -f "$LOCK" ] || { echo "setup-agent: missing agent-tooling.lock.json" >&2; exit 1; }

# Print "name|path|skillFile|commit|repo|subpath|keep|installer" per tool.
tools() {
  node -e '
    const l = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const t of l.tools) {
      const f = t.fetch || {};
      console.log([t.name, t.path, t.skillFile, t.commit || "", f.repo || "", f.subpath || "", t.keep || "", t.installer || ""].join("|"));
    }' "$LOCK"
}

validate_lock() {
  node -e '
    const l = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const need = ["name", "source", "license", "licenseFiles", "installMethod", "installedAt", "path", "skillFile"];
    const bad = [];
    for (const t of l.tools || []) {
      for (const k of need) if (!t[k]) bad.push(`${t.name || "?"}: missing "${k}"`);
      if (!t.version && !t.commit) bad.push(`${t.name}: needs version or commit`);
    }
    if (!(l.mcpServers || []).length) bad.push("no mcpServers");
    if (bad.length) { console.error(bad.join("\n")); process.exit(1); }' "$LOCK"
}

mcp_pin() { # prints the playwright version pinned in the lock
  node -e 'const l=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(l.mcpServers.find(s=>s.name==="playwright").version)' "$LOCK"
}

verify() {
  validate_lock 2>&1 | sed 's/^/  lock: /' >&2 || fail "agent-tooling.lock.json is incomplete"
  while IFS='|' read -r name path skillfile _; do
    [ -f "$ROOT/$skillfile" ] || fail "skill '$name' is missing: $skillfile (run: npm run setup:agent)"
  done < <(tools)
  while IFS= read -r lic; do
    [ -f "$ROOT/$lic" ] || fail "license file is missing: $lic"
  done < <(node -e 'const l=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const t of l.tools)for(const f of t.licenseFiles||[])console.log(f)' "$LOCK")
  [ -f "$ROOT/.mcp.json" ] || fail "missing .mcp.json"
  if [ -f "$ROOT/.mcp.json" ]; then
    node -e '
      const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).mcpServers || {};
      const pin = process.argv[2];
      const bad = [];
      if (!m["astro-docs"]) bad.push("astro-docs");
      if (!m.playwright || !(m.playwright.args || []).includes("@playwright/mcp@" + pin)) bad.push("playwright (expected @playwright/mcp@" + pin + ")");
      if (bad.length) { console.error("  .mcp.json is missing or mispinned: " + bad.join(", ")); process.exit(1); }' \
      "$ROOT/.mcp.json" "$(mcp_pin)" || fail ".mcp.json does not match agent-tooling.lock.json"
  fi
  [ -f "$ROOT/.claude/settings.json" ] || fail "missing .claude/settings.json"
  # Telemetry is user-level state outside the repo: warn only, never fail a session start.
  if ! grep -qs '"telemetry"[[:space:]]*:[[:space:]]*false' "${IMPECCABLE_HOME:-$HOME/.impeccable}/config.json"; then
    echo "setup-agent: warning: impeccable telemetry is not disabled yet (run: npm run setup:agent)" >&2
  fi
  if [ "${#errors[@]}" -gt 0 ]; then
    echo "setup-agent: verification FAILED:" >&2
    printf '  - %s\n' "${errors[@]}" >&2
    return 1
  fi
  echo "setup-agent: OK (design skills, MCP config and lock file are in place)"
}

install_skill() {
  local name="$1" path="$2" skillfile="$3" commit="$4" repo="$5" subpath="$6" keep="$7" installer="$8"
  if [ -f "$ROOT/$skillfile" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "setup-agent: $name already present ($path)"
    return 0
  fi
  local tmp; tmp="$(mktemp -d)"
  TMP_DIRS+=("$tmp")
  echo "setup-agent: installing $name"
  if [ -n "$repo" ]; then
    command -v git >/dev/null 2>&1 || { fail "git is required to install $name"; return 0; }
    git init -q "$tmp/src"
    git -C "$tmp/src" fetch -q --depth 1 "$repo" "$commit" || { fail "could not fetch $name at $commit from $repo (network?)"; return 0; }
    git -C "$tmp/src" checkout -q FETCH_HEAD
    [ -f "$tmp/src/$subpath/SKILL.md" ] || { fail "$name: $subpath/SKILL.md not found at $commit"; return 0; }
    rm -rf "${ROOT:?}/$path"; mkdir -p "$(dirname "$ROOT/$path")"
    cp -R "$tmp/src/$subpath" "$ROOT/$path"
  else
    command -v npx >/dev/null 2>&1 || { fail "npx is required to install $name"; return 0; }
    local cmd="${installer#npx }"
    mkdir -p "$tmp/proj"
    # shellcheck disable=SC2086
    (cd "$tmp/proj" && npx -y $cmd </dev/null >/dev/null) || { fail "installer failed for $name: $installer"; return 0; }
    [ -f "$tmp/proj/.claude/skills/$keep/SKILL.md" ] || { fail "$name: installer did not produce .claude/skills/$keep/SKILL.md"; return 0; }
    rm -rf "${ROOT:?}/$path"; mkdir -p "$(dirname "$ROOT/$path")"
    cp -R "$tmp/proj/.claude/skills/$keep" "$ROOT/$path"   # extra skills the installer writes are discarded
  fi
}

install() {
  command -v npx >/dev/null 2>&1 || { echo "setup-agent: missing required binary: npx" >&2; exit 1; }
  while IFS='|' read -r name path skillfile commit repo subpath keep installer; do
    install_skill "$name" "$path" "$skillfile" "$commit" "$repo" "$subpath" "$keep" "$installer"
  done < <(tools)
  # Privacy: impeccable telemetry off (user-level config, outside the repo).
  local cli; cli="$(node -e 'const l=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(l.tools.find(t=>t.name==="impeccable").cli)' "$LOCK")"
  npx -y "$cli" telemetry off >/dev/null 2>&1 || fail "could not disable impeccable telemetry (npx $cli telemetry off)"
  # Playwright MCP needs a browser. Cloud sessions preinstall one; locally run `npx playwright install chromium`.
  if ! ls /opt/pw-browsers/chromium-*/chrome-linux/chrome >/dev/null 2>&1 && ! ls "$HOME"/.cache/ms-playwright/chromium-* >/dev/null 2>&1; then
    echo "setup-agent: note: no Chromium found; Playwright MCP will need one (npx playwright install chromium)" >&2
  fi
}

if [ "$MODE" = "install" ]; then
  install
fi
verify
