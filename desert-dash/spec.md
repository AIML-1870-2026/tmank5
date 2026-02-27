# Desert Dash — Stick Figure Infinite Runner
## Project Spec for Claude Code

---

## Overview

A single-file HTML5 Canvas infinite runner game with a desert theme. The player controls an animated stick figure that runs automatically and must jump, double-jump, flip, and gravity-flip over desert obstacles. The game features parallax scrolling desert backgrounds, juicy animations, and is heavily optimized using object pooling, chunked rendering, and sprite atlases.

**Output:** A single `index.html` file with all CSS and JS inline. No external dependencies.

---

## Tech Stack

- **Rendering:** HTML5 Canvas 2D API (no WebGL needed, but use `willReadFrequently: false`, avoid per-frame `getImageData`)
- **Game Loop:** `requestAnimationFrame` with a fixed timestep (60 fps target, delta-time capped at 100ms to prevent spiral of death)
- **Physics:** Simple AABB collision, gravity constant, no physics library
- **Audio:** Web Audio API for procedurally generated sounds (no audio files needed)
- **Structure:** Single JS module pattern inside one `<script>` tag

---

## Visual Theme — Desert

### Color Palette
```
Sky top:        #1a0a2e  (deep violet night sky)
Sky horizon:    #c2541b  (burnt orange sunset)
Sun:            #ffcc00  (glowing yellow)
Dunes far:      #c8763a  (dusty brown)
Dunes mid:      #a0522d  (sienna)
Dunes near:     #7a3b1e  (dark rust)
Ground:         #5c2a0e  (deep terracotta)
Player:         #ffffff  (white stick figure)
Obstacle tint:  #ff6a00 / #cc3300
UI text:        #ffe0a0  (warm cream)
```

### Parallax Background Layers (back to front)
1. **Sky gradient** — static vertical gradient (deep violet → burnt orange at horizon)
2. **Stars layer** — ~80 small white dots, scroll at 0.05x speed
3. **Moon/Sun** — large glowing circle at upper right, subtle pulse animation
4. **Far dunes** — smooth sine-wave hills, scroll at 0.15x speed, lightest color
5. **Mid dunes** — taller irregular hills, scroll at 0.35x speed, medium color
6. **Cacti silhouettes** — occasional tall saguaro shapes, scroll at 0.5x speed
7. **Near dunes** — rolling foreground hills, scroll at 0.7x speed, darkest color
8. **Ground platform** — flat solid ground the player runs on, scroll at 1.0x speed

Each layer is drawn to an **offscreen canvas** at init and tiled horizontally. Layers are re-seeded with randomness using a fixed seed so they look natural.

---

## Player — Stick Figure

### Anatomy (drawn procedurally each frame)
- Head: circle (~10px radius)
- Body: vertical line (~25px)
- Arms: two lines from mid-body, animated swing
- Legs: two lines from bottom-body, animated stride
- All joints connected; limb lengths fixed but angles animated

### Animations
- **Running:** Legs and arms oscillate in sine-wave pattern based on `gameSpeed * time`
- **Jumping:** Body tilts forward, arms raise, legs tuck
- **Flipping:** Full 360° rotation applied to the whole figure (track `flipAngle`, increment per frame)
- **Landing squash:** On ground contact, briefly scale Y down to 0.7 and X up to 1.3 for 6 frames, then snap back
- **Death:** Figure explodes — 8 line segments fly outward from center with random velocities and rotation, fade over 1.5s
- **Motion trail:** Last 5 positions stored; draw figure at each with decreasing opacity (ghost trail)

### Physics
```
gravity:          1800 px/s²
jumpForce:        -620 px/s
doubleJumpForce:  -520 px/s
gravityFlipForce: instant velocity reversal + gravity direction toggle
playerX:          fixed at 15% of canvas width
collider:         20x50px AABB centered on figure
```

### Controls
| Input | Action |
|-------|--------|
| Space / Up Arrow / Tap | Jump (double jump if airborne) |
| Down Arrow / Swipe Down | Gravity flip |
| Any input during death | Restart |

---

## Obstacles — Desert Themed

All obstacles use **object pooling** — a fixed pool of ~20 obstacle objects, recycled when off-screen.

### Obstacle Types

#### 1. Rolling Boulder
- Large circle (30–55px radius), brown/grey
- Rolls along the ground with visible rotation (track `rotationAngle`)
- Comes in small, medium, and large variants
- Can be single or a cluster of 2–3 boulders spaced 80px apart

#### 2. Spike Trap / Cactus Spine Cluster
- 3–7 upward-pointing triangles in a row on the ground
- Sandy brown/orange color
- Similar to Geometry Dash spikes but desert-colored

#### 3. Saguaro Cactus
- Tall obstacle (~80px), with optional arms
- Must jump over or gravity-flip above
- Hand-drawn procedurally with thick lines (15–20px stroke)

#### 4. Tumbleweed
- Circular, drawn as a ring of curved lines
- Rolls and bounces slightly (has a small vertical oscillation)
- Smaller than boulder, faster spawn rate at high speed

#### 5. Dust Devil / Whirlwind
- Hourglass/funnel shape drawn with semi-transparent arcs
- Floats in the air at varying heights — must duck under or jump over
- Rotates visually each frame

#### 6. Sand Pit
- Wide flat pit drawn into the ground — fall in and die
- Player must jump over the gap
- Marked with darker sand color and depth shading

### Obstacle Spawning Logic
- Obstacles spawn off the right edge of screen
- Minimum gap between obstacles: `max(300, 600 - score*0.5)` px (decreases with score)
- Obstacle type chosen randomly weighted by current speed tier
- At low speed: mostly boulders and cacti
- At high speed: mix of all types including dust devils and sand pits
- **Never spawn an impossible combination** — enforce minimum clear window of 90px height

---

## Game Progression

### Speed Tiers
| Score | Speed (px/s) | Music Tempo |
|-------|-------------|-------------|
| 0     | 350         | slow        |
| 500   | 450         | medium      |
| 1500  | 580         | fast        |
| 3000  | 720         | intense     |
| 5000  | 900         | max         |

Speed increases smoothly, not in jumps. Score increases by 1 per frame at 60fps.

### Difficulty Scaling
- More obstacle variety unlocked over time
- Obstacle clusters become more common after score 1000
- Sand pits appear after score 800
- Dust devils appear after score 1200

---

## UI

### HUD (always visible)
- **Score** — top center, large warm cream text, slight drop shadow
- **Best** — top right, smaller text
- **Speed indicator** — small bar bottom-left showing current speed tier with desert icon

### Start Screen
- Title: "DESERT DASH" in large stylized text
- Subtitle: animated stick figure running in place
- "TAP OR PRESS SPACE TO START"
- Brief control hints

### Game Over Screen
- Player death animation plays
- "YOU DIED" fades in
- Score + Best displayed
- "TAP TO RESTART"
- Particles/sand burst effect

---

## Audio — Web Audio API (Procedural)

All sounds generated with oscillators — no files needed.

```
jump:        short sine wave up-chirp (200→400hz, 0.1s)
double jump: two-tone chirp (300→500hz, 0.08s)
land:        low thud (80hz, short decay, 0.05s)
death:       descending glide (400→80hz, 0.4s) + white noise burst
score tick:  very subtle high tick every 100 points
flip:        whoosh via filtered noise (0.15s)
```

Music: a looping procedural rhythm track using Web Audio scheduler:
- Kick drum on beat 1 and 3 (low sine burst)
- Hi-hat on every beat (short noise burst, bandpass filtered)
- Ambient desert tone (slow LFO-modulated sine pad)
- Tempo synced to speed tier

---

## Performance Architecture

### Object Pooling
```js
class Pool {
  constructor(factory, size) { ... }
  acquire() { return inactive.pop() || factory() }
  release(obj) { obj.active = false; inactive.push(obj) }
}
// Separate pools for: obstacles, particles, trail ghosts
```

### Offscreen Canvas Caching
- Each parallax layer drawn once to an offscreen canvas at init
- Each frame: `ctx.drawImage(layerCanvas, scrollX, 0)` — no per-frame path drawing for backgrounds
- Obstacle shapes pre-rendered to small offscreen canvases too (boulders, cacti)
- Regenerate layer canvases on window resize only

### Sprite Atlases
- All obstacle types drawn once to a single offscreen atlas canvas at game init
- Obstacles blitted from atlas using `drawImage(atlas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)`
- Atlas layout stored in a `SPRITES` constant map

### Chunked Level Loading
- Obstacles exist in a queue, not an array of all future obstacles
- Only ~8 obstacles are ever alive at once (in pool)
- Next obstacle is scheduled when last one spawns (not precomputed)

### Rendering Order & Batching
1. Sky gradient (static, drawn once or on resize)
2. Parallax layers back→front via `drawImage` from offscreen canvases
3. Ground
4. Active obstacles (from pool, only active ones)
5. Player trail ghosts (5 frames, decreasing alpha)
6. Player
7. Particles (from pool)
8. HUD last (no transform state needed)

### Other Optimizations
- `canvas.style.imageRendering = 'pixelated'` for crisp scaling if needed
- `ctx.save/restore` only when transform changes (not every draw call)
- Delta time capped: `dt = Math.min(dt, 0.1)` — prevents physics explosion on tab focus
- `visibility` API pause: game loop pauses when tab is hidden
- No layout thrashing — canvas size set once, not read each frame

---

## File Structure

Everything in one `index.html`:
```
index.html
  <style>  — minimal CSS (black bg, center canvas, no cursor)
  <canvas id="game">
  <script>
    // Constants
    // Utility (lerp, clamp, rand, seeded RNG)
    // Audio engine
    // Pool class
    // Sprite atlas builder
    // Parallax layer builder
    // Player class
    // Obstacle class
    // Particle class
    // GameState (state machine: START | RUNNING | DEAD)
    // Input handler
    // Game loop (requestAnimationFrame)
    // Init
  </script>
```

---

## Quality Bar

- Game must run at a stable 60fps on a mid-range laptop in Chrome
- No memory leaks — object pooling must be verified
- Looks polished: smooth animations, satisfying jump feel, beautiful desert parallax
- Feels fair: no unbeatable obstacle combinations
- Responsive: canvas scales to fill viewport while maintaining aspect ratio (16:9 base: 960x540)
- Works on mobile (touch input)

---

## Stretch Goals (do not implement in v1)

- Level editor
- Local leaderboard
- Power-ups (shield, slow-mo, magnet)
- Different stick figure skins
- Day/night cycle that progresses over score

---

*End of spec. Build `index.html` as a single self-contained file.*
