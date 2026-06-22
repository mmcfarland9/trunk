# Trunk Web App

Vite-based web application for Trunk personal growth tracking.

## Development

**Install dependencies:**
```bash
npm install
```

**Run dev server:**
```bash
npm run dev
```

Visit http://localhost:5173

**Run tests:**
```bash
npm test           # Run once
npm run test:watch # Watch mode
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── main.ts              # Entry point
│   ├── constants.ts         # Web-specific constants
│   ├── types.ts             # TypeScript types
│   ├── bootstrap/           # App initialization (auth, events, sync, ui)
│   ├── events/              # Event sourcing: store, derive, charting (source of truth)
│   ├── features/            # Business logic (navigation, progress, dialogs, hover)
│   ├── ui/                  # DOM rendering (twig-view/, dom-builder/, charts, …)
│   ├── services/            # Auth + sync (sync/ split into modules)
│   ├── state/               # In-memory view state
│   ├── styles/              # CSS
│   ├── generated/           # Constants generated from shared/ (checked in)
│   ├── lib/                 # Lazy-loaded Supabase client
│   ├── utils/               # Pure functions (zero deps)
│   └── tests/               # Vitest test files
├── e2e/                     # Playwright E2E tests
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── vitest.config.ts         # Test config
```

## Shared Dependencies

Constants live in `../shared/constants.json` and are compiled to typed TypeScript
at `src/generated/constants.ts` (checked in). Regenerate after editing the source:

```bash
npm run generate        # node ../shared/generate-constants.js
```

```typescript
import { VALID_EVENT_TYPES } from './generated/constants'
```

See `../shared/constants.json` and `../shared/formulas.md` for the source of truth.

## Tech Stack

- **Build Tool:** Vite (using Rolldown variant)
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest + jsdom
- **Storage:** localStorage

## Key Features

- Tree-based life organization (8 branches × 8 twigs)
- Sprout (goal) cultivation with seasons and environments
- Daily watering and weekly sun reflection
- Progressive soil capacity growth system
- Import/export for data backup

## Code Style

- Indentation: 2 spaces
- Files: kebab-case.ts
- Exports: camelCase
- CSS: kebab-case with .is-* state modifiers

## TypeScript

Strict mode enabled:
- noUnusedLocals
- noUnusedParameters
- Target: ES2022
