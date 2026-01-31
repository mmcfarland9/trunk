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
│   ├── state.ts             # Legacy state management
│   ├── types.ts             # TypeScript types
│   ├── events/              # Event-sourced state (new architecture)
│   ├── features/            # Feature modules
│   ├── ui/                  # UI components
│   ├── utils/               # Utility functions
│   └── tests/               # Test files
├── e2e/                     # Playwright E2E tests
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── vitest.config.ts         # Test config
```

## Shared Dependencies

This web app imports shared constants and schemas from `../shared/`:

```typescript
import constants from '@shared/constants.json'
```

See [../shared/README.md](../shared/README.md) for details.

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
