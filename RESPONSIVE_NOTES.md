# Responsive Design Notes

## Breakpoints

| Breakpoint | Layout behavior |
|------------|----------------|
| `> 960px` | Side-by-side grid: tree panel + sidebar (clamp 280-360px) |
| `<= 960px` | Single-column stack: tree on top, sidebar below. Body scrolls vertically. |
| `<= 720px` | Tighter padding, smaller logo (64px), canvas scale bumped to 1.1 |
| `<= 520px` | Action buttons go 50% width, canvas scale reduced to 0.9, email truncated |
| `pointer: coarse` | Min-height 44px on interactive elements |

## Minimum Supported Width

`body { min-width: 360px }` — below this, layout is not guaranteed.

## Key Design Decisions

### Tree Containment (stacked mode)

The tree canvas uses `transform: scale()` which creates visual extent beyond its layout box. CSS `overflow: hidden` on the canvas itself clips in local (pre-transform) coordinates, so it doesn't help.

**Solution**: At `<= 960px`:
- `.map-panel` gets `overflow: hidden` (clips at the untransformed parent)
- `.canvas` gets `max-width: min(100%, 600px)` + `margin: 0 auto` to constrain size
- `--base-scale` reduced from 1.375 to 1 (no magnification in stacked mode)
- `.guide-layer` gets `clip-path: inset(0)` to clip guide lines

### Scrolling in Stacked Mode

At full desktop, `body { overflow: hidden; height: 100vh }` prevents scrolling (everything fits in viewport). In stacked mode, tree + sidebar + soil chart exceeds viewport height.

**Solution**: At `<= 960px`:
- `body { overflow-y: auto; height: auto; min-height: 100vh }`
- `#app, .app-shell { height: auto; min-height: 100% }`
- `.app-body { grid-template-rows: auto auto }` (size rows to content)
- `.map-panel { flex: none }` (don't stretch to fill)

### Sidebar Width

Changed from fixed `360px` to `clamp(280px, 30vw, 360px)` — flexes between 280-360px based on viewport before stacking.

### Twig View Positioning

At `<= 960px`, `.twig-view` switches from `position: absolute; inset: -4.5rem 0 -2rem 0` to `position: relative; inset: auto` so it flows within the stacked layout.

`.leaf-view` switches to `position: fixed; inset: 0` for a proper full-screen overlay.

### Soil Chart SVG

Changed `preserveAspectRatio` from `none` to `xMidYMid meet` so the chart scales proportionally instead of stretching.

### Logo Positioning

Fixed `right: -1.75rem` to `right: 0` to prevent overflow at narrow widths. At `<= 720px`, logo shrinks to 64px.

## Files Modified

| File | Changes |
|------|---------|
| `web/src/styles/layout.css` | Grid stacking, canvas containment, scroll behavior, meter track sizing, logo positioning |
| `web/src/styles/base.css` | `min-width: 360px` on body |
| `web/src/styles/twig-view.css` | Stacked positioning for twig/leaf views, header padding |
| `web/src/styles/soil-chart.css` | Range button wrapping |
| `web/src/ui/soil-chart.ts` | `preserveAspectRatio` fix |
