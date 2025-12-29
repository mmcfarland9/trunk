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

### Module Structure

```
src/
├── main.ts           # Entry point; wires features and initializes app
├── types.ts          # Core type definitions
├── constants.ts      # Application constants (BRANCH_COUNT, STORAGE_KEY, etc.)
├── state/            # Global state management
│   ├── circle-state.ts   # Circle data persistence (localStorage)
│   ├── view-state.ts     # View mode & UI state
│   └── index.ts          # Re-exports
├── features/         # Feature modules
│   ├── navigation.ts     # View switching (overview ↔ branch)
│   ├── progress.ts       # Progress tracking & stats
│   ├── status.ts         # Status messages
│   ├── import-export.ts  # JSON export/import
│   ├── hover-branch.ts   # Branch hover preview
│   └── index.ts          # Re-exports
├── ui/               # UI components & rendering
│   ├── dom-builder.ts    # DOM tree construction
│   ├── circle-ui.ts      # Circle-specific UI logic
│   ├── editor.ts         # Modal editor
│   ├── layout.ts         # Positioning, SVG guides, wind animation
│   ├── leaf-sizing.ts    # Leaf text wrapping & sizing
│   └── index.ts          # Re-exports
└── styles/           # Modular CSS
    ├── index.css         # Main imports
    ├── variables.css     # CSS custom properties
    ├── base.css          # Reset & foundational
    ├── layout.css        # Grid/flexbox layout
    ├── buttons.css       # Button styles
    ├── canvas.css        # Canvas & zoom
    ├── circles.css       # Circle components
    ├── editor.css        # Modal editor
    ├── panel.css         # Side panel
    ├── utilities.css     # Utility classes
    └── responsive.css    # Breakpoints (960px, 720px, 520px)
```

### Core Types (src/types.ts)

- `CircleData` - label and note text for each circle
- `BranchNode` - wrapper element, main circle, and 8 sub-circles
- `ViewMode` - 'overview' | 'branch'
- `AppContext` - central context object passed to features
- `AppElements` - references to key DOM elements

### State Management (src/state/)

- `circleState` object holds all circle data, keyed by circle ID
- Changes auto-persist to localStorage (`harada-notes-v1` key)
- `view-state.ts` tracks current mode, focused/active circles

### Key Features

- **Two view modes**: `overview` (all 8 branches) and `branch` (focused single branch)
- Inline editor modal for circle label/notes
- Progress bars (overall and per-branch completion)
- Export/import via JSON for backup and sharing
- SVG guide lines connecting circles
- Wind animation for organic movement
- Responsive layout with breakpoints at 960px, 720px, 520px

### Circle IDs

- Trunk: `center`
- Branches: `branch-0` through `branch-7`
- Leaves: `branch-{branchIdx}-sub-{leafIdx}`

## Code Style

- 2-space indentation
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters` enabled)
- ES2022 target with ESNext modules
- File naming: kebab-case (`circle-state.ts`)
- Exports: camelCase (`circleState`, `getViewMode`)
- Constants: UPPER_SNAKE_CASE (`BRANCH_COUNT`)
- CSS classes: kebab-case with `.is-*` modifiers for states

## Commit Guidelines

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
