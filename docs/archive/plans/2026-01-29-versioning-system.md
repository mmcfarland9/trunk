# Versioning System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish independent semantic versioning for web and iOS platforms, starting at 0.1.0.

**Architecture:** Each platform maintains its own version line with platform-specific storage (package.json for web, Xcode project for iOS). Git tags mark releases. Changelogs document changes per platform.

**Tech Stack:** Git tags, npm/package.json, Xcode project settings

---

## Task 1: Update Web Version to 0.1.0

**Files:**
- Modify: `web/package.json:4` (version field)

**Step 1: Update version in package.json**

Change line 4 from:
```json
"version": "0.0.0",
```

To:
```json
"version": "0.1.0",
```

**Step 2: Verify the change**

Run: `grep '"version"' web/package.json`
Expected: `"version": "0.1.0",`

**Step 3: Commit**

```bash
git add web/package.json
git commit -m "chore(web): initialize version at 0.1.0"
```

---

## Task 2: Update iOS Version to 0.1.0

**Files:**
- Modify: `app/Trunk.xcodeproj/project.pbxproj` (MARKETING_VERSION fields)

**Step 1: Update MARKETING_VERSION in Xcode project**

There are two occurrences of `MARKETING_VERSION = 1.0;` (Debug and Release configurations).

Change both from:
```
MARKETING_VERSION = 1.0;
```

To:
```
MARKETING_VERSION = 0.1.0;
```

**Step 2: Verify the change**

Run: `grep "MARKETING_VERSION" app/Trunk.xcodeproj/project.pbxproj`
Expected: Two lines showing `MARKETING_VERSION = 0.1.0;`

**Step 3: Commit**

```bash
git add app/Trunk.xcodeproj/project.pbxproj
git commit -m "chore(ios): initialize version at 0.1.0"
```

---

## Task 3: Create Web Changelog

**Files:**
- Create: `web/CHANGELOG.md`

**Step 1: Create the changelog file**

```markdown
# Changelog

All notable changes to the Trunk web app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- Tree visualization with trunk, branches, and twigs
- Sprout lifecycle (draft, plant, water, harvest)
- Leaf sagas for grouping related sprouts
- Resource system (soil, water, sun)
- Import/export functionality
- Keyboard navigation
```

**Step 2: Commit**

```bash
git add web/CHANGELOG.md
git commit -m "docs(web): add changelog starting at 0.1.0"
```

---

## Task 4: Create iOS Changelog

**Files:**
- Create: `app/CHANGELOG.md`

**Step 1: Create the changelog file**

```markdown
# Changelog

All notable changes to the Trunk iOS app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-29

### Added
- Initial version tracking
- SwiftUI-based tree visualization
- Sprout management (create, water, harvest)
- Sun reflection prompts
- Design system with wood-based colors and typography
```

**Step 2: Commit**

```bash
git add app/CHANGELOG.md
git commit -m "docs(ios): add changelog starting at 0.1.0"
```

---

## Task 5: Create Git Tags

**Step 1: Create web version tag**

```bash
git tag -a web-v0.1.0 -m "Web app version 0.1.0 - Initial versioning"
```

**Step 2: Create iOS version tag**

```bash
git tag -a ios-v0.1.0 -m "iOS app version 0.1.0 - Initial versioning"
```

**Step 3: Verify tags**

Run: `git tag -l "*-v0.1.0"`
Expected:
```
ios-v0.1.0
web-v0.1.0
```

---

## Task 6: Create Versioning Documentation

**Files:**
- Create: `docs/VERSIONING.md`

**Step 1: Create the versioning guide**

```markdown
# Trunk Versioning Guide

Trunk uses **independent semantic versioning** for each platform.

## Version Lines

| Platform | Version Location | Tag Format |
|----------|-----------------|------------|
| Web | `web/package.json` | `web-v0.1.0` |
| iOS | Xcode `MARKETING_VERSION` | `ios-v0.1.0` |

Each platform evolves independently. Web might be at v1.2.0 while iOS is at v0.8.0.

## Semantic Versioning

### Pre-1.0 (Current)

Both platforms are pre-1.0, meaning:
- Breaking changes don't require major bumps
- Focus on shipping and iterating
- Version bumps are at maintainer discretion

### Post-1.0 (Future)

Once a platform reaches 1.0.0:

| Bump | When | Example |
|------|------|---------|
| **Patch** (+0.0.1) | Bug fixes, typos, small visual tweaks | `1.0.0` → `1.0.1` |
| **Minor** (+0.1.0) | New features, UI changes, new sprout options | `1.0.1` → `1.1.0` |
| **Major** (+1.0.0) | Data migrations, major redesigns, "new app feel" | `1.1.0` → `2.0.0` |

## Release Process

### Web Release

1. Update version in `web/package.json`
2. Update `web/CHANGELOG.md` with changes
3. Commit: `git commit -m "chore(web): bump version to X.Y.Z"`
4. Tag: `git tag -a web-vX.Y.Z -m "Web app version X.Y.Z"`
5. Push: `git push && git push --tags`

### iOS Release

1. Update `MARKETING_VERSION` in Xcode (both Debug and Release)
2. Increment `CURRENT_PROJECT_VERSION` (build number: 1, 2, 3...)
3. Update `app/CHANGELOG.md` with changes
4. Commit: `git commit -m "chore(ios): bump version to X.Y.Z"`
5. Tag: `git tag -a ios-vX.Y.Z -m "iOS app version X.Y.Z"`
6. Push: `git push && git push --tags`
7. Archive and upload to App Store Connect

## iOS Build Numbers

The build number (`CURRENT_PROJECT_VERSION`) is a simple incrementing integer:
- Each App Store/TestFlight upload needs a higher build number
- Use: 1, 2, 3, 4... (no padding, no dates)
- Build numbers are independent of version numbers

Example: Version 0.2.0 might have builds 5, 6, 7 during development.

## Changelogs

Each platform maintains its own changelog:
- `web/CHANGELOG.md`
- `app/CHANGELOG.md`

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

## Shared Directory

The `shared/` directory contains platform-agnostic specifications:
- `shared/constants.json` - Shared constants
- `shared/schemas/` - Data schemas
- `shared/formulas.md` - Game mechanics formulas

Changes to `shared/` should be coordinated across platforms but don't have their own version number.
```

**Step 2: Commit**

```bash
git add docs/VERSIONING.md
git commit -m "docs: add versioning guide"
```

---

## Summary

After completing all tasks:

- Web version: `0.1.0` in `web/package.json`
- iOS version: `0.1.0` in Xcode project
- Git tags: `web-v0.1.0`, `ios-v0.1.0`
- Changelogs: `web/CHANGELOG.md`, `app/CHANGELOG.md`
- Documentation: `docs/VERSIONING.md`
