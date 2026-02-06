# Turing Patterns Simulation - Project Specification

## Project Overview
Create an interactive, web-based Turing patterns simulation using reaction-diffusion systems. The simulation should be visually stunning, highly interactive, and educational, allowing users to explore the emergence of natural patterns through mathematical models.

## Core Technology Stack
- HTML5 Canvas or WebGL for rendering
- JavaScript for simulation logic
- GPU acceleration (WebGL compute shaders) for performance
- Modern CSS for UI styling
- No heavy framework dependencies preferred (vanilla JS or lightweight libs)

## 1. Simulation Engine

### Reaction-Diffusion Models
Implement multiple reaction-diffusion model types:
- **Gray-Scott Model** (primary - most visually interesting)
- **FitzHugh-Nagumo Model**
- **Gierer-Meinhardt Model**

Each model should support:
- Configurable parameters (diffusion rates, feed rate, kill rate, etc.)
- Numerical integration using appropriate method (Euler or Runge-Kutta)
- Efficient computation for real-time performance

### Grid System
- Adjustable grid resolution (e.g., 256x256, 512x512, 1024x1024)
- 2D array structure storing chemical concentrations (activator and inhibitor)
- Option to scale grid size based on performance/device capability

### Boundary Conditions
Implement three boundary condition types:
- **Wrap-around (Toroidal)**: Edges connect to opposite sides, creating seamless tiling
- **Reflective**: Gradients reflect at boundaries (Neumann boundary conditions)
- **Fixed**: Boundaries held at constant values (Dirichlet boundary conditions)

User should be able to switch between these during runtime.

## 2. Interactive Controls

### Real-Time Parameter Adjustment
Provide sliders/inputs for:
- Diffusion rate for activator (Da)
- Diffusion rate for inhibitor (Di)
- Feed rate (F)
- Kill rate (k)
- Time step (dt)
- Model selection dropdown

Changes should update the simulation in real-time.

### Drawing Tools
- **Paint Brush**: Add activator chemical to clicked/dragged locations
- **Inhibitor Brush**: Add inhibitor chemical
- **Eraser**: Reset areas to base state
- **Obstacle Placement**: Create barriers that block diffusion
- Adjustable brush size
- Brush strength/intensity control

### Interaction Modes
- **Seed Patterns**: Click to inject chemical disturbances
- **Flow Fields**: Click and drag to create directional bias in diffusion
- **Continuous Injection**: Hold mouse to continuously add chemicals
- **Image Upload**: Load an image file to use as initial conditions (brightness maps to concentration)
- **Disturbance Injection**: Click to create localized perturbations

### Time Controls
- **Play/Pause**: Toggle simulation
- **Step Forward**: Advance one iteration
- **Reset**: Clear to initial state
- **Speed Control**: Adjust simulation speed (iterations per frame)

## 3. Visual & Aesthetic Enhancements

### Color Schemes
Implement multiple switchable color palettes:
- Heat map (blue → red → yellow)
- Neon (vibrant cyan/magenta/yellow)
- Grayscale
- Custom gradient editor (user can define color stops)
- Inverted modes
- Preset gallery (Ocean, Forest, Sunset, etc.)

### Rendering Options
- **3D Visualization**: Option to render pattern intensity as height in 3D space
  - Camera controls (rotate, zoom, pan)
  - Lighting system
- **Layering**: Ability to run and blend multiple pattern systems simultaneously
  - Adjustable opacity per layer
  - Different blend modes (add, multiply, screen)

### Post-Processing Effects
- Glow/bloom effect
- Gaussian blur
- Edge detection/outline
- Contrast/brightness adjustment
- Saturation control
- Toggle effects on/off independently

### Particle Systems
- Particles that follow pattern gradients
- Adjustable particle count
- Particle size and color
- Flow visualization option

## 4. Presets & Discovery

### Pattern Presets Library
Include famous Turing pattern types:
- **Spots**: Stable circular formations
- **Stripes**: Parallel bands
- **Labyrinth**: Maze-like structures
- **Spirals**: Rotating wave patterns
- **Mitosis**: Splitting spots
- **Waves**: Traveling patterns

Each preset should have:
- Name and description
- Thumbnail preview
- Pre-configured parameters
- Initial condition setup

### Random Generation
- "Random" button to generate random valid parameters
- Seed system for reproducibility
- Display current seed value
- Input field to enter specific seed
- "Save interesting finds" feature

### Save/Load System
- Export current state (parameters + grid state) as JSON
- Import saved states
- Browser localStorage for quick saves
- Download/upload functionality

## 5. Educational Features

### Side-by-Side Comparison
- Split screen mode showing two simulations
- Run different parameters simultaneously
- Synchronized controls option
- Visual diff highlighting

### Information Display
- Real-time statistics:
  - Current iteration count
  - Pattern wavelength estimation
  - Density/coverage percentage
  - Entropy or complexity measure
- Tooltips explaining parameters
- Mini documentation panel

### Parameter Impact Visualization
- Show how changing specific parameters affects patterns
- Before/after comparison snapshots
- Suggested parameter ranges for specific pattern types

## 6. Export & Sharing

### Animation Export
- Record simulation evolution
- Export as animated GIF
- Export as video (WebM or MP4 if possible)
- Configurable duration and frame rate
- Export current frame as PNG

### Seamless Tiling Mode
- Generate patterns that tile seamlessly
- Export tileable texture
- Preview tiled result (3x3 grid view)

## 7. Performance Optimization

### GPU Acceleration
- Use WebGL shaders for diffusion computation
- Fragment shader for rendering
- Fallback to CPU computation if WebGL unavailable

### Optimization Features
- Adjustable quality settings
- FPS counter
- Performance mode toggle (reduced features for better performance)
- Adaptive quality based on device capability

## 8. User Interface Design

### Layout
- Main canvas area (takes majority of screen)
- Collapsible side panel for controls
- Top toolbar for quick actions
- Bottom status bar for info display

### Responsive Design
- Works on desktop and tablet
- Touch-friendly controls
- Adaptive layout for different screen sizes

### UI Elements
- Modern, clean aesthetic
- Smooth animations
- Keyboard shortcuts for common actions
- Help/tutorial overlay for first-time users

## 9. Additional Features (Nice to Have)

### Audio Reactivity
- Microphone input option
- Parameters respond to audio frequency/amplitude
- Music file upload and analysis

### Pattern Morphing
- Smoothly interpolate between different parameter sets
- Animated transitions
- Keyframe system for complex animations

### Generative Art Applications
- Convert patterns to SVG line art
- ASCII art conversion
- Use as displacement maps
- Mesh generation from pattern data

## 10. Technical Requirements

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- WebGL 2.0 support preferred
- Graceful degradation for older browsers

### Performance Targets
- Maintain 30+ FPS on mid-range devices
- Handle at least 512x512 grid in real-time
- Smooth interaction with no input lag

### Code Quality
- Well-commented code
- Modular architecture
- Separate concerns (simulation, rendering, UI)
- Easy to extend with new models or features

## 11. Project Deliverables

1. Fully functional web application
2. README with:
   - Setup instructions
   - Usage guide
   - Parameter explanations
   - Technical documentation
3. Example presets
4. Commented source code
5. Optional: Deployment to GitHub Pages or similar

## Success Criteria

The project is successful if:
- Patterns emerge and evolve realistically
- All interaction modes work smoothly
- Users can easily create and explore different patterns
- Performance is acceptable on target devices
- UI is intuitive and visually appealing
- Code is maintainable and well-structured

## Implementation Priority

**Phase 1 (Core):**
- Basic Gray-Scott simulation
- Canvas rendering
- Essential parameter controls
- Play/pause/reset

**Phase 2 (Interaction):**
- Drawing tools
- Boundary conditions
- Presets library
- Save/load

**Phase 3 (Visual):**
- Color schemes
- Post-processing effects
- 3D visualization

**Phase 4 (Advanced):**
- GPU acceleration
- Additional models
- Audio reactivity
- Export features

Start with Phase 1 and progressively add features from subsequent phases.
