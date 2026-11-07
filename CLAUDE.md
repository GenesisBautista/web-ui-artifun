# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of standalone front-end UI "bits" (e.g. an animated wave background, a glowing button, a particle field). The user asks for a bit; Claude builds it. Every bit must be:

1. **Isolated** — lives in its own folder under `bits/` and shares nothing with other bits. No shared libs, no shared CSS, no cross-folder imports. Duplicating small helpers (like the control panel code) per bit is intended.
2. **Viewable in a browser** — each bit has a demo page.
3. **Adjustable** — the demo page has a live control panel (sliders, color pickers, toggles, selects) for every parameter that affects look and feel.
4. **Exportable** — copying the bit's folder (or one file) into any web project should just work, regardless of framework.
5. **Portable to native** — parameters are described in a platform-neutral schema so the bit can be ported to iOS (SwiftUI) / Android (Jetpack Compose) or embedded via WebView.

## Running

No build step, no dependencies. Serve the repo root with any static server (ES modules don't load over `file://`):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/bits/<bit-name>/`.

## Bit folder layout

```
bits/<bit-name>/            # kebab-case, descriptive: wave-background, neon-button
  index.html                # demo page: full preview + control panel + export buttons
  <bit-name>.js             # the bit itself — the only file a consumer needs
  README.md                 # usage: plain HTML, React, Vue/Svelte, WebView, param table
  native/                   # optional, only when asked: SwiftUI / Compose ports
```

### `<bit-name>.js` — the exportable unit

- Vanilla JS ES module defining a **Web Component** (`<ui-bit-name>`, e.g. `<ui-wave-background>`). Web Components work in plain HTML, React, Vue, Svelte, Angular, and inside a mobile WebView, which is why this format is the default.
- Self-contained: styles live inside the component (Shadow DOM), no external assets unless unavoidable (then inline them as data URIs or SVG).
- Export a `PARAMS` array as the single source of truth for adjustable parameters:
  ```js
  export const PARAMS = [
    { name: 'speed', label: 'Speed', group: 'Motion',  type: 'range', min: 0, max: 5, step: 0.1, default: 1 },
    { name: 'color', label: 'Color', group: 'Color',   type: 'color', default: '#4f8cff' },
    { name: 'glow',  label: 'Glow',  group: 'Effects', type: 'toggle', default: true },
    { name: 'shape', label: 'Shape', group: 'Layout',  type: 'select', options: ['sine', 'square'], default: 'sine' },
  ];
  ```
  Types: `range`, `color`, `toggle`, `select`. Units go in the label or a `unit` field.
- Every param is settable three ways: HTML attribute (`speed="2"`, observed via `observedAttributes`), JS property (`el.speed = 2`), and a CSS custom property where it makes sense (`--ui-wave-color`). Attribute changes must update live without re-mounting.
- Animated bits: use `requestAnimationFrame`, size canvases with `devicePixelRatio` and a `ResizeObserver`, stop all loops/observers in `disconnectedCallback`, pause when offscreen/hidden, and honor `prefers-reduced-motion`.

### Before building: ask what's adjustable

Never pick the parameters silently. Before writing a new bit, propose a grouped list of candidate params (name, control type, rough range, default) and ask the user which to keep, drop, or add. Build only after they confirm. Same when a change to an existing bit would add or remove params.

### `index.html` — the demo (design-app feel)

Layout and feel modeled on Figma / design tools:

- **Top toolbar** (thin): bit name, zoom controls (fit / 100% / +/-), preview background toggle (light / dark / checkerboard), viewport presets (desktop / tablet / phone frame), and export actions.
- **Center canvas**: the main view, takes most of the screen. Neutral background, bit rendered inside a frame that can be zoomed and panned. The bit is always the focus.
- **Right inspector panel** (~260–300px, fixed): every control, built **from `PARAMS`** (don't hand-write each control). Params carry a `group` field (e.g. Layout, Color, Motion, Effects); groups render as collapsible sections with small uppercase headers.
- **Control style**: compact, dense, dark UI chrome; small type (11–12px), subtle borders. Ranges = slider + editable numeric field (drag-to-scrub on the label, arrow keys nudge, shift = 10×). Colors = swatch + hex field (+ opacity when relevant). Toggles = switches. Selects = segmented control when ≤4 options, dropdown otherwise. Per-param reset on double-click of the label.
- **Export actions**: Reset all, Copy HTML snippet (the `<ui-…>` tag with current attribute values), Copy params JSON (current values — the handoff format for native ports).
- Inspector collapses (shortcut + button) for an unobstructed view; at phone width it becomes a bottom sheet.

### Native / mobile

- Default answer for mobile is embedding via WebView (README shows how). Write `native/` SwiftUI or Compose ports only when the user asks, and keep param names, ranges and defaults identical to `PARAMS` so a params JSON from the demo drives either platform.
