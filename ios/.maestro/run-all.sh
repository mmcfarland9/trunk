#!/bin/bash
# Run all Maestro E2E flows for the Trunk iOS app.
#
# Prerequisites:
#   - iOS Simulator booted with Trunk app installed (DEBUG build)
#   - Maestro CLI installed (brew install maestro)
#   - Java runtime available
#
# Usage:
#   ./ios/.maestro/run-all.sh              # Run all flows
#   ./ios/.maestro/run-all.sh smoke-test   # Run a single flow

set -euo pipefail

# Java is required by Maestro — use Homebrew OpenJDK if system Java unavailable
if ! java -version &>/dev/null; then
  BREW_JDK="$(brew --prefix openjdk 2>/dev/null)/libexec/openjdk.jdk/Contents/Home"
  if [ -d "$BREW_JDK" ]; then
    export JAVA_HOME="$BREW_JDK"
    export PATH="$JAVA_HOME/bin:$PATH"
  else
    echo "ERROR: Java not found. Install with: brew install openjdk"
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FLOWS_DIR="$SCRIPT_DIR/flows"

# If a specific flow is requested, run just that one
if [ -n "${1:-}" ]; then
  FLOW_FILE="$FLOWS_DIR/$1.yaml"
  if [ ! -f "$FLOW_FILE" ]; then
    echo "ERROR: Flow not found: $FLOW_FILE"
    echo "Available flows:"
    ls "$FLOWS_DIR"/*.yaml | xargs -n1 basename | sed 's/.yaml//'
    exit 1
  fi
  echo "Running flow: $1"
  maestro test "$FLOW_FILE"
  exit $?
fi

# Run all flows in order (login first to test unauthenticated state)
FLOW_ORDER=(
  login
  smoke-test
  navigation
  today-view
  resource-display
  sprout-lifecycle
  data-sync
)

PASSED=0
FAILED=0
FAILED_FLOWS=()

for flow in "${FLOW_ORDER[@]}"; do
  FLOW_FILE="$FLOWS_DIR/$flow.yaml"
  if [ ! -f "$FLOW_FILE" ]; then
    echo "SKIP: $flow (file not found)"
    continue
  fi

  echo ""
  echo "=== Running: $flow ==="
  if maestro test "$FLOW_FILE"; then
    echo "PASS: $flow"
    ((PASSED++))
  else
    echo "FAIL: $flow"
    ((FAILED++))
    FAILED_FLOWS+=("$flow")
  fi
done

echo ""
echo "=== Results ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
if [ ${#FAILED_FLOWS[@]} -gt 0 ]; then
  echo "Failed flows: ${FAILED_FLOWS[*]}"
  exit 1
fi
