# Trunk

**Reap what you sow**

A personal growth and goal-tracking application built around gardening metaphors. Cultivate "sprouts" (goals) on a visual tree structure, nurturing them with daily attention ("water") and weekly reflection ("sun") to grow your capacity over time.

## Monorepo Structure

```
trunk/
├── web/           # Web application (Vite + TypeScript)
├── app/           # iOS application (Swift + SwiftUI)
├── shared/        # Shared constants, schemas, and specifications
└── docs/          # Documentation and planning
```

## Projects

### Web App (`./web`)

Vite-based web application running on modern browsers.

**Development:**
```bash
cd web
npm install
npm run dev
```

**Build:**
```bash
cd web
npm run build
```

**Test:**
```bash
cd web
npm test
```

See [web/README.md](./web/README.md) for details.

### iOS App (`./app`)

Native iOS application built with Swift and SwiftUI.

**Status:** In development

See [app/README.md](./app/README.md) for details.

### Shared Specs (`./shared`)

Platform-agnostic constants, data schemas, and formulas.

See [shared/README.md](./shared/README.md) for details.

## Philosophy

Growth is slow, deliberate, and intrinsically rewarding—like cultivating a bonsai tree. The system rewards patience, commitment, and honest effort over decades, not sprints.

## Documentation

- [Progression System](./docs/progression-system.md) - Mathematical formulas and growth curves
- [Planning Documents](./docs/plans/) - Implementation plans and design docs
- [CLAUDE.md](./CLAUDE.md) - AI assistant instructions
- [AGENTS.md](./AGENTS.md) - Agent documentation

## Contributing

See individual project READMEs for development workflows.

## License

Private project - All rights reserved
