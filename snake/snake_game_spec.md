# Modern Snake Game - Technical Specification

## Project Overview
A modernized, visually immersive version of the classic Snake game with enhanced gameplay mechanics, progressive difficulty, and rich audio-visual feedback.

---

## Core Gameplay

### Basic Mechanics
- **Grid-based movement**: Snake moves on a cell-based grid system
- **Directional control**: Arrow keys or WASD for desktop, swipe gestures for mobile
- **Growth system**: Snake grows one segment each time it eats food
- **Collision detection**: Game ends when snake hits itself or walls (except in specific modes/power-ups)
- **Score tracking**: Points awarded for food consumed, with multipliers and bonuses

### Food System
- **Standard food**: Randomly spawns on empty grid cells
- **Spawn rate**: New food appears immediately after consumption
- **Visual variety**: Food items have glowing, pulsing animations
- **Point values**: Base 10 points per food item

---

## Game Modes

### 1. Classic Mode
- Traditional Snake gameplay with modern visuals
- Game ends on collision with walls or self
- Progressive speed increase based on score milestones
- No power-ups or special mechanics

### 2. Timed Challenge
- 60-second rounds
- Score as many points as possible before time expires
- Speed increases more rapidly than Classic mode
- Time extensions available through special golden food items (+10 seconds)
- High score tracking per session

### 3. Survival Mode
- Obstacles randomly appear on the grid as you progress
- Obstacles spawn every 5 food items consumed
- Maximum 10 obstacles on screen at once
- Obstacles are static and must be avoided
- Higher point multiplier (1.5x base score)

### 4. Zen Mode
- No death/collision
- Snake passes through walls (wraps to opposite side)
- Snake can overlap itself without dying
- Focus on relaxation and score building
- Slower, meditative pace
- Calming color palette and ambient music

---

## Power-Up System

### Power-Up Mechanics
- **Spawn rate**: 15% chance to spawn power-up instead of regular food
- **Duration**: Most power-ups last 5-8 seconds
- **Visual distinction**: Power-ups have unique colors and icon symbols
- **Stack behavior**: New power-ups override previous ones (except score multipliers which stack)

### Power-Up Types

#### 1. Speed Boost (Red/Orange)
- Increases snake movement speed by 50%
- Duration: 6 seconds
- Points multiplier: 1.5x while active
- Visual: Flame trail effect behind snake

#### 2. Slow-Mo (Blue/Cyan)
- Reduces game speed by 40%
- Duration: 8 seconds
- Easier control, same point values
- Visual: Blue glow around snake, grid pulses slowly

#### 3. Shield (Yellow/Gold)
- Grants one-time protection from collision
- Duration: Until used or 10 seconds expire
- Visual: Golden aura around snake head
- Audio: Shield break sound effect when used

#### 4. Magnet (Purple/Magenta)
- Food items drift toward snake within 3-cell radius
- Duration: 7 seconds
- Makes collection easier at high speeds
- Visual: Purple particles flowing from food to snake

#### 5. Ghost Mode (White/Translucent)
- Can pass through walls once (wraps to opposite side)
- Duration: Single use within 10 seconds
- Does not protect against self-collision
- Visual: Snake becomes semi-transparent with ethereal glow

---

## Progressive Difficulty

### Speed Scaling
- **Starting speed**: 8 moves per second
- **Speed increase**: +0.5 moves/second every 50 points
- **Maximum speed**: 20 moves per second (reached at 1,200 points)
- **Mode variations**: 
  - Timed Challenge: +0.75 moves/second every 50 points
  - Zen: Fixed at 6 moves per second
  - Survival: +0.3 moves/second every 50 points

### Arena Changes

#### Wall Appearance (Survival Mode Only)
- New wall segments appear every 5 food items
- Walls spawn in random positions (not blocking current snake path)
- Maximum 15 wall segments on grid
- Walls are permanent once placed

#### Grid Rotation (Advanced Feature - Optional)
- At score milestones (500, 1000, 1500), grid rotates 90° clockwise
- 2-second warning with visual indicator
- Smooth rotation animation over 1 second
- Controls remain absolute (up is always up on screen)

---

## Combo System

### Combo Mechanics
- **Trigger**: Eating food within 2 seconds of previous food
- **Combo levels**: 
  - 2x combo: 1.5x points
  - 3x combo: 2x points
  - 4x combo: 2.5x points
  - 5x+ combo: 3x points
- **Combo break**: 2-second timer without eating food
- **Visual feedback**: 
  - Combo counter appears near score
  - Screen flash on combo level up
  - Particle burst from snake on each combo hit

### Bonus Points
- **Perfect start**: +50 points for first 5 food items without collision
- **Speed demon**: +100 points for reaching max speed
- **Survival bonus**: +10 points per obstacle avoided in Survival mode
- **Zen master**: +500 points for reaching length of 100 in Zen mode

---

## Visual Design

### Color Palette & Themes

#### Neon Cyberpunk (Default)
- **Background**: Dark blue/purple gradient (#0a0e27 → #1a1a3e)
- **Grid lines**: Electric blue (#00ffff) with 30% opacity, pulsing glow
- **Snake**: Neon green (#00ff41) with bright glow
- **Food**: Hot pink (#ff006e) with particle effects
- **Power-ups**: Color-coded to type with animated icons

#### Unlockable Themes
- **Retro**: Classic green monochrome with CRT scanlines
- **Ocean**: Blue/teal gradient with wave effects
- **Sunset**: Orange/pink/purple gradient
- **Matrix**: Green on black with falling code background

### Animation Effects

#### Snake Animations
- **Smooth interpolation**: Snake segments flow between grid cells
- **Segmented body**: Each segment slightly offset for organic feel
- **Head rotation**: Snake head rotates to face movement direction
- **Tail trail**: Fading particle trail behind last segment
- **Growth animation**: New segment pops in with scale animation

#### Food & Power-Up Effects
- **Idle pulse**: Scale animation 0.8x to 1.2x over 1 second
- **Glow effect**: Radial gradient glow around items
- **Spawn animation**: Item appears with pop effect and particles
- **Collection**: Particle burst toward snake center on consumption

#### Environmental Effects
- **Grid pulse**: Grid lines pulse brighter near snake head
- **Background shift**: Colors shift gradually based on score (every 100 points)
- **Screen shake**: 
  - Light shake (2px) on food consumption
  - Medium shake (5px) on power-up collection
  - Heavy shake (10px) on collision (non-Zen modes)
- **Vignette**: Subtle dark edges intensify at high speeds

### Particle Systems
- **Trail particles**: Small glowing dots fade behind snake
- **Food particles**: Sparkles orbit food items
- **Combo particles**: Explosion of colored particles on combo hits
- **Power-up aura**: Continuous particle emission while power-up active

---

## Audio Design

### Sound Effects (SFX)

#### Gameplay Sounds
- **Movement**: Subtle whoosh sound (very quiet, not every move)
- **Food consumption**: Satisfying "pop" with pitch variation
- **Combo hit**: Musical note that increases in pitch with combo level
- **Power-up collection**: Unique sound per power-up type
  - Speed: Revving engine
  - Slow-mo: Time warp effect
  - Shield: Metallic clang
  - Magnet: Magnetic hum
  - Ghost: Ethereal whisper
- **Collision**: Deep thud (Classic/Survival/Timed)
- **Shield break**: Glass shatter
- **Level up**: Ascending arpeggio

#### UI Sounds
- **Menu navigation**: Soft click
- **Mode selection**: Confirmation beep
- **Game over**: Descending tone sequence
- **High score**: Triumphant fanfare

### Music System

#### Adaptive Background Music
- **Layered tracks**: Music intensity increases with snake length/speed
- **Base layer**: Ambient pad sounds (always playing)
- **Layer 2 (50+ points)**: Soft percussion loop
- **Layer 3 (150+ points)**: Melodic synth line
- **Layer 4 (300+ points)**: Bass line and full drums
- **Tempo increase**: BPM gradually increases with game speed

#### Mode-Specific Music
- **Classic**: Upbeat electronic music
- **Timed Challenge**: High-energy, urgent tempo
- **Survival**: Tense, atmospheric with build-ups
- **Zen**: Calm ambient music with nature sounds

#### Volume Controls
- **Master volume**: Overall audio level
- **SFX volume**: Sound effects only
- **Music volume**: Background music only
- **Audio toggle**: Quick mute button

---

## Camera & View System

### Dynamic Camera
- **Starting view**: Full grid visible with padding
- **Zoom progression**:
  - Snake length 1-10: 100% zoom (full grid)
  - Snake length 11-25: 95% zoom
  - Snake length 26-50: 90% zoom
  - Snake length 51-75: 85% zoom
  - Snake length 76+: 80% zoom (minimum)
- **Smooth transitions**: Camera zooms over 0.5 seconds
- **Camera follow**: Slight lag-follow of snake head for dynamic feel

### Grid Sizing
- **Default grid**: 30x30 cells
- **Cell size**: Responsive based on viewport
- **Mobile optimization**: 20x20 grid for smaller screens
- **Minimum cell size**: 15px to ensure visibility

---

## Progression & Unlockables

### Unlockable Snake Skins
- **Default**: Neon green glow
- **Rainbow** (Unlock: Score 500): Color shifts through spectrum
- **Fire** (Unlock: Score 1000): Orange/red with flame particles
- **Ice** (Unlock: Score 1500): Blue/white with frost trail
- **Gold** (Unlock: Score 2500): Shiny gold with sparkles
- **Shadow** (Unlock: Complete Survival 300+): Black with purple aura
- **Cosmic** (Unlock: Complete all modes 500+): Galaxy texture with stars

### Achievement System
- **First Blood**: Eat your first food (Tutorial complete)
- **Combo Master**: Achieve a 10x combo
- **Speed Demon**: Reach maximum speed
- **Survivor**: Score 500+ in Survival mode
- **Zen Master**: Grow to length 100 in Zen mode
- **Time Lord**: Score 300+ in Timed Challenge
- **Untouchable**: Complete a run with shield never breaking
- **Power Collector**: Collect all 5 power-up types in one game
- **Century Club**: Score 1000+ points
- **Leaderboard King**: Get top score in all 4 modes

---

## Leaderboard System

### Local Storage Leaderboards
- **Per-mode tracking**: Separate high scores for each game mode
- **Top 10 scores**: Display 10 best scores per mode
- **Score details**:
  - Points
  - Final snake length
  - Time survived
  - Date achieved
- **Personal best indicator**: Highlight player's best score
- **Clear data option**: Reset leaderboards if desired

### Session Statistics
- **Current session tracking**:
  - Games played
  - Average score
  - Best combo achieved
  - Total food consumed
  - Power-ups collected
  - Time played

---

## User Interface

### Main Menu
- **Game logo**: Animated Snake title with glowing effect
- **Mode selection**: 4 large buttons for each mode with preview animations
- **Settings button**: Gear icon in corner
- **Leaderboard button**: Trophy icon
- **How to Play button**: Question mark icon
- **Theme selector**: Visual thumbnails of available themes

### In-Game HUD
- **Score display**: Large, top-center with animated number changes
- **Combo counter**: Appears when combo active, pulses with level
- **Power-up indicator**: Icon and timer bar when power-up active
- **Length counter**: Current snake length
- **Timer** (Timed mode): Countdown with warning at 10 seconds
- **Pause button**: Top-right corner

### Game Over Screen
- **Final score**: Large, prominent display
- **Statistics summary**:
  - Final length
  - Longest combo
  - Power-ups collected
  - Time survived
- **New high score celebration**: If applicable, with confetti animation
- **Buttons**:
  - Play Again (same mode)
  - Change Mode
  - Main Menu
- **Share score**: Generate shareable image/text

### Settings Menu
- **Audio controls**: Master, SFX, Music volume sliders
- **Visual settings**: 
  - Theme selection
  - Particle density (Low/Medium/High)
  - Screen shake toggle
  - Reduce motion mode (accessibility)
- **Control settings**:
  - Key bindings customization
  - Swipe sensitivity (mobile)
- **Game settings**:
  - Starting difficulty
  - Grid size options
  - Show FPS counter

---

## Controls

### Desktop Controls
- **Arrow Keys**: Default movement (↑ ↓ ← →)
- **WASD**: Alternative movement
- **Spacebar**: Pause/Unpause
- **ESC**: Pause and open menu
- **M**: Mute/Unmute
- **Custom bindings**: Configurable in settings

### Mobile Controls
- **Swipe gestures**: 
  - Swipe up: Move up
  - Swipe down: Move down
  - Swipe left: Move left
  - Swipe right: Move right
- **Tap to pause**: Tap anywhere outside snake to pause
- **Virtual D-pad** (optional): On-screen directional buttons

### Control Logic
- **Input queuing**: Store 1 input ahead to allow faster direction changes
- **Reverse prevention**: Cannot move directly backwards into self
- **Diagonal ignored**: Only cardinal directions accepted

---

## Technical Requirements

### Performance Targets
- **Frame rate**: Consistent 60 FPS
- **Responsive input**: <16ms input latency
- **Smooth animations**: RequestAnimationFrame for all animations
- **Optimized rendering**: Canvas or WebGL for smooth particle effects

### Browser Compatibility
- **Modern browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile browsers**: iOS Safari, Chrome Mobile, Firefox Mobile
- **Fallback graphics**: Reduce particle effects on low-end devices

### Responsive Design
- **Desktop**: Optimized for 1920x1080 and above
- **Tablet**: Adjusted grid size and UI scaling
- **Mobile**: Portrait and landscape support, touch-optimized
- **Minimum resolution**: 375x667 (iPhone SE)

### Data Persistence
- **localStorage**: Save high scores, unlocked items, settings
- **Data structure**: JSON format for easy import/export
- **Fallback**: Session storage if localStorage unavailable

---

## Future Enhancements (Phase 2)

### Multiplayer
- **Local co-op**: Two snakes on same grid, compete for food
- **Online leaderboards**: Global rankings via backend service
- **Daily challenges**: Specific objectives that change daily

### Advanced Features
- **Custom maps**: Level editor for creating obstacle courses
- **Replay system**: Watch and share best runs
- **Tournament mode**: Elimination brackets with increasing difficulty
- **Seasonal events**: Limited-time themes and power-ups

### Accessibility
- **Colorblind modes**: Alternative color palettes
- **Screen reader support**: Audio cues for all game events
- **Difficulty presets**: Easy/Medium/Hard starting configurations
- **One-handed mode**: Alternative control scheme

---

## Development Roadmap

### Phase 1: Core Game (Week 1-2)
- Basic Snake mechanics
- Grid and movement system
- Food spawning and collision detection
- Score tracking
- Classic mode implementation

### Phase 2: Visual Polish (Week 3)
- Particle effects
- Animations and transitions
- Theme system
- Camera zoom functionality
- Sound effects integration

### Phase 3: Game Modes (Week 4)
- Timed Challenge mode
- Survival mode with obstacles
- Zen mode
- Power-up system implementation

### Phase 4: Meta Features (Week 5)
- Combo system
- Leaderboards
- Unlockable skins
- Achievement tracking
- Settings menu

### Phase 5: Testing & Optimization (Week 6)
- Performance optimization
- Mobile testing and refinement
- Bug fixes
- Balance adjustments
- Final polish

---

## Success Metrics

### Player Engagement
- Average session length: >5 minutes
- Replay rate: >60% of players start second game
- Mode variety: Players try at least 2 different modes

### Technical Performance
- Load time: <3 seconds on average connection
- FPS maintenance: >58 FPS average on mid-range devices
- Zero critical bugs in production

### User Satisfaction
- Collect player feedback on controls, difficulty, and visuals
- Iterate based on common themes
- Aim for 4+ star rating if published

---

## Conclusion

This modernized Snake game combines nostalgic gameplay with contemporary game design principles, creating an engaging and visually stunning experience. The layered difficulty, multiple game modes, and rich feedback systems provide depth while maintaining the simple, accessible core that made Snake a classic.

The specification balances ambitious features with achievable development goals, ensuring a polished final product that can be expanded over time based on player feedback and engagement data.
