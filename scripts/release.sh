#!/usr/bin/env bash
#
# One command for a full dev -> main release.
#
# Exists because the release path had a step that was easy to forget: Xcode
# Cloud uploads a build but it stalls at READY_FOR_BETA_TESTING and never
# reaches testers until something attaches it to the internal group. Every
# release so far has needed that run by hand.
#
# Usage:
#   scripts/release.sh [--dry-run] [--no-wait]
#     --dry-run   show what would happen, change nothing
#     --no-wait   merge and push, but don't wait for CI / Xcode Cloud
#
# Does NOT bump versions — those stay maintainer-controlled (see RELEASE.md).
# Bump MARKETING_VERSION and update the changelogs before running this.
#
set -euo pipefail

DRY=0; WAIT=1
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-wait) WAIT=0 ;;
    *) echo "unknown flag: $a" >&2; exit 2 ;;
  esac
done

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
run() { if [ "$DRY" -eq 1 ]; then echo "  [dry-run] $*"; else eval "$@"; fi; }

# --- Preflight -------------------------------------------------------------
say "Preflight"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "❌ Working tree has uncommitted changes. Commit or stash first." >&2
  git status --short | grep -v '^??' >&2
  exit 1
fi
echo "  ✓ working tree clean"

git fetch -q origin
CURRENT="$(git branch --show-current)"
[ "$CURRENT" = "dev" ] || { echo "❌ Run from dev (currently on '$CURRENT')." >&2; exit 1; }
echo "  ✓ on dev"

if [ "$(git rev-parse dev)" != "$(git rev-parse origin/dev)" ]; then
  echo "❌ dev differs from origin/dev — push or pull first." >&2
  exit 1
fi
echo "  ✓ dev in sync with origin"

AHEAD="$(git rev-list --count main..dev)"
if [ "$AHEAD" -eq 0 ]; then
  echo "Nothing to release — main already contains every dev commit."
  exit 0
fi
echo "  ✓ $AHEAD commit(s) to release:"
git log --oneline main..dev | sed 's/^/      /'

# Does this release actually touch iOS? Xcode Cloud builds on ANY main push,
# but there's no point distributing a build with no iOS changes in it.
if git diff --quiet main..dev -- ios/ shared/; then
  IOS_CHANGED=0
  echo "  · no ios/ or shared/ changes — will skip TestFlight distribution"
else
  IOS_CHANGED=1
  echo "  · ios/ or shared/ changed — will distribute to TestFlight"
fi

# --- Merge and push --------------------------------------------------------
say "Merging dev -> main"
# Regular merge, never --ff-only or squash: squashing diverged the branches
# once before and RELEASE.md prescribes this.
run "git checkout -q main"
run "git merge dev -m 'Merge branch \"dev\": release'"
# --no-thin: pushes of this repo have failed with 'remote unpack failed'
# on thin packs; --no-thin has been reliable.
run "git push --no-thin origin main"
run "git checkout -q dev"
echo "  ✓ main pushed"

if [ "$WAIT" -eq 0 ]; then
  say "Done (--no-wait)"
  echo "Remember: run scripts/testflight-distribute.py once Xcode Cloud finishes."
  exit 0
fi

if [ "$DRY" -eq 1 ]; then
  say "Dry run complete — nothing changed."
  exit 0
fi

# --- Wait for GitHub CI ----------------------------------------------------
say "Waiting for GitHub CI on main"
sleep 8
FAILED=0
for wf in ci.yml ios-ci.yml; do
  RUN_ID="$(gh run list --workflow="$wf" --branch=main --limit=1 --json databaseId,headSha \
    --jq ".[] | select(.headSha==\"$(git rev-parse main)\") | .databaseId" 2>/dev/null || true)"
  if [ -z "$RUN_ID" ]; then
    echo "  · $wf: no run for this commit (path filter, or not triggered)"
    continue
  fi
  if gh run watch "$RUN_ID" --exit-status >/dev/null 2>&1; then
    echo "  ✓ $wf passed"
  else
    echo "  ❌ $wf FAILED — see: gh run view $RUN_ID --log-failed" >&2
    FAILED=1
  fi
done
[ "$FAILED" -eq 0 ] || { echo "CI failed; main is already pushed. Fix forward." >&2; exit 1; }

# --- Web is live at this point ---------------------------------------------
say "Web"
echo "  ✓ Vercel deploys from main automatically"

# --- iOS: wait for Xcode Cloud, then distribute ----------------------------
if [ "$IOS_CHANGED" -eq 0 ]; then
  say "Skipping TestFlight — no iOS changes in this release"
  echo "  (Xcode Cloud still builds on every main push; that build just isn't worth shipping.)"
  say "Release complete"
  exit 0
fi

say "Waiting for Xcode Cloud"
# The buildRuns endpoint does NOT return newest-first, so always take the max
# run number rather than the first element.
if [ ! -f "${ASC_CONFIG:-$HOME/.config/trunk-asc/config}" ]; then
  echo "  ⚠ No ASC config — skipping the wait." >&2
  echo "  Run scripts/testflight-distribute.py yourself once the build finishes." >&2
  exit 0
fi
set -a; . "${ASC_CONFIG:-$HOME/.config/trunk-asc/config}"; set +a
export ASC_KEY_PATH="$(eval echo "$ASC_KEY_PATH")"

for _ in $(seq 1 40); do
  STATE="$(python3 "$HERE/asc-latest-run.py" 2>/dev/null || echo "|")"
  NUM="${STATE%%|*}"; REST="${STATE#*|}"; PROG="${REST%%|*}"; COMP="${REST##*|}"
  echo "  run #$NUM $PROG $COMP"
  [ "$PROG" = "COMPLETE" ] && break
  sleep 60
done

if [ "$COMP" != "SUCCEEDED" ]; then
  echo "❌ Xcode Cloud finished with: $COMP — not distributing." >&2
  exit 1
fi

say "Distributing to TestFlight"
python3 "$HERE/testflight-distribute.py"

say "Release complete"
echo "  web: live via Vercel"
echo "  iOS: live in TestFlight (internal) — pull to refresh in the app"
