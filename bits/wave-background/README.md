# Wave Background

Bird's-eye view of ocean swell as a moving gradient. Color follows wave height: troughs go to **Deep** (`color1`), crests go to **Crest** (`color2`). An optional third color can play one of four roles, and film grain can go on top.

The whole bit is the single file `wave-background.js`. It's a dependency-free Web Component rendered with WebGL2. If WebGL2 is unavailable, it falls back to a static CSS gradient.

## Use

### Plain HTML
```html
<script type="module" src="wave-background.js"></script>

<ui-wave-background
  color1="#0a1f44"
  color2="#7fd6e8"
  grain-amount="0.2"
  style="position:fixed; inset:0; z-index:-1"
></ui-wave-background>
```
The element fills its container (`width/height: 100%`), so give the parent or the element a size.

### React
```jsx
import './wave-background.js';

export function Hero() {
  // React 19 passes props to custom elements directly; on React ≤18 use string attributes as below.
  return <ui-wave-background color1="#0a1f44" color2="#7fd6e8" speed="0.8" style={{ height: '100vh' }} />;
}
```

### Vue / Svelte / Angular
Import the file once, then use `<ui-wave-background>` like any element. For Vue, add `compilerOptions.isCustomElement = tag => tag.startsWith('ui-')`. For Angular, add `CUSTOM_ELEMENTS_SCHEMA`.

### JS API
```js
const el = document.querySelector('ui-wave-background');
el.speed = 1.2;                       // any param, camelCase
el.setParams({ color1: '#001', accent: true, accentMode: 'contour' });  // e.g. paste the demo's JSON
el.getParams();                       // current values
```

### CSS custom properties
Every param can also be set as `--ui-wave-<kebab-name>`. An attribute or property wins over the CSS variable. Colors must be hex.
```css
.dark ui-wave-background { --ui-wave-color1: #000814; --ui-wave-color2: #3a86ff; }
```

### iOS / Android (WebView)
Ship `wave-background.js` plus a tiny HTML page in the app bundle and load it in a `WKWebView` (iOS) or `WebView` (Android). Push params from native code with the demo's JSON:
```js
document.querySelector('ui-wave-background').setParams(PARAMS_JSON);
```
Swift: `webView.evaluateJavaScript("...setParams(\(json))")`. Kotlin: `webView.evaluateJavascript("...setParams($json)", null)`.

## Params

| Group | Attribute | Type | Range / options | Default |
|---|---|---|---|---|
| Color | `color1` (Deep) | color | hex | `#0a1f44` |
| Color | `color2` (Crest) | color | hex | `#7fd6e8` |
| Color | `contrast` | range | 0.2 – 3 | 1 |
| Color | `balance` | range | 0 – 1 (higher = more crest color) | 0.5 |
| Third color | `accent` | toggle | — | false |
| Third color | `accent-color` | color | hex | `#f4f1e8` |
| Third color | `accent-mode` | select | `midtone` · `crest` · `trough` · `contour` | `crest` |
| Third color | `accent-position` | range | 0 – 1 | 0.75 |
| Third color | `accent-softness` | range | 0 – 0.5 | 0.1 |
| Waves | `scale` | range | 0.2 – 5 | 1.5 |
| Waves | `detail` | range | 1 – 8 (layers) | 5 |
| Waves | `choppiness` | range | 0 – 1 | 0.3 |
| Waves | `direction` | range | 0 – 360° | 45 |
| Motion | `speed` | range | 0 – 3 | 0.6 |
| Motion | `turbulence` | range | 0 – 2 | 0.5 |
| Motion | `loop-length` | range | 4 – 60 s | 20 |
| Motion | `paused` | toggle | — | false |
| Grain | `grain` | toggle | — | true |
| Grain | `grain-amount` | range | 0 – 1 | 0.15 |
| Grain | `grain-size` | range | 0.5 – 4 px | 1 |
| Grain | `grain-animated` | toggle | — | true |

Toggles accept `"true"`/`"false"`, and a bare attribute means true.

### Third color roles
- **Mid tone**: a three-stop gradient, Deep → third color → Crest. `accent-position` sets where the middle stop sits. Softness is unused.
- **Crest foam**: tints the peaks above `accent-position`. Softness feathers the edge.
- **Trough shadow**: tints the deeps below `accent-position`. Softness feathers the edge.
- **Contour lines**: draws topographic lines of equal height. `accent-position` sets line density, and softness sets line width.

## Behavior notes
- **Seamless loop**: the motion repeats exactly every `loop-length` seconds, and the last frame flows into the first with no visible seam. This makes it safe to screen-record a loop for video or GIF. It works by cross-fading the wave field with a copy of itself shifted back one loop.
- Rendering pauses when the element is offscreen or the tab is hidden.
- `prefers-reduced-motion: reduce` freezes the animation; the bit stays as a still frame.
- Pixel ratio is capped at 2× for performance.
