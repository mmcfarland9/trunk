# iOS "Ship on Command" — Design

- **Date:** 2026-06-22
- **Status:** Approved (design)
- **Goal:** Let the maintainer say "push to mobile" to Claude Code and have an iOS build archived, signed, and uploaded to TestFlight automatically — no manual Xcode Archive/Distribute.

## Approach

**Executor: Xcode Cloud** (already set up for this app). Xcode Cloud builds and **signs in Apple's cloud**, so we avoid all local code-signing and macOS-keychain fragility (no certs/profiles on the dev Mac; nothing for tmux to break).

**Invocation: Claude Code, on demand**, via the **App Store Connect API**. "Push to mobile" runs a committed script that starts an Xcode Cloud build run for the archive→TestFlight workflow and monitors it.

This is deliberately NOT a git-tag/branch CI trigger — the maintainer wants an explicit on-command release driven through Claude, not automatic-on-push.

## Components

### Repo-side (built + verified here)

1. **`ci_scripts/ci_post_clone.sh`** — runs after Xcode Cloud clones the repo. Writes `ios/Trunk/Config/Secrets.swift` (gitignored) from Xcode Cloud secret env vars `SUPABASE_URL` / `SUPABASE_ANON_KEY`. If either is unset, writes the existing `xxxxx`/`...` placeholders so test-only runs still compile (matches `SupabaseClient.swift`'s "not configured" guard).
2. **`ci_scripts/ci_pre_xcodebuild.sh`** — sets the build number (`CFBundleVersion` / `CURRENT_PROJECT_VERSION`) from Xcode Cloud's `$CI_BUILD_NUMBER`, so the maintainer never hand-bumps it. Implementation TBD-by-verification: `agvtool new-version -all "$CI_BUILD_NUMBER"` if the project uses `VERSIONING_SYSTEM = apple-generic`; otherwise edit the generated Info.plist build setting.
3. **`scripts/ship-ios.sh`** — the "push to mobile" entrypoint Claude runs:
   - Reads `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH` (default `~/.config/trunk-asc/AuthKey_<KEYID>.p8`) from the environment / a gitignored config.
   - Mints a short-lived ES256 JWT from the `.p8` (pure crypto; no keychain).
   - Resolves the Xcode Cloud product + the archive→TestFlight workflow id via the API.
   - `POST /v1/ciBuildRuns` to start a build of `main` (or a ref argument).
   - Polls `GET /v1/ciBuildRuns/{id}` until completion; prints status, the App Store Connect logs link, and the resulting TestFlight build number. Non-zero exit on failure.

### Credentials & secrets

- **App Store Connect API key** (`.p8` + issuer id + key id), role App Manager/Admin. The `.p8` lives at `~/.config/trunk-asc/` — **never** committed, never pasted into chat. `scripts/ship-ios.sh` references it by path via env var.
- **Supabase keys** reach the cloud build as Xcode Cloud **secret environment variables** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), set once in the workflow. The anon key is a client-side public key; injecting at build time keeps it out of git regardless.
- `.gitignore`: ensure any local ASC config path and the stray `ios/build/` derived-data dir are ignored.

### Console-side (one-time)

- An Xcode Cloud **workflow** that: archives the `Trunk` scheme (Release, iOS), and distributes to TestFlight (internal testers). If it already exists, `ship-ios.sh` just triggers it. If not, it can be created via the API (`POST /v1/ciWorkflows`) given the product + connected SCM repo, or by the maintainer in the console (exact settings provided).

## Verification (before "done")

1. **Local archive proof:** run an unsigned Release **archive** build (`xcodebuild archive ... CODE_SIGNING_ALLOWED=NO`) to prove the project archives cleanly (catches scheme/config breakage) without needing signing.
2. **Script dry-runs:** execute `ci_post_clone.sh` and `ci_pre_xcodebuild.sh` locally with fake env to confirm they produce a valid `Secrets.swift` and version edit.
3. **JWT/auth check:** once the key arrives, a read-only API call (`GET /v1/ciProducts`) confirms auth + locates the product/workflow.
4. **One live build run** that reaches TestFlight — the real end-to-end proof.

## Non-Goals

- **Public App Store release** stays Apple-gated (App Review + release toggle). Scope ends at TestFlight.
- **Local signing / local archive upload** — explicitly avoided in favor of Xcode Cloud cloud-signing.
- No change to the app's behavior, event model, or web side.

## Open items to confirm during implementation

- Exact required location of `ci_scripts/` for this monorepo (`ios/` next to `Trunk.xcodeproj` vs repo root) — verify against current Apple docs; wrong location = scripts silently skipped.
- `agvtool` vs Info.plist for the build-number set (depends on `VERSIONING_SYSTEM`).
- Whether an archive→TestFlight workflow already exists, and the minimum API-key role to start a build run (and to create a workflow if needed).
