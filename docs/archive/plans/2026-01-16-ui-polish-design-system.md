# UI Polish & Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the last 10% of UI/UX by establishing a consistent design system and applying it across all components.

**Architecture:** Define spacing scale (6 steps), type scale (5 steps), and border/button treatments as CSS custom properties in base.css. Then systematically sweep through layout.css and components.css to replace ad-hoc values with design tokens.

**Tech Stack:** Vanilla CSS with CSS custom properties (no build step for styles)

---

## Task 1: Design Tokens Foundation

**Files:**
- Modify: `src/styles/base.css:1-15`

**Step 1: Add spacing and type scale tokens**

Replace the existing `:root` tokens block with:

```css
/* === Tokens === */
:root {
  color-scheme: light;

  /* Typography */
  --font-display: "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif;
  --font-body: "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif;
  --font-ascii: "DotGothic16", "SF Mono", "Monaco", monospace;

  /* Type Scale (5 steps) */
  --text-xs: 0.625rem;   /* 10px - meta, hints */
  --text-sm: 0.75rem;    /* 12px - labels, secondary */
  --text-base: 0.875rem; /* 14px - body text */
  --text-lg: 1rem;       /* 16px - emphasis */
  --text-xl: 1.125rem;   /* 18px - headings */

  /* Spacing Scale (6 steps) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.5rem;   /* 24px */
  --space-6: 2rem;     /* 32px */

  /* Colors */
  --ink: #2b1a12;
  --ink-light: #4a3325;
  --ink-faint: #6f5644;
  --wood: #6b4423;
  --twig: #3a6b4a;
  --paper: #f8f6f1;
  --water: steelblue;
  --sun: #d4a000;

  /* Borders (3 treatments) */
  --border-subtle: rgba(60, 40, 20, 0.08);
  --border: rgba(60, 40, 20, 0.15);
  --border-strong: rgba(60, 40, 20, 0.25);

  /* Semantic */
  --success-tone: var(--twig);
  --warning-tone: #8b6b2f;
  --error-tone: #8a4a3a;

  /* Legacy (for transition) */
  --char: 16px;
}
```

**Step 2: Verify no build errors**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/styles/base.css
git commit -m "feat: add design system tokens for spacing and typography"
```

---

## Task 2: Harmonize Resource Meters

**Files:**
- Modify: `src/styles/layout.css:7-131`

**Step 1: Create unified meter component**

Replace the three separate meter definitions (soil-meter, water-meter, sun-meter) with a single `.resource-meter` base class and color modifiers:

```css
/* === Resource Meters (unified) === */
.resource-meter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-ascii);
  border: 1px solid var(--meter-color, var(--border));
  background: var(--meter-bg, transparent);
}

.resource-meter-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--meter-color, var(--ink-faint));
  white-space: nowrap;
}

.resource-meter-track {
  width: 80px;
  height: 6px;
  background: var(--border-subtle);
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.resource-meter-fill {
  height: 100%;
  background: var(--meter-color, var(--ink));
  opacity: 0.7;
  transition: width 400ms ease;
}

.resource-meter-value {
  font-size: var(--text-xs);
  color: var(--meter-color, var(--ink-faint));
  min-width: 3ch;
  text-align: right;
}

/* Meter color variants */
.soil-meter {
  --meter-color: var(--wood);
  --meter-bg: rgba(107, 68, 35, 0.04);
}

.water-meter {
  --meter-color: var(--water);
  --meter-bg: rgba(70, 130, 180, 0.04);
}

.sun-meter {
  --meter-color: var(--sun);
  --meter-bg: rgba(212, 160, 0, 0.04);
}
```

**Step 2: Update HTML class references**

In `src/ui/dom-builder.ts`, ensure meter elements use both base and modifier classes:
- `class="resource-meter soil-meter"`
- `class="resource-meter water-meter"`
- `class="resource-meter sun-meter"`

And child elements use unified classes:
- `resource-meter-label`
- `resource-meter-track`
- `resource-meter-fill`
- `resource-meter-value`

**Step 3: Verify meters display correctly**

Run: `npm run dev`
Visually verify all three meters render with correct colors and alignment.

**Step 4: Commit**

```bash
git add src/styles/layout.css src/ui/dom-builder.ts
git commit -m "refactor: unify resource meter styling with design tokens"
```

---

## Task 3: Unify Button Treatments

**Files:**
- Modify: `src/styles/components.css:10-38`

**Step 1: Define button base and variants**

Replace scattered button styles with a unified system:

```css
/* === Button System === */

/* Base button reset */
.btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-ascii);
  font-size: var(--text-sm);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: transparent;
  border: 1px solid transparent;
  color: var(--ink-faint);
  cursor: pointer;
  transition: all 150ms ease;
}

.btn:hover:not(:disabled) {
  color: var(--ink);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Ghost: text only, no border */
.btn-ghost {
  border-color: transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
}

/* Outline: visible border */
.btn-outline {
  border-color: var(--border);
}

.btn-outline:hover:not(:disabled) {
  border-color: var(--ink-faint);
}

/* Filled: solid background */
.btn-filled {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.btn-filled:hover:not(:disabled) {
  background: var(--ink-light);
  border-color: var(--ink-light);
}

/* Color variants */
.btn-twig {
  --btn-color: var(--twig);
}

.btn-twig.btn-outline {
  border-color: var(--twig);
  color: var(--twig);
}

.btn-twig.btn-outline:hover:not(:disabled) {
  background: rgba(58, 107, 74, 0.08);
}

.btn-water {
  --btn-color: var(--water);
}

.btn-water.btn-outline {
  border-color: var(--water);
  color: var(--water);
}

.btn-water.btn-outline:hover:not(:disabled) {
  background: rgba(70, 130, 180, 0.08);
}

.btn-sun {
  --btn-color: var(--sun);
}

.btn-sun.btn-outline {
  border-color: var(--sun);
  color: var(--sun);
}

.btn-sun.btn-outline:hover:not(:disabled) {
  background: rgba(212, 160, 0, 0.08);
}

/* Size variants */
.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
}

.btn-lg {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-base);
}
```

**Step 2: Migrate existing buttons to new system**

Update these component classes to use the new button system:
- `.action-button` → `.btn .btn-ghost`
- `.sprout-action-btn` → `.btn .btn-outline .btn-sm`
- `.sprout-water-btn` → `.btn .btn-outline .btn-sm .btn-water`
- Dialog buttons (cancel/save) → `.btn .btn-outline` / `.btn .btn-outline .btn-twig`

**Step 3: Verify buttons display correctly**

Run: `npm run dev`
Test all button interactions across the app.

**Step 4: Commit**

```bash
git add src/styles/components.css src/ui/*.ts
git commit -m "refactor: unify button styling with design system"
```

---

## Task 4: Clean Up Dialog Styling

**Files:**
- Modify: `src/styles/components.css:2170-2500` (water dialog, shine dialog)
- Modify: `src/styles/components.css:1066-1210` (sprouts dialog)
- Modify: `src/styles/components.css:1210-1600` (garden guide dialog)

**Step 1: Create dialog base component**

Add unified dialog foundation:

```css
/* === Dialog System === */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  animation: fade-in 150ms ease;
}

.dialog-backdrop.hidden {
  display: none;
}

.dialog-box {
  width: min(520px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: scale-in 200ms ease;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.dialog-title {
  margin: 0;
  font-family: var(--font-ascii);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--ink);
}

.dialog-close {
  background: transparent;
  border: none;
  font-size: var(--text-xl);
  line-height: 1;
  color: var(--ink-faint);
  cursor: pointer;
  padding: 0;
  transition: color 150ms ease;
}

.dialog-close:hover {
  color: var(--ink);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
```

**Step 2: Apply dialog system to water/shine/sprouts/guide dialogs**

Update each dialog to use base classes plus theme-specific accent colors.

**Step 3: Verify all dialogs display consistently**

Run: `npm run dev`
Open each dialog type and verify visual consistency.

**Step 4: Commit**

```bash
git add src/styles/components.css
git commit -m "refactor: unify dialog styling with design system"
```

---

## Task 5: Polish Cards and Panels

**Files:**
- Modify: `src/styles/components.css:645-750` (sprout cards)
- Modify: `src/styles/components.css:163-204` (side panel)

**Step 1: Create card base component**

```css
/* === Card System === */
.card {
  padding: var(--space-2);
  border: 1px solid var(--border);
  background: transparent;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.card-title {
  margin: 0;
  font-family: var(--font-ascii);
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.3;
}

.card-meta {
  font-family: var(--font-ascii);
  font-size: var(--text-xs);
  color: var(--ink-faint);
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

/* Card states */
.card.is-clickable {
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
}

.card.is-clickable:hover {
  border-color: var(--ink-faint);
  background: rgba(0, 0, 0, 0.02);
}

/* Card accents */
.card-success {
  border-left: 2px solid var(--twig);
}

.card-warning {
  border-left: 2px solid var(--warning-tone);
}

.card-error {
  border-left: 2px solid var(--error-tone);
}
```

**Step 2: Standardize side panel spacing**

Update `.side-panel` and children to use spacing tokens:

```css
.side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-family: var(--font-ascii);
  font-size: var(--text-sm);
  height: 100%;
  animation: fade-in 600ms ease 100ms both;
}

.panel-section {
  padding: var(--space-2) 0;
}
```

**Step 3: Apply card system to sprout cards**

Migrate `.sprout-card`, `.leaf-card`, etc. to use unified card classes.

**Step 4: Verify visual consistency**

Run: `npm run dev`
Check sidebar and all card types.

**Step 5: Commit**

```bash
git add src/styles/components.css
git commit -m "refactor: unify card and panel styling with design tokens"
```

---

## Task 6: Tighten Header Layout

**Files:**
- Modify: `src/styles/layout.css:1-6`
- Modify: `src/styles/layout.css:217`

**Step 1: Align header elements with spacing tokens**

```css
.app-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
}

.app-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}
```

**Step 2: Group resource meters consistently**

Consider wrapping meters in a `.meter-group` for visual cohesion:

```css
.meter-group {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}
```

**Step 3: Verify header layout**

Run: `npm run dev`
Check header alignment at various viewport widths.

**Step 4: Commit**

```bash
git add src/styles/layout.css src/ui/dom-builder.ts
git commit -m "refactor: tighten header layout with design tokens"
```

---

## Task 7: Final Cleanup Pass

**Files:**
- Modify: `src/styles/components.css` (various)

**Step 1: Search for remaining hardcoded values**

Search for patterns that should use tokens:
- `0.25rem`, `0.35rem`, `0.5rem` → `var(--space-*)`
- `0.6rem`, `0.65rem`, `0.7rem`, `0.75rem`, `0.8rem` → `var(--text-*)`
- `rgba(60, 40, 20, *)` → `var(--border-*)`

**Step 2: Replace remaining ad-hoc values**

Systematically update any remaining values to use design tokens.

**Step 3: Remove unused CSS**

Delete any orphaned styles from the old implementations.

**Step 4: Final visual verification**

Run: `npm run dev`
Click through entire app, all views, all dialogs.

**Step 5: Commit**

```bash
git add src/styles/*.css
git commit -m "chore: final cleanup of design system migration"
```

---

## Summary

| Task | Focus | Files |
|------|-------|-------|
| 1 | Design tokens | base.css |
| 2 | Resource meters | layout.css, dom-builder.ts |
| 3 | Button system | components.css, *.ts |
| 4 | Dialog system | components.css |
| 5 | Cards & panels | components.css |
| 6 | Header layout | layout.css, dom-builder.ts |
| 7 | Final cleanup | *.css |
