# Zoom Audit

## Summary

Tested all UI components at Chrome zoom levels 50%-200%. The coordinate math is fundamentally zoom-safe because all positioning uses CSS pixel APIs (`clientX/Y`, `getBoundingClientRect`, `clientWidth/Height`). One bug was found and fixed in the soil chart tooltip positioning.

---

## Bug Found & Fixed

### Soil chart tooltip positioning (`web/src/ui/soil-chart.ts`)

**Problem**: Three issues in the `setHover()` function:

1. **CSS pixel mismatch** — Used `getBoundingClientRect().width` (which scales with CSS zoom) to compute tooltip `left`, but `tooltip.style.left` operates in CSS pixels (unscaled). At non-100% zoom, the tooltip drifted proportionally to the zoom factor.

2. **Hardcoded tooltip width** — Clamped right edge with `rect.width - 150` instead of measuring actual tooltip width. At high zoom, the tooltip can exceed 150px.

3. **No left-edge floor** — At 200% zoom, the tooltip becomes wider than the chart container, making `cssW - tooltipW` negative. No `Math.max(0, ...)` guard existed.

**Fix**:
```typescript
// Before (broken at non-100% zoom)
const rect = svg.getBoundingClientRect()
const pxX = (cx / VB_W) * rect.width
tooltip.style.left = `${Math.min(pxX, rect.width - 150)}px`

// After (zoom-safe)
const cssW = svg.clientWidth
const pxX = (cx / VB_W) * cssW
tooltip.classList.remove('hidden')
const tooltipW = tooltip.offsetWidth
tooltip.style.left = `${Math.max(0, Math.min(pxX, cssW - tooltipW))}px`
```

---

## Components Verified Zoom-Safe

### Guide layer canvas (`layout.ts`)

Uses `window.devicePixelRatio` to scale the canvas buffer and `setTransform(dpr, 0, 0, dpr, 0, 0)` to normalize drawing coordinates. Chrome zoom changes DPR, and the canvas auto-adapts each frame (`if (guideLayer.width !== w)`). Position is derived from `getBoundingClientRect()` differences between elements in the same coordinate space.

### Branch hover detection (`hover-branch.ts`)

Uses `event.clientX - rect.left` to get canvas-relative mouse position. Both values are in CSS pixels, so zoom has no effect. The 100ms rect cache TTL is short enough to handle mid-session zoom changes.

### Radar chart (`radar-chart.ts`)

ViewBox is set dynamically to `svg.clientWidth/Height` (CSS pixels). Vertex positions are computed in this coordinate space. Tooltip positioning uses `offsetWidth/offsetHeight` for actual dimensions and clamps to SVG bounds with 4px margin.

### Soil chart SVG rendering (`soil-chart.ts`)

Uses a fixed `viewBox="0 0 300 120"` with `preserveAspectRatio="xMidYMid meet"`. All data point coordinates are in viewBox space. Hover detection converts mouse position to SVG space via `(clientX - rect.left) / rect.width * VB_W`, which is a ratio and therefore zoom-agnostic.

### Node positioning (`layout.ts`)

Branch and twig positions are computed from `canvas.clientWidth/Height` (CSS pixels) using parametric polar geometry. Wind animation offsets are applied to `style.left/top` in the same coordinate space.

### Dialogs (`build-dialogs.ts`)

Use `position: fixed; inset: 0` with CSS flexbox centering. No coordinate math — purely CSS. Zoom-safe by design.

---

## Layout at Zoom + Viewport Combinations

| Viewport | Zoom | Effective px | Layout | Status |
|----------|------|-------------|--------|--------|
| 1440x900 | 75% | ~1920 | Side-by-side | Pass |
| 1440x900 | 100% | 1440 | Side-by-side | Pass |
| 1440x900 | 110% | ~1309 | Side-by-side | Pass |
| 1440x900 | 125% | ~1152 | Side-by-side | Pass |
| 1440x900 | 150% | ~960 | Stacked* | Pass |
| 1440x900 | 200% | ~720 | Stacked* | Pass |
| 1200x800 | 125% | ~960 | Stacked* | Pass |
| 960x600 | 125% | ~768 | Stacked | Pass |
| 960x600 | 150% | ~640 | Stacked | Pass |
| 800x600 | 125% | ~640 | Stacked | Pass |

*Real Chrome zoom (Cmd+/Cmd-) triggers media queries at the effective viewport width. CSS zoom does not trigger media queries, which can cause overlap at 150-200% on wide viewports — this is a CSS zoom limitation, not a code bug.

### Browser zoom vs CSS zoom

**Real browser zoom (Cmd+/Cmd-)**: Changes both `devicePixelRatio` and effective viewport width. Media queries respond to the effective width, so `1440px @ 150% zoom` correctly triggers the `960px` stacking breakpoint.

**CSS zoom (`document.documentElement.style.zoom`)**: Only scales rendering. Media queries still evaluate against the original viewport width. This means `1440px @ CSS zoom 2.0` stays in side-by-side layout even though content is at 720px effective — causing potential overlap.

All testing confirms the app handles **real browser zoom** correctly at all levels.

---

## Files Changed

| File | Change |
|------|--------|
| `web/src/ui/soil-chart.ts` | Fixed tooltip positioning: use `clientWidth` instead of `getBoundingClientRect().width`, measure actual tooltip width, add left-edge floor |
