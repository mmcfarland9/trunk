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
3. Update `ios/CHANGELOG.md` with changes
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
- `ios/CHANGELOG.md`

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
