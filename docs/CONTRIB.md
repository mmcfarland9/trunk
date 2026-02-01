# Contributing Guide

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Xcode 15+ (for iOS development)

### Web App Setup
```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

### iOS App Setup
```bash
cd ios
open Trunk.xcodeproj  # Build with Cmd+R
```

---

## Available Scripts

All scripts run from `web/` directory:

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start Vite development server with HMR |
| **build** | `npm run build` | TypeScript compile + production build |
| **preview** | `npm run preview` | Preview production build locally |
| **test** | `npm test` | Run unit tests (Vitest) |
| **test:watch** | `npm run test:watch` | Run tests in watch mode |
| **test:coverage** | `npm run test:coverage` | Run tests with coverage report |
| **test:e2e** | `npm run test:e2e` | Run E2E tests (Playwright) |
| **test:mutation** | `npm run test:mutation` | Run mutation tests (Stryker) |

---

## Development Workflow

### 1. Feature Development

```bash
# Start dev server
cd web && npm run dev

# Run tests in watch mode (separate terminal)
npm run test:watch

# Before committing
npm test && npm run build
```

### 2. Testing Strategy

| Test Type | Tool | Command | Coverage Target |
|-----------|------|---------|-----------------|
| Unit | Vitest | `npm test` | 80%+ |
| Integration | Vitest | `npm test` | Core paths |
| E2E | Playwright | `npm run test:e2e` | Critical flows |
| Mutation | Stryker | `npm run test:mutation` | Quality check |

### 3. Code Quality

- **TypeScript**: Strict mode with `noUnusedLocals`, `noUnusedParameters`
- **No linter configured**: TypeScript handles code quality
- **No formatter configured**: Use consistent 2-space indentation

---

## Environment Variables

This is a **client-side application** with no server-side secrets.

All configuration lives in:
- `shared/constants.json` - Application constants
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript settings

---

## Testing Procedures

### Running Unit Tests

```bash
cd web
npm test                    # Run all tests once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

### Running E2E Tests

```bash
cd web
npx playwright install      # First time only
npm run test:e2e            # Run all E2E tests
npm run test:e2e -- --ui    # Interactive mode
```

### Running Mutation Tests

```bash
cd web
npm run test:mutation       # Verify test quality
```

---

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use For |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring |
| `test:` | Test additions/changes |
| `chore:` | Build/tooling changes |

Example: `feat: add harvest dialog animation`

---

## Project Structure

```
trunk/
├── web/                    # Vite + TypeScript web app
│   ├── src/
│   │   ├── main.ts         # Entry point
│   │   ├── events/         # Event sourcing
│   │   ├── features/       # Business logic
│   │   ├── ui/             # DOM rendering
│   │   └── tests/          # Unit tests
│   └── e2e/                # Playwright tests
├── ios/                    # Swift + SwiftUI iOS app
├── shared/                 # Cross-platform specs
│   ├── constants.json      # Magic numbers
│   ├── formulas.md         # Progression math
│   └── schemas/            # JSON schemas
└── docs/                   # Documentation
```

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Full codebase guide
- [ONBOARDING.md](./ONBOARDING.md) - Quick start and common tasks
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [INTERFACES.md](./INTERFACES.md) - Module APIs
