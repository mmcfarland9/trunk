# Responsive Audit

## Summary

The app is well-structured at full desktop (1440px+) but breaks progressively below 960px. The core issue is that the tree visualization uses absolute positioning within a CSS-transformed container, and when the layout stacks at narrow viewports, tree nodes overflow their container and overlap sidebar content.

---

## Breakages by Viewport

### 960px wide (existing stack breakpoint)
- **Tree/sidebar overlap**: Layout stacks to single column, but tree nodes positioned with `position: absolute` extend outside `.canvas` container and overlap sidebar sprout list below
- **Branch labels collide with sidebar text**: BACK, HEART nodes overlap "Growing" section header and sprout items
- **Very long page**: Tree + full sidebar + soil chart = excessive scroll depth

### 800x600
- **Worse overlap**: Branch nodes (BACK, BREATH, VOICE) extend into sidebar content area
- **Tree too large**: Canvas still tries to maintain 14:9 aspect ratio, takes too much vertical space before sidebar starts
- **Sidebar focus text overlaps branch labels**: "TRUNK / E2E Tester" text collides with FEET branch label

### 600x800
- **Severe tree overflow**: Branch labels extend beyond viewport edges (BACK goes off-screen left)
- **Sidebar content mixed with tree nodes**: Growing sprout list items render between/behind branch nodes
- **Radar chart polygon becomes tiny**: Barely visible at center

### 400x700
- **Tree crushed to unusable size**: Radar chart indistinguishable, node labels overlap each other
- **Branch labels stack on top of each other**: BREATH/HANDS, BACK/FEET pairs collide
- **Sidebar works well alone**: Once past the tree, the sprout list and soil chart flow correctly
- **Logo overlaps meters**: Trunk logo partially covers Sun meter

### 150% zoom
- **Left-side nodes clip**: BACK and BREATH branch labels extend off-screen left
- **Canvas doesn't recompute**: Effective viewport of ~960px triggers stack but zoom-scaled sizes don't account for this
- **Sidebar scrollable area truncated**: Sprout list cut off at bottom

### 75% zoom
- **Excessive whitespace**: Content doesn't expand to fill available space (capped at 1400px `.app-shell`)
- **Small touch targets**: Everything shrinks proportionally, buttons may become too small

### Branch view at 500px
- **Twig nodes overlap sidebar**: In stacked layout, the twig ring extends into sidebar content
- **Trunk asterisk overlaps soil chart**: The minimized trunk indicator sits on top of chart area
- **Guide line dots visible through sidebar**: Canvas guide layer renders on top of stacked sidebar

### Twig view at 500px
- **3-column layout doesn't collapse properly**: NEW, GROWING, CULTIVATED columns overlap before hitting the 720px single-column breakpoint
- **Twig view `position: absolute; inset` clashes with stacked layout**: The twig view overlay doesn't account for stacked mode
- **Sidebar content shows through twig view**: At narrow widths, both twig view and sidebar try to occupy the same vertical space

---

## Root Causes

### 1. Canvas container doesn't clip overflow
```css
.canvas { position: relative; /* no overflow: hidden */ }
```
Nodes positioned at `-50%` translate extend well beyond container bounds. In side-by-side layout this is fine (sidebar is in a separate grid column). In stacked layout, nodes bleed into content below.

### 2. Fixed 360px sidebar width
```css
.app-body { grid-template-columns: minmax(0, 1fr) 360px; }
```
The sidebar is always 360px until it stacks. There's no intermediate "narrow sidebar" step.

### 3. Tree sizing doesn't account for stacked mode
```css
.canvas {
  width: min(100%, 1100px, calc(var(--canvas-max-height) * 14 / 9));
  aspect-ratio: 14 / 9;
}
```
At 960px stacked, the canvas takes full width (up to 1100px) which creates an oversized tree. It needs to be constrained in stacked mode.

### 4. No global min-width
No `min-width` on body or app-shell. Below ~500px the layout becomes physically unusable but still tries to render.

### 5. Twig view uses absolute positioning
```css
.twig-view { position: absolute; inset: -4.5rem 0 -2rem 0; }
```
This works when the canvas has a defined size in grid layout, but breaks in stacked mode where the canvas size is variable.

### 6. Logo positioning is fragile
```css
.header-logo { position: absolute; top: 2rem; right: -1.75rem; }
```
Negative right margin causes logo to extend outside container at narrow widths.

---

## Elements Using Fixed px That Should Be Relative

| Element | Current | Recommendation |
|---------|---------|----------------|
| `.app-body` grid column | `360px` | `clamp(280px, 30vw, 360px)` |
| `.header-logo` width | `144px` / `64px` | Keep but adjust positioning |
| `.header-logo` right | `-1.75rem` | `0` or responsive value |
| `.soil-meter-track` width | `80px` | `clamp(60px, 8vw, 100px)` |
| `.canvas` max-width | `1100px` | Reduce in stacked mode |
| `.twig-view` inset | `-4.5rem 0 -2rem 0` | Responsive inset |

---

## Existing Breakpoints

| Breakpoint | What happens |
|------------|-------------|
| `960px` | Grid stacks to single column |
| `720px` | Body padding shrinks, logo shrinks to 64px, twig view goes single-column |
| `520px` | Action buttons go 50% width |
| `pointer: coarse` | Min-height 44px on interactive elements |

---

## Screenshots

See `responsive-audit/` directory for captured screenshots at each size.
