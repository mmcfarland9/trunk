# Trunk Release Management

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

1. Merge `dev` -> `main`
2. In Xcode:
   - Update `MARKETING_VERSION` (both Debug and Release configs)
   - Increment `CURRENT_PROJECT_VERSION` (build number: 1, 2, 3...)
3. Update `ios/CHANGELOG.md` with patch notes
4. Commit: `git commit -m "chore(ios): release vX.Y.Z"`
5. Tag: `git tag ios-vX.Y.Z`
6. Push: `git push && git push --tags`
7. Product -> Archive -> Distribute to App Store Connect
8. TestFlight build appears in ~10 minutes

### iOS Build Numbers

The build number (`CURRENT_PROJECT_VERSION`) is a simple incrementing integer:
- Each TestFlight/App Store upload needs a higher build number
- Use: 1, 2, 3, 4... (no padding, no dates)
- Build numbers are independent of version numbers
- Example: Version 0.2.0 might have builds 5, 6, 7 during development

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

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [ONBOARDING.md](./ONBOARDING.md) — Quick start, common tasks, contributing
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships, event types, storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs, extension points
- [RUNBOOK.md](./RUNBOOK.md) — Deployment, common issues
