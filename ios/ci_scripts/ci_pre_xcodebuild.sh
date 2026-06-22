#!/bin/sh
#
# Xcode Cloud custom build script — runs before xcodebuild.
# Stamps the app's build number (CFBundleVersion) with Xcode Cloud's
# monotonically-increasing CI_BUILD_NUMBER so TestFlight never rejects a
# reused build number and the maintainer never hand-bumps CURRENT_PROJECT_VERSION.
#
# The project uses GENERATE_INFOPLIST_FILE=YES with no explicit VERSIONING_SYSTEM,
# so CFBundleVersion derives from the CURRENT_PROJECT_VERSION build setting in
# project.pbxproj. We rewrite that setting in the ephemeral CI checkout. (BSD sed,
# matching the macOS build environment.)
#
set -eu

# Build number = Unix epoch seconds: strictly monotonic, always unique, and
# always greater than any prior manually-uploaded build (e.g. the existing
# 0.3.0 build 4), so App Store Connect never rejects it. Xcode Cloud's
# CI_BUILD_NUMBER restarts at 1 per workflow and would collide, so we don't use
# it. (A 10-digit epoch stays a valid <2^31 integer until 2038.)
BUILD="$(date -u +%s)"

ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
PBX="$ROOT/ios/Trunk.xcodeproj/project.pbxproj"

sed -i '' -E "s/(CURRENT_PROJECT_VERSION = )[0-9]+;/\1${BUILD};/g" "$PBX"
echo "ci_pre_xcodebuild: set CURRENT_PROJECT_VERSION = ${BUILD} (epoch)."
