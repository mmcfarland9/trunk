#!/usr/bin/env bash
#
# "Push to mobile" — trigger an Xcode Cloud build of Trunk and (optionally) watch
# it through to TestFlight. Xcode Cloud archives + signs in Apple's cloud and
# uploads to TestFlight (internal testers); this script just starts/monitors it
# via the App Store Connect API.
#
# Usage:
#   scripts/ship-ios.sh [REF] [--no-watch]
#     REF         git branch to build (default: main)
#     --no-watch  start the build and exit without polling
#
# Credentials come from ~/.config/trunk-asc/config (gitignored, local only):
#   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH
#
set -euo pipefail

CONFIG="${ASC_CONFIG:-$HOME/.config/trunk-asc/config}"
[ -f "$CONFIG" ] || { echo "Missing ASC config: $CONFIG" >&2; exit 1; }
# shellcheck disable=SC1090
set -a; . "$CONFIG"; set +a
: "${ASC_KEY_ID:?}"; : "${ASC_ISSUER_ID:?}"; : "${ASC_KEY_PATH:?}"

HERE="$(cd "$(dirname "$0")" && pwd)"
API="https://api.appstoreconnect.apple.com"
WORKFLOW_ID="${TRUNK_WORKFLOW_ID:-E7C96877-39E6-458D-91FC-9B435ED6B968}"
REPO_ID="${TRUNK_REPO_ID:-6b442194-e716-470f-8dc8-15fe89e6e4ec}"

REF_NAME="main"; WATCH=1
for a in "$@"; do
  case "$a" in
    --no-watch) WATCH=0 ;;
    -*) echo "unknown flag: $a" >&2; exit 2 ;;
    *) REF_NAME="$a" ;;
  esac
done

jwt() { ASC_KEY_ID="$ASC_KEY_ID" ASC_ISSUER_ID="$ASC_ISSUER_ID" \
        ASC_KEY_PATH="$(eval echo "$ASC_KEY_PATH")" python3 "$HERE/asc-jwt.py"; }
get() { curl -sS -H "Authorization: Bearer $(jwt)" "$API$1"; }

# Resolve the scmGitReference id for the branch.
REF_ID="$(get "/v1/scmRepositories/$REPO_ID/gitReferences?limit=100" \
  | jq -r --arg n "$REF_NAME" '.data[] | select(.attributes.kind=="BRANCH" and .attributes.name==$n) | .id' | head -1)"
[ -n "$REF_ID" ] || { echo "No branch '$REF_NAME' in Xcode Cloud repo references." >&2; exit 1; }

echo "Triggering Xcode Cloud build of '$REF_NAME'…"
body="$(jq -nc --arg wf "$WORKFLOW_ID" --arg ref "$REF_ID" \
  '{data:{type:"ciBuildRuns",attributes:{},relationships:{workflow:{data:{type:"ciWorkflows",id:$wf}},sourceBranchOrTag:{data:{type:"scmGitReferences",id:$ref}}}}}')"
run="$(curl -sS -X POST -H "Authorization: Bearer $(jwt)" -H "Content-Type: application/json" -d "$body" "$API/v1/ciBuildRuns")"
RUN_ID="$(echo "$run" | jq -r '.data.id // empty')"
[ -n "$RUN_ID" ] || { echo "Failed to start build:" >&2; echo "$run" | jq '.errors' >&2; exit 1; }
echo "Build run #$(echo "$run" | jq -r '.data.attributes.number') started (id $RUN_ID)."

if [ "$WATCH" -eq 0 ]; then exit 0; fi

while :; do
  sleep 30
  st="$(get "/v1/ciBuildRuns/$RUN_ID")"
  exec="$(echo "$st" | jq -r '.data.attributes.executionProgress')"
  comp="$(echo "$st" | jq -r '.data.attributes.completionStatus // "—"')"
  echo "  progress=$exec completion=$comp"
  [ "$exec" = "COMPLETE" ] && break
done

if [ "$comp" = "SUCCEEDED" ]; then
  echo "✅ Build SUCCEEDED — the new build should appear in TestFlight (internal) shortly."
else
  echo "❌ Build finished with: $comp" >&2; exit 1
fi
