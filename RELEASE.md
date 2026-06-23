# Trunk Release Management

## Quick Reference — updating web & iOS

**Shipping code** (same for both platforms):

```bash
# 1. Work on dev — commit and push freely (Vercel makes preview deploys)
git checkout dev
git commit -am "feat: whatever" && git push

# 2. Release to production — merge dev → main
git checkout main && git merge dev && git push
git checkout dev
```

The moment `main` is pushed:

- **Web ships automatically** via Vercel — that's the entire web release, nothing else to do.
- **iOS ships automatically too** — Xcode Cloud builds `main`, archives, cloud-signs, and uploads to **TestFlight (internal)**. No Xcode, no manual archive. (Promoting to the public App Store is still Apple-gated: App Review + the Release button.)

**Cutting a version** (manual, independent per platform — see [Versioning](#versioning)):

- **Web**: bump `version` in `web/package.json`, update `web/CHANGELOG.md`, tag `web-vX.Y.Z`.
- **iOS**: bump `MARKETING_VERSION` (all 4 spots) in `ios/Trunk.xcodeproj/project.pbxproj`, promote `ios/CHANGELOG.md` `[Unreleased]`, tag `ios-vX.Y.Z`. **Don't touch `CURRENT_PROJECT_VERSION`** — Xcode Cloud sets the build number. Bump the marketing version each release so the build-number train stays collision-free.

**iOS archive & upload** — **automatic**. Xcode Cloud's "Default" workflow (triggers on a `main` push) archives → cloud-signs → uploads to TestFlight (internal) in ~10–15 min. To ship without a `main` merge (e.g. a build off `dev`), run `scripts/ship-ios.sh [branch]` — it triggers and watches the build via the App Store Connect API.

> No local git hooks run on commit or push — pushes to `main` are instant. Formatting/type/test checks run in **GitHub CI** server-side; run `cd web && npx biome format --write src/` yourself before committing to keep CI green.

---

## Branching

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production. Always stable. | Vercel (trunk.michaelpmcfarland.com) + iOS archives |
| `dev` | Daily work. WIP, experiments, broken things are fine. | Vercel preview deploys |

No feature branches. No pull requests. Just `dev` for work, `main` for production.

### Daily workflow

```bash
git checkout dev
# work, commit, push freely
git push
```

### Releasing to production

```bash
git checkout main
git merge dev
git push                # Vercel deploys web automatically
# Archive in Xcode if releasing iOS
```

### Rules

- **Never commit directly to `main`** — always merge from `dev`.
- **Claude Code works on `dev`** — all code changes happen on `dev`, never on `main`.
- **`main` is what users see** — web deploys instantly on push, iOS archives from `main`.

---

## Versioning

Trunk uses **independent semantic versioning** for each platform. **Version bumps are manual and intentional** — commits do not trigger version changes. The maintainer decides when to bump and what the version means.

| Platform | Version Location | Tag Format | Current |
|----------|-----------------|------------|---------|
| Web | `web/package.json` `version` | `web-vX.Y.Z` | 0.1.0 |
| iOS | Xcode `MARKETING_VERSION` | `ios-vX.Y.Z` | 0.1.0 |

Each platform evolves independently. Web might be at v1.2.0 while iOS is at v0.8.0.

### Pre-1.0 (current)

- Breaking changes don't require major bumps
- Bump when it feels right — before a TestFlight build, after a milestone, etc.
- No automation, no scripts, just manual control

### Post-1.0 (future)

| Bump | When | Example |
|------|------|---------|
| **Patch** (+0.0.1) | Bug fixes, small visual tweaks | `1.0.0` -> `1.0.1` |
| **Minor** (+0.1.0) | New features, UI changes | `1.0.1` -> `1.1.0` |
| **Major** (+1.0.0) | Data migrations, major redesigns | `1.1.0` -> `2.0.0` |

---

## Release Process

### Web Release

1. Merge `dev` -> `main`, push (Vercel deploys automatically)
2. When ready to mark a version:
   - Update `version` in `web/package.json`
   - Update `web/CHANGELOG.md` with patch notes
   - Commit: `git commit -m "chore(web): release vX.Y.Z"`
   - Tag: `git tag web-vX.Y.Z`
   - Push: `git push && git push --tags`

### iOS Release

1. (For a versioned release) bump `MARKETING_VERSION` (all 4 spots in `ios/Trunk.xcodeproj/project.pbxproj`), update `ios/CHANGELOG.md`, commit, tag `ios-vX.Y.Z`. Leave `CURRENT_PROJECT_VERSION` alone — Xcode Cloud sets the build number.
2. Merge `dev` -> `main` and push → Xcode Cloud automatically archives → cloud-signs → uploads to **TestFlight (internal)** (~10–15 min).
   - Or, without merging: `scripts/ship-ios.sh [branch]` triggers a build of any branch via the ASC API.
3. Promoting to the public App Store is a separate, Apple-gated step (App Review + Release) done in App Store Connect.

### iOS Build Numbers

**Xcode Cloud manages the build number** (its own incrementing run counter) — you don't set `CURRENT_PROJECT_VERSION`. Because that counter is global across runs and can sit below older manually-uploaded builds, **bump `MARKETING_VERSION` each release** so every release is a fresh, collision-free build-number train. (Setup details: `~/.config/trunk-asc/`, `scripts/ship-ios.sh`, `scripts/asc-jwt.py`.)

---

## Changelogs

Each platform maintains its own changelog with maintainer-written patch notes:
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

---

## Shared Directory

The `shared/` directory contains platform-agnostic specifications:
- `shared/constants.json` - Shared constants
- `shared/schemas/` - Data schemas
- `shared/formulas.md` - Game mechanics formulas

Changes to `shared/` should be coordinated across platforms but don't have their own version number.

---

## Rollback

- **Web**: Revert the merge on `main` and push, or use Vercel's deploy history dashboard.
- **iOS**: You can't recall a TestFlight build, but you can upload a new build with a higher build number.

---

## Related

- [CLAUDE.md](CLAUDE.md) — Codebase guide
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design, data model, sync
- [CANVAS.md](CANVAS.md) — Feature vision
