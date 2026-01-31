# Onboarding Guide

## Quick Start

### Web App
```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

### iOS App
```bash
cd ios
open Trunk.xcodeproj  # Build with Cmd+R in Xcode
```

### Run Tests
```bash
cd web
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
```

---

## Project Layout Cheat Sheet

| Path | What's There |
|------|--------------|
| `web/src/main.ts` | Web entry point |
| `web/src/events/` | Event sourcing (state management) |
| `web/src/features/` | Business logic modules |
| `web/src/ui/` | DOM rendering |
| `ios/Trunk/` | iOS source |
| `shared/constants.json` | All magic numbers |
| `shared/formulas.md` | Progression math |
| `CLAUDE.md` | Detailed codebase guide |

---

## Common Tasks

### Adding a New Feature

1. **Business logic** → `web/src/features/new-feature.ts`
2. **UI components** → `web/src/ui/` (if needed)
3. **Wire it up** → `web/src/main.ts` (call setup function)
4. **Add tests** → `web/src/tests/new-feature.test.ts`

### Adding a New Event Type

1. Define type in `web/src/events/types.ts`
2. Add handler in `web/src/events/derive.ts`
3. Add schema in `shared/schemas/events.schema.json`
4. Add test fixtures in `shared/test-fixtures/`

### Modifying Progression Formulas

1. Update math in `shared/formulas.md` (source of truth)
2. Update `shared/constants.json` if values change
3. Update `web/src/events/derive.ts` (web implementation)
4. Update `ios/Trunk/Services/ProgressionService.swift` (iOS)
5. Run cross-platform parity tests

### Adding a Dialog/Modal

1. Create `web/src/features/new-dialog.ts`
2. Add styles to `web/src/styles/dialogs.css`
3. Add DOM structure in `web/src/ui/dom-builder.ts`
4. Wire callbacks in `web/src/main.ts`

### Debugging State Issues

1. Press `d` then `b` (within 500ms) → Debug panel
2. Check localStorage: `trunk-events-v1` (event log), `trunk-notes-v1` (legacy)
3. Use "Advance clock" to test time-based logic
4. Check `web/src/events/derive.ts` for derivation bugs

### Finding Where Something Lives

| Looking for... | Check... |
|----------------|----------|
| Magic numbers | `shared/constants.json` |
| Type definitions | `web/src/types.ts` |
| DOM element refs | `web/src/ui/dom-builder.ts` |
| CSS variables | `web/src/styles/base.css` (`:root` block) |
| State getters | `web/src/events/index.ts` |
| Node positioning | `web/src/ui/layout.ts` |
| Keyboard shortcuts | `web/src/main.ts` (search "keydown") |

---

## Key Patterns

### AppContext Object
Most functions receive `ctx` with all shared references:
```typescript
function doSomething(ctx: AppContext) {
  ctx.elements.sidebar  // DOM elements
  ctx.nodeLookup        // Map<nodeId, element>
  ctx.twigView          // Twig panel API
}
```

### CSS State Classes
- `.is-active` — selected/active state
- `.is-hovered` — hover state
- `.is-ready` — sprout ready to harvest
- `.hidden` — display: none

### View Mode Classes (on `.canvas`)
- `.is-overview` — all branches visible
- `.is-branch` — zoomed to one branch
- `.is-twig` — twig panel open

---

## Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| State not persisting | Forgot `saveState()` | Always call after mutations |
| Resources seem wrong | Derived from logs | Check event log, not counters |
| CSS not applying | Wrong specificity | Check view mode class context |
| Node not found | Wrong ID format | Use `branch-{b}-twig-{t}` |
| Tests failing | Stale fixtures | Regenerate from `shared/test-fixtures/` |

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Detailed codebase guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview and diagrams
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships and storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs and extension points
