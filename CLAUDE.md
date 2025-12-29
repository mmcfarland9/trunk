# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start Vite development server
npm run build    # Compile TypeScript and build for production
npm run preview  # Preview production build locally
```

No test or lint commands are currently configured.

## Architecture

Harada is a 64-circle planning map application (1 trunk + 8 branches × 8 leaves) built with vanilla TypeScript and Vite.

### Single-File Application (src/main.ts)

The entire application logic lives in `main.ts` (~1,100 lines) using:

- **Global state** stored in localStorage (`harada-notes-v1` key)
- **Two view modes**: `overview` (all 8 branches) and `branch` (focused single branch)
- **DOM-based rendering** with SVG guide lines connecting circles

### Core Types

- `CircleData` - label and note text for each circle
- `BranchNode` - wrapper element, main circle, and 8 sub-circles
- `ViewMode` - 'overview' | 'branch'
- `circleLookup` Map - fast circle access by ID

### State Management

- `circleState` object holds all circle data, keyed by circle ID
- Changes auto-persist to localStorage
- Export/import via JSON for backup and sharing

### Key Features

- Inline editor modal for circle label/notes
- Progress bars (overall and per-branch completion)
- Copy Summary generates plain-text outline
- Responsive layout with breakpoints at 960px, 720px, 520px

## Code Style

- 2-space indentation
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters` enabled)
- ES2022 target with ESNext modules

## Commit Guidelines

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
