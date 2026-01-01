# Repository Guidelines

> This repository currently contains only Git metadata. Use this guide to scaffold, develop, and collaborate on a small static web project (HTML/CSS/JS) in a clean, consistent way.

## Project Structure & Module Organization

Place files as follows:
- `public/` – deployable static assets (e.g., `index.html`, images, compiled bundles).
- `src/` – source files (`src/js/`, `src/css/`, templates/partials).
- `assets/` – raw, unprocessed assets (SVGs, fonts) copied or built into `public/`.
- `tests/` – browser or unit tests (`tests/**/*.spec.js`).

Example:
```
public/index.html
src/js/main.js
src/css/styles.css
assets/logo.svg
```

## Build, Test, and Development Commands


## Coding Style & Naming Conventions

- Indentation: 2 spaces; UTF‑8; Unix line endings.

## Testing Guidelines

- Place tests under `tests/` and suffix with `.spec.js`.
- Prefer Playwright for UI flows and Vitest/Jest for unit utilities.
- Aim for meaningful coverage of critical paths; keep tests deterministic and fast.
- Run tests via `npm test` (when configured) or `npx playwright test`.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Keep commits small and focused; include rationale in the body if non-trivial.
- PRs must include: concise description, linked issue (if any), screenshots or before/after notes for UI, and manual test steps.

## Security & Configuration Tips

- Do not commit secrets; use `.env.local` and document required variables in `README.md`.
- Large assets belong in `assets/`; optimize before shipping to `public/`.
- Keep third-party dependencies minimal; pin versions when adding a toolchain.
- When you use commands like "sleep 1 && screencapture," you don't need to shift focus. Just screenshot where you're at -- I'll be visually monitoring the dev server.