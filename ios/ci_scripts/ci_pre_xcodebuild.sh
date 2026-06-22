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

if [ -z "${CI_BUILD_NUMBER:-}" ]; then
  echo "ci_pre_xcodebuild: CI_BUILD_NUMBER unset — leaving build number unchanged."
  exit 0
fi

ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
PBX="$ROOT/ios/Trunk.xcodeproj/project.pbxproj"

sed -i '' -E "s/(CURRENT_PROJECT_VERSION = )[0-9]+;/\1${CI_BUILD_NUMBER};/g" "$PBX"
echo "ci_pre_xcodebuild: set CURRENT_PROJECT_VERSION = ${CI_BUILD_NUMBER}."
