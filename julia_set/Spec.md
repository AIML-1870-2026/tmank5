# Julia Set Explorer — Project Specification

## Vision

A museum-quality, WebGL-powered Julia set explorer built as a single self-contained HTML file. The experience should feel like an interactive art installation: unhurried, beautiful, and deeply explorable. Every rendering decision should prioritize visual wonder over technical utility. The target aesthetic is a natural history museum meets contemporary digital art gallery — precise, atmospheric, and awe-inspiring.

---

## Technical Stack

- **Rendering**: WebGL via raw GLSL fragment shaders (no Three.js, no p5.js for the fractal itself)
- **UI layer**: Vanilla JS + HTML/CSS (no frameworks required)
- **Single-file artifact**: All CSS, JS, and GLSL inline in one `.html` file
- **CDN dependencies allowed**: Only for UI polish if truly needed (e.g., a font from Google Fonts)
- **Target browsers**: Modern Chrome/Firefox/Safari with WebGL2 support

The fractal itself must be rendered entirely in a GLSL fragment shader running on the GPU. The CPU handles UI state, parameter encoding, and uniform passing only.

---

## Core Architecture

### WebGL Setup

```
Canvas (fullscreen, black background)
  └── Single quad (two triangles filling the viewport)
        └── Fragment shader evaluates Julia iteration per pixel
              └── Uniforms: c_real, c_imag, zoom, pan_x, pan_y,
                            max_iter, color_mode, palette params,
                            orbit trap params, time
```

### Coordinate System

- The complex plane is mapped to the canvas with the origin centered
- Zoom is multiplicative (1.0 = default view, showing roughly [-2, 2] × [-2, 2])
- Pan is in complex-plane units
- The parameter `c = c_real + c_imag * i` defines the Julia set uniquely

---

## Feature Specifications

---

### 1. WebGL Julia Set Renderer

**Core iteration loop (in GLSL):**

```glsl
vec2 z = uv; // pixel mapped to complex plane
for (int i = 0; i < MAX_ITER; i++) {
    if (dot(z, z) > 4.0) {
        // escaped — compute smooth escape count
        smooth_i = float(i) - log2(log2(dot(z,z)));
        break;
    }
    z = vec2(z.x*z.x - z.y*z.y + c.x, 2.0*z.x*z.y + c.y);
}
```

**Smooth/continuous coloring**: Use the standard smooth escape-time formula to eliminate discrete banding:
```
smooth_i = i - log2(log2(|z|²)) / log2(2.0)
```

**Iteration depth**: Default 256, adjustable to 1024. Higher iterations reveal finer filament detail.

**Interior coloring**: Pixels that never escape should not simply be black. Color the interior using one of:
- A subtle dark gradient based on the final `|z|` value at max iteration
- A period-2 glow (slightly lighter for points near period-2 cycle)
- A deep, desaturated tint that complements the chosen palette

---

### 2. Coloring Modes

Implement **three coloring algorithms**, selectable via UI:

#### Mode A — Smooth Gradient
Map `smooth_i / max_iter` through a smooth gradient palette. Use HSL cycling with configurable hue offset and cycle frequency. This should produce the classic psychedelic banding but with smooth, buttery transitions.

#### Mode B — Orbit Trap (Primary Feature)
This is the centerpiece coloring mode. On each iteration, record the **minimum distance** the orbit passes to a geometric shape (the "trap"). Color the pixel based on:
- How close the orbit got to the trap (`trap_dist`)
- At what iteration the closest approach occurred (`trap_iter`)
- The angle at the closest approach point (`trap_angle`)

**Implement at least two trap shapes**, switchable via UI:
1. **Circle trap** — trap centered at origin with radius `r`. Distance: `|z| - r`
2. **Cross trap** — the two axes. Distance: `min(|z.x|, |z.y|)`

The color formula should combine all three trap values using a carefully tuned palette to produce iridescent, pearl-like surfaces that glow from within. The result should look like light passing through deep water or the inside of an abalone shell.

Example coloring approach:
```glsl
float t = trap_dist * 3.0;
float hue = trap_angle / (2.0 * PI) + trap_iter / float(max_iter);
vec3 color = hsv2rgb(vec3(hue, 1.0 - t * 0.5, 1.0 - t));
```

#### Mode C — Distance Estimation
Use the derivative of the iteration to estimate the distance from the pixel to the Julia set boundary. Pixels near the boundary are bright; the brightness falls off with distance. This creates a glowing filament effect where the fractal "lights up" from within — highly appropriate for the museum aesthetic.

```glsl
// Track derivative alongside z
vec2 dz = vec2(1.0, 0.0);
// per iteration: dz = 2*z*dz
// final: dist = |z| * log(|z|) / |dz|
```

---

### 3. Color Palettes

Provide **5 curated palettes** selectable from the UI. Each palette should be hardcoded as a set of gradient stops in GLSL (a `vec3[5]` or similar). Palette application should be smooth (mix/lerp between stops).

| Palette Name | Vibe | Colors |
|---|---|---|
| **Abyssal** | Deep ocean, bioluminescent | Near-black navy → electric teal → pale gold → white |
| **Aurora** | Northern lights | Deep violet → emerald → ice blue → warm white |
| **Magma** | Volcanic, molten | Charcoal → deep red → orange → pale straw |
| **Pearl** | Organic, iridescent | Warm black → dusty rose → champagne → silver |
| **Celestial** | Space, nebula | Black → indigo → electric blue → hot white |

Each palette should look exceptional in all three coloring modes.

---

### 4. The `c` Parameter Controls

The Julia set is defined by a single complex number `c`. The UI must provide **two ways** to control it:

#### a) Linked Mandelbrot Mini-Map
- Render a small (240×240px) Mandelbrot set in a **second, smaller WebGL canvas** inset in the bottom-right of the screen
- Display a crosshair/dot at the current `c` position
- **Click or drag on the mini-map** to set `c` in real time — the main Julia set updates live
- The Mandelbrot and Julia sets are mathematically linked: every point on the Mandelbrot set corresponds to a connected Julia set; outside the Mandelbrot set, the Julia set becomes a Cantor dust
- Include a subtle label: *"Drag to explore c-space"*

#### b) Numeric / Preset Controls
- Two numeric input fields: `Re(c)` and `Im(c)`, with step 0.001
- A **Presets gallery**: a horizontal scrollable strip of small labeled buttons, each jumping to a known-beautiful `c` value (see Presets section below)

---

### 5. Camera Controls

#### Pan
- **Click and drag** on the main canvas to pan
- Update `pan_x, pan_y` uniforms in real time
- Cursor should change to `grab` when hovering, `grabbing` when dragging

#### Zoom
- **Scroll wheel** to zoom in/out, centered on the cursor position (not the canvas center)
- Zoom should be multiplicative: `zoom *= 1.1^scrollDelta`
- Minimum zoom: 0.1 (zoomed out), maximum: 1,000,000 (deep zoom)
- At deep zoom levels, automatically increase `max_iter` (e.g., `max_iter = 256 + 64 * log2(zoom)`) to reveal finer detail

#### Reset View
- Double-click to reset pan/zoom to default

---

### 6. Animation — Morphing `c` Parameter

This is the second centerpiece feature. Implement a **"Drift" mode** that slowly animates `c` in real time:

#### Orbit Mode
`c` moves in a slow elliptical orbit around a base point:
```
c_real = base_real + radius_real * cos(t * speed)
c_imag = base_imag + radius_imag * sin(t * speed)
```
The user can set the orbit center (via the mini-map), orbit radius, and speed.

#### Path Mode
`c` moves along a smooth spline through a set of waypoints (the presets make natural waypoints). The path loops. This creates a slow, meditative transformation between beautiful Julia sets — like a time-lapse of a morphing organism.

#### Controls for Animation
- **Play/Pause button** (large, elegant — bottom center of screen)
- **Speed slider**: from very slow (0.1×) to fast (5×)
- **Mode selector**: Orbit / Path
- When animating, the mini-map's crosshair should visibly track the moving `c`

---

### 7. Presets Gallery

A curated list of visually stunning `c` values. Display as a horizontal strip of labeled chips near the bottom of the screen. Each chip should show a tiny thumbnail (rendered at 32×32 in a hidden canvas) and a poetic name.

| Name | c value | Why it's beautiful |
|---|---|---|
| **Douady's Rabbit** | −0.123 + 0.745i | Three-lobed symmetry, filamentous ears |
| **Siegel Disk** | −0.391 − 0.587i | Smooth concentric rings, quasi-periodic |
| **The Dendrite** | i (0 + 1i) | Tree-like branching, maximally fractal boundary |
| **San Marco Dragon** | −0.75 + 0i | Dragon-wing symmetry, crisp edges |
| **Airplane** | −1.755 + 0i | Thick bifurcating arms |
| **The Basilica** | −1 + 0i | Two-lobed, symmetrical, classic |
| **Spiral Galaxy** | −0.7269 + 0.1889i | Dense spiral arms, galactic feel |
| **Burning Ship** | −0.5 − 0.5i | Jagged, aggressive structure |
| **Sea Horse Valley** | −0.75 + 0.1i | Seahorse-shaped spirals at every scale |
| **Lightning** | 0.285 + 0.01i | Thin dendritic sparks, crackling energy |

---

### 8. UI Design & Layout

The aesthetic must be **museum-quality**: dark, calm, refined. Think MoMA, not a coding tool.

#### Layout
```
┌────────────────────────────────────────────────────┐
│  [Title: JULIA ∞]           [Palette] [Mode] [⚙]  │  ← top bar, minimal
│                                                    │
│                                                    │
│          Main WebGL Canvas (fullscreen)            │
│                                                    │
│                                          ┌──────┐  │
│                                          │Mand. │  │  ← mini-map, bottom right
│                                          │map   │  │
│  ┌─────────────────────────────────────┐ └──────┘  │
│  │  ← Preset strip (scrollable) →     │           │  ← bottom preset strip
│  └─────────────────────────────────────┘           │
│         [◀◀]  [▶ Drift]  [▶▶]      [💾] [🔗]     │  ← bottom controls
└────────────────────────────────────────────────────┘
```

#### Color Scheme
- **Background**: True black `#000000`
- **UI chrome**: Very dark grey `#0d0d0d` with `1px` borders in `#1a1a1a`
- **Text**: Off-white `#e8e8e8`, secondary `#888`
- **Accents**: A single accent color, desaturated gold `#c8a84b`, used sparingly
- **Hover states**: Subtle `rgba(255,255,255,0.05)` backgrounds
- **Font**: `'Inter', system-ui, sans-serif` for UI; consider a serif for the title

#### Controls Panel (collapsible side panel)
A thin panel (280px wide) on the right side, toggled by a `⚙` icon. Contains:
- **Iteration depth** slider (64 – 1024)
- **Orbit trap shape** selector (Circle / Cross)
- **Orbit trap radius** slider (0.1 – 2.0)
- **Animation orbit radius** slider
- **Animation speed** slider
- **Re(c) / Im(c)** numeric inputs

The panel should slide in/out with a smooth CSS transition. When hidden, the fractal is truly full-screen.

#### Typography
- Title: `JULIA` in tracking-widest, thin weight — positioned top-left
- Subtitle: current `c` value in monospace, small, below title
- Preset names: small caps
- All type should feel editorial, not technical

---

### 9. Export & Sharing

#### Screenshot Export
- A save button (💾) in the bottom bar
- Renders the current view at **2× the screen resolution** by temporarily resizing the canvas
- Downloads as `julia-[c_real]-[c_imag]-[timestamp].png`
- Should capture the fractal only (no UI chrome)

#### Shareable URL
- A link button (🔗) that writes the current state to the URL hash:
  `#c=-0.7269,0.1889&zoom=4.2&px=0.1&py=-0.3&palette=aurora&mode=orbit-trap`
- On page load, parse this hash and restore full state
- The copy-to-clipboard action shows a brief "Copied!" toast

---

### 10. Performance Requirements

- **Target**: 60fps at 1080p in coloring modes A and B
- **Distance estimation mode (C)** may drop to 30fps at high iteration counts — acceptable
- Iteration loop in GLSL must use `#define MAX_ITER` (compile-time constant for performance) — update via shader recompilation when user changes iteration depth (debounced, 300ms)
- Mini-map Mandelbrot can run at lower fidelity (128 iterations is fine)
- Animation `requestAnimationFrame` loop; pause rendering when the tab is hidden (`document.visibilitychange`)

---

### 11. Accessibility & Polish

- **Loading state**: On first render, a brief fade-in from black (300ms ease)
- **Cursor**: Custom cursor — a small `+` crosshair over the main canvas
- **Touch support**: Pinch-to-zoom and single-finger pan on mobile/tablet
- **Keyboard shortcuts**:
  - `Space`: Play/Pause drift
  - `R`: Reset view  
  - `S`: Save screenshot
  - `P`: Cycle presets
  - `1-5`: Switch palettes
- Tooltip labels on all icon buttons (CSS `title` attribute at minimum)

---

## File Structure

This is a **single-file application**. The output is one `julia-explorer.html` file. Internal organization:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Julia ∞ — Set Explorer</title>
  <style>
    /* === RESET & BASE === */
    /* === LAYOUT === */
    /* === TOP BAR === */
    /* === CANVAS === */
    /* === MINI MAP === */
    /* === PRESET STRIP === */
    /* === BOTTOM BAR === */
    /* === SIDE PANEL === */
    /* === ANIMATIONS & TRANSITIONS === */
  </style>
</head>
<body>
  <!-- UI structure here -->
  <script>
    // ============================================================
    // SECTION 1: GLSL SHADER SOURCE (template literals)
    // ============================================================
    //   vertexShaderSrc
    //   fragmentShaderSrc (Julia, with all coloring modes)
    //   mandelbrotFragSrc (mini-map)

    // ============================================================
    // SECTION 2: WEBGL UTILITIES
    // ============================================================
    //   initWebGL(canvas)
    //   compileShader(gl, src, type)
    //   createProgram(gl, vert, frag)
    //   setupQuad(gl)

    // ============================================================
    // SECTION 3: STATE MANAGEMENT
    // ============================================================
    //   const state = { c, zoom, pan, palette, colorMode, ... }
    //   function applyState() — pushes state to uniforms

    // ============================================================
    // SECTION 4: RENDER LOOPS
    // ============================================================
    //   function renderJulia()
    //   function renderMandelbrot()
    //   function animationTick(t)

    // ============================================================
    // SECTION 5: INPUT HANDLERS
    // ============================================================
    //   Mouse pan/zoom on main canvas
    //   Click/drag on mini-map → update c
    //   Scroll wheel zoom
    //   Touch events

    // ============================================================
    // SECTION 6: UI HANDLERS
    // ============================================================
    //   Preset buttons
    //   Palette selector
    //   Color mode selector
    //   Panel toggle
    //   Play/Pause drift
    //   Export / Share

    // ============================================================
    // SECTION 7: URL STATE (serialize / deserialize)
    // ============================================================

    // ============================================================
    // SECTION 8: INIT
    // ============================================================
    //   DOMContentLoaded → setup everything → start render loop
  </script>
</body>
</html>
```

---

## GLSL Shader Structure

The fragment shader should use `#define` and `uniform` to switch between coloring modes at runtime where possible, or recompile on mode switch where performance demands it.

```glsl
// Key uniforms
uniform vec2 u_c;           // Julia parameter
uniform vec2 u_pan;         // View pan
uniform float u_zoom;       // View zoom
uniform int u_max_iter;     // Max iterations
uniform int u_color_mode;   // 0=gradient, 1=orbit_trap, 2=distance_est
uniform int u_trap_shape;   // 0=circle, 1=cross
uniform float u_trap_radius;
uniform int u_palette;      // 0-4
uniform float u_time;       // For any animated effects (subtle shimmer)

// Output
out vec4 fragColor;
```

The shader should include all coloring modes as functions and branch on `u_color_mode`. This avoids recompilation on mode switch.

---

## Implementation Notes for Claude Code

1. **Start with the WebGL boilerplate** (canvas setup, shader compile, quad) before any UI
2. **Get a basic Julia set rendering** before adding coloring modes
3. **Add coloring modes one at a time**, testing each before the next
4. **Build the mini-map as a second, independent WebGL context** on a small canvas element
5. **Wire up controls** only after rendering is solid
6. **Animation last** — it depends on all other systems being stable
7. Use `const` and `let` throughout, no `var`
8. The GLSL should be written as ES6 template literals with clear section comments
9. Debounce any control that triggers shader recompilation (iteration depth slider: 300ms debounce)
10. Test at multiple `c` values throughout development — `c = 0 + i` (dendrite) and `c = -0.75 + 0i` (basilica) are good test cases with very different structures

---

## Quality Bar

The finished explorer should:

- Feel **instantaneous** — no perceived lag when panning, zooming, or changing `c`
- Look **gallery-worthy** at any preset, in any palette
- Be **discoverable** — someone with no math background should find it beautiful and be drawn to explore
- Be **shareable** — a URL link should reproduce the exact view with no loss
- Render **crisply** at any window size, including fullscreen on a 4K display
- The orbit trap mode especially should produce images that look like **photographs of iridescent minerals or deep-sea creatures**, not like a math visualization

---

*This spec is intentionally thorough. If any section conflicts with technical constraints (e.g., shader precision on a specific GPU), use best judgment to achieve the aesthetic intent.*
