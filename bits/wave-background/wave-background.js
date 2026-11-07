/**
 * <ui-wave-background> — bird's-eye ocean wave gradient.
 *
 * Self-contained Web Component (WebGL2). Color is driven by wave height:
 * troughs → color1, crests → color2, with an optional third color whose
 * role is picked by `accent-mode`. Optional film grain on top.
 *
 * Usage:
 *   <script type="module" src="wave-background.js"></script>
 *   <ui-wave-background color1="#0a1f44" color2="#7fd6e8"></ui-wave-background>
 *
 * Every param in PARAMS is settable as:
 *   - attribute   (kebab-case)  <ui-wave-background grain-amount="0.3">
 *   - property    (camelCase)   el.grainAmount = 0.3
 *   - CSS var                   --ui-wave-grain-amount: 0.3;
 * Precedence: attribute/property > CSS var > default.
 */

export const TAG = 'ui-wave-background';

export const PARAMS = [
  // Color
  { name: 'color1', label: 'Deep', group: 'Color', type: 'color', default: '#0a1f44' },
  { name: 'color2', label: 'Crest', group: 'Color', type: 'color', default: '#7fd6e8' },
  { name: 'contrast', label: 'Contrast', group: 'Color', type: 'range', min: 0.2, max: 3, step: 0.05, default: 1 },
  { name: 'balance', label: 'Balance', group: 'Color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },

  // Third color
  { name: 'accent', label: 'Enabled', group: 'Third color', type: 'toggle', default: false },
  { name: 'accentColor', label: 'Color', group: 'Third color', type: 'color', default: '#f4f1e8', showIf: 'accent' },
  {
    name: 'accentMode', label: 'Role', group: 'Third color', type: 'select', display: 'dropdown', default: 'crest', showIf: 'accent',
    options: [
      { value: 'midtone', label: 'Mid tone (3-stop gradient)' },
      { value: 'crest', label: 'Crest foam (peaks)' },
      { value: 'trough', label: 'Trough shadow (deeps)' },
      { value: 'contour', label: 'Contour lines' },
    ],
  },
  { name: 'accentPosition', label: 'Position', group: 'Third color', type: 'range', min: 0, max: 1, step: 0.01, default: 0.75, showIf: 'accent' },
  { name: 'accentSoftness', label: 'Softness', group: 'Third color', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.1, showIf: 'accent' },

  // Waves
  { name: 'scale', label: 'Scale', group: 'Waves', type: 'range', min: 0.2, max: 5, step: 0.05, default: 1.5 },
  { name: 'detail', label: 'Detail', group: 'Waves', type: 'range', min: 1, max: 8, step: 1, default: 5 },
  { name: 'choppiness', label: 'Choppiness', group: 'Waves', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3 },
  { name: 'direction', label: 'Direction', group: 'Waves', type: 'range', min: 0, max: 360, step: 1, default: 45, unit: '°' },

  // Motion
  { name: 'speed', label: 'Speed', group: 'Motion', type: 'range', min: 0, max: 3, step: 0.05, default: 0.6 },
  { name: 'turbulence', label: 'Turbulence', group: 'Motion', type: 'range', min: 0, max: 2, step: 0.05, default: 0.5 },
  { name: 'loopLength', label: 'Loop length', group: 'Motion', type: 'range', min: 4, max: 60, step: 1, default: 20, unit: 's' },
  { name: 'paused', label: 'Paused', group: 'Motion', type: 'toggle', default: false },

  // Grain
  { name: 'grain', label: 'Enabled', group: 'Grain', type: 'toggle', default: true },
  { name: 'grainAmount', label: 'Amount', group: 'Grain', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, showIf: 'grain' },
  { name: 'grainSize', label: 'Size', group: 'Grain', type: 'range', min: 0.5, max: 4, step: 0.1, default: 1, unit: 'px', showIf: 'grain' },
  { name: 'grainAnimated', label: 'Animated', group: 'Grain', type: 'toggle', default: true, showIf: 'grain' },
];

const ACCENT_MODES = { midtone: 0, crest: 1, trough: 2, contour: 3 };
const BY_NAME = Object.fromEntries(PARAMS.map((p) => [p.name, p]));
const toAttr = (name) => name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const ATTR_TO_NAME = Object.fromEntries(PARAMS.map((p) => [toAttr(p.name), p.name]));
const MAX_DPR = 2;

function normHex(raw) {
  let s = raw.trim().replace(/^#/, '').toLowerCase();
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  return '#' + s;
}

function parseValue(p, raw) {
  if (raw == null || raw === '') {
    return p.type === 'toggle' && raw === '' ? true : undefined;
  }
  const s = String(raw).trim();
  switch (p.type) {
    case 'range': {
      const n = parseFloat(s);
      return Number.isFinite(n) ? Math.min(p.max, Math.max(p.min, n)) : undefined;
    }
    case 'toggle':
      return !(s === 'false' || s === '0' || s === 'off' || s === 'no');
    case 'color':
      return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? normHex(s) : undefined;
    case 'select': {
      const values = p.options.map((o) => (typeof o === 'object' ? o.value : o));
      return values.includes(s) ? s : undefined;
    }
  }
  return undefined;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uDpr;
// Seamless loop: two copies of the field, one loop-length apart, cross-faded.
uniform vec2  uOffset;     // drift along travel direction (copy A, copy B)
uniform vec2  uZ;          // evolution / turbulence     (copy A, copy B)
uniform float uMix;        // 0..1 position within the loop
uniform vec3  uC1, uC2, uC3;
uniform float uContrast, uBalance;
uniform float uScale, uDetail, uChop, uAngle;
uniform int   uAccentMode; // -1 off, 0 midtone, 1 crest, 2 trough, 3 contour
uniform float uAccentPos, uAccentSoft;
uniform float uGrain, uGrainSize, uGrainSeed;

out vec4 outColor;

// 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float hash13(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);

// Layered noise; chop blends toward ridged noise (sharp crests).
float fbm(vec3 p, float octaves, float chop) {
  float amp = 0.5, sum = 0.0, norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    float v = snoise(p);
    v = mix(v, 0.6 - 2.0 * abs(v), chop); // ridged, re-centered so mean stays ~0
    sum += amp * v;
    norm += amp;
    p.xy = ROT * p.xy * 2.03 + vec2(1.7, 9.2);
    p.z *= 1.31;
    amp *= 0.5;
  }
  return sum / norm; // ~[-1, 1]
}

float field(vec2 p, float offset, float z) {
  p.x -= offset;
  // Gentle domain warp keeps the swell organic.
  vec2 q = vec2(
    fbm(vec3(p, z * 0.7), 2.0, 0.0),
    fbm(vec3(p + vec2(5.2, 1.3), z * 0.7), 2.0, 0.0)
  );
  return fbm(vec3(p + 0.6 * q, z), uDetail, uChop);
}

float bias(float x, float b) {
  b = clamp(b, 0.01, 0.99);
  return x / ((1.0 / b - 2.0) * (1.0 - x) + 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

  // Rotate into wave frame: x = travel direction, y = along the crest.
  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 w = vec2(ca * uv.x + sa * uv.y, -sa * uv.x + ca * uv.y);
  w.y *= 0.6;                   // crests run long, perpendicular to travel
  vec2 p = w * uScale * 2.0;

  // At uMix = 0 we see copy A at loop start; as uMix -> 1, copy B (one loop
  // earlier) reaches that same state, so the last frame matches the first.
  // Weights are variance-normalised so contrast doesn't dip mid-blend.
  float wa = 1.0 - uMix, wb = uMix;
  float s = (wa * field(p, uOffset.x, uZ.x) + wb * field(p, uOffset.y, uZ.y)) / sqrt(wa * wa + wb * wb);

  float h = clamp(0.5 + 1.1 * s, 0.0, 1.0);
  h = clamp((h - 0.5) * uContrast + 0.5, 0.0, 1.0);
  h = bias(h, uBalance);

  vec3 col = mix(uC1, uC2, h);

  if (uAccentMode == 0) {
    float pos = clamp(uAccentPos, 0.01, 0.99);
    col = h < pos ? mix(uC1, uC3, h / pos) : mix(uC3, uC2, (h - pos) / (1.0 - pos));
  } else if (uAccentMode == 1) {
    float k = smoothstep(uAccentPos - uAccentSoft, uAccentPos + uAccentSoft + 0.001, h);
    col = mix(col, uC3, k);
  } else if (uAccentMode == 2) {
    float k = 1.0 - smoothstep(uAccentPos - uAccentSoft - 0.001, uAccentPos + uAccentSoft, h);
    col = mix(col, uC3, k);
  } else if (uAccentMode == 3) {
    float f = h * mix(3.0, 30.0, uAccentPos);
    float d = abs(fract(f + 0.5) - 0.5) / max(fwidth(f), 1e-4);
    float line = 1.0 - smoothstep(0.0, 1.0 + uAccentSoft * 20.0, d);
    col = mix(col, uC3, line);
  }

  vec2 cell = floor(gl_FragCoord.xy / max(uGrainSize * uDpr, 1.0));
  col += (hash13(vec3(cell, uGrainSeed)) - 0.5) * uGrain;
  col += (hash13(vec3(gl_FragCoord.xy, 7.0)) - 0.5) / 255.0; // dither vs banding

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const UNIFORMS = [
  'uRes', 'uDpr', 'uOffset', 'uZ', 'uMix', 'uC1', 'uC2', 'uC3', 'uContrast', 'uBalance',
  'uScale', 'uDetail', 'uChop', 'uAngle', 'uAccentMode', 'uAccentPos', 'uAccentSoft',
  'uGrain', 'uGrainSize', 'uGrainSeed',
];

class WaveBackground extends HTMLElement {
  static get observedAttributes() {
    return PARAMS.map((p) => toAttr(p.name));
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: block; position: relative; overflow: hidden; width: 100%; height: 100%; }
        canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      </style>
      <canvas part="canvas"></canvas>`;
    this._canvas = root.querySelector('canvas');
    this._css = {};
    this._t = 0;
    this._seed = 0;
    this._dirty = true;
    this._visible = true;
    this._frame = this._frame.bind(this);
  }

  connectedCallback() {
    if (!this._gl) this._initGL();
    this._readCss();

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver((entries) => {
      this._visible = entries[entries.length - 1].isIntersecting;
      this._updateLoop();
    });
    this._io.observe(this);

    this._onVis = () => this._updateLoop();
    document.addEventListener('visibilitychange', this._onVis);

    this._mq = matchMedia('(prefers-reduced-motion: reduce)');
    this._reduced = this._mq.matches;
    this._onMq = (e) => { this._reduced = e.matches; this._dirty = true; };
    this._mq.addEventListener('change', this._onMq);

    this._resize();
    this._updateLoop();
  }

  disconnectedCallback() {
    this._stop();
    this._ro?.disconnect();
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    this._mq?.removeEventListener('change', this._onMq);
  }

  attributeChangedCallback() {
    this._dirty = true;
  }

  /** Current effective values for every param. */
  getParams() {
    return Object.fromEntries(PARAMS.map((p) => [p.name, this._get(p.name)]));
  }

  /** Set many params at once, e.g. from a copied params JSON. */
  setParams(obj) {
    for (const [k, v] of Object.entries(obj || {})) if (k in BY_NAME) this[k] = v;
  }

  _get(name) {
    const p = BY_NAME[name];
    const fromAttr = parseValue(p, this.getAttribute(toAttr(name)));
    if (fromAttr !== undefined) return fromAttr;
    if (this._css[name] !== undefined) return this._css[name];
    return p.default;
  }

  _readCss() {
    const cs = getComputedStyle(this);
    let changed = false;
    for (const p of PARAMS) {
      const v = parseValue(p, cs.getPropertyValue(`--ui-wave-${toAttr(p.name)}`) || null);
      if (v !== this._css[p.name]) { this._css[p.name] = v; changed = true; }
    }
    if (changed) this._dirty = true;
  }

  _initGL() {
    const gl = this._canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      // Fallback: static gradient.
      this._canvas.style.background = `linear-gradient(135deg, ${this._get('color1')}, ${this._get('color2')})`;
      return;
    }
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray());
    this._u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)]));
    this._gl = gl;

    this._canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this._gl = null; this._stop(); });
    this._canvas.addEventListener('webglcontextrestored', () => { this._initGL(); this._dirty = true; this._updateLoop(); });
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(this.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.clientHeight * dpr));
    if (this._canvas.width !== w || this._canvas.height !== h) {
      this._canvas.width = w;
      this._canvas.height = h;
    }
    this._dpr = dpr;
    this._dirty = true;
  }

  _updateLoop() {
    const run = this.isConnected && this._visible && !document.hidden && this._gl;
    if (run && !this._raf) { this._last = undefined; this._raf = requestAnimationFrame(this._frame); }
    if (!run) this._stop();
  }

  _stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _frame(now) {
    this._raf = requestAnimationFrame(this._frame);
    const dt = this._last === undefined ? 0 : Math.min(0.1, (now - this._last) / 1000);
    this._last = now;

    if (!this._cssAt || now - this._cssAt > 250) { this._readCss(); this._cssAt = now; }

    const v = this.getParams();
    const moving = !v.paused && !this._reduced;
    if (moving) {
      this._t += dt;
      if (v.grainAnimated) this._seed = Math.floor(this._t * 24) % 997;
    }
    if (moving || this._dirty) {
      this._draw(v);
      this._dirty = false;
    }
  }

  _draw(v) {
    const gl = this._gl;
    if (!gl) return;
    const u = this._u;
    gl.viewport(0, 0, this._canvas.width, this._canvas.height);
    gl.uniform2f(u.uRes, this._canvas.width, this._canvas.height);
    gl.uniform1f(u.uDpr, this._dpr);
    const L = v.loopLength;
    const t = this._t % L;          // time within the loop
    const drift = v.speed * 0.12;
    const evolve = v.speed * v.turbulence * 0.1;
    gl.uniform2f(u.uOffset, drift * t, drift * (t - L));
    gl.uniform2f(u.uZ, evolve * t, evolve * (t - L));
    gl.uniform1f(u.uMix, t / L);
    gl.uniform3fv(u.uC1, hexToRgb(v.color1));
    gl.uniform3fv(u.uC2, hexToRgb(v.color2));
    gl.uniform3fv(u.uC3, hexToRgb(v.accentColor));
    gl.uniform1f(u.uContrast, v.contrast);
    gl.uniform1f(u.uBalance, v.balance);
    gl.uniform1f(u.uScale, v.scale);
    gl.uniform1f(u.uDetail, v.detail);
    gl.uniform1f(u.uChop, v.choppiness);
    gl.uniform1f(u.uAngle, (v.direction * Math.PI) / 180);
    gl.uniform1i(u.uAccentMode, v.accent ? ACCENT_MODES[v.accentMode] : -1);
    gl.uniform1f(u.uAccentPos, v.accentPosition);
    gl.uniform1f(u.uAccentSoft, v.accentSoftness);
    gl.uniform1f(u.uGrain, v.grain ? v.grainAmount : 0);
    gl.uniform1f(u.uGrainSize, v.grainSize);
    gl.uniform1f(u.uGrainSeed, this._seed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

// camelCase property accessors for every param (reflect to attributes).
for (const p of PARAMS) {
  Object.defineProperty(WaveBackground.prototype, p.name, {
    get() { return this._get(p.name); },
    set(value) {
      if (value === null || value === undefined) this.removeAttribute(toAttr(p.name));
      else this.setAttribute(toAttr(p.name), String(value));
    },
  });
}

export { ATTR_TO_NAME, toAttr };

if (!customElements.get(TAG)) customElements.define(TAG, WaveBackground);
