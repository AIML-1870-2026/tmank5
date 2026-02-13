# Early Graduation Decision Neural Network - Technical Specification

## Project Overview
An interactive web-based neural network visualization that helps model the decision of whether to graduate early from college. The application features real-time probability calculation, animated neural network visualization, and comprehensive user controls.

## Design Requirements

### Visual Style
- **Clean & modern aesthetic** with smooth animations
- Professional appearance suitable for academic presentation
- Responsive design that works on desktop and tablet
- Color scheme: Modern gradients with professional accent colors
- Smooth transitions between all state changes (300-500ms)

## Core Features

### 1. Interactive Sliders (Input Layer)
Eight input factors, each with a slider control (0-100%):

**Factors in priority order with their neural network weights:**
1. **Academic Readiness** (Weight: 1.0)
   - GPA, credits completed, requirements met
   - Label: "Academic Readiness"
   
2. **Post-Grad Plan Certainty** (Weight: 0.85)
   - Clear path vs. uncertain future
   - Label: "Post-Grad Plan Certainty"
   
3. **Career Timing** (Weight: 0.70)
   - Job market conditions, grad school deadlines
   - Label: "Career Timing"
   
4. **Skills Preparedness** (Weight: 0.55)
   - Ready for real world, professional skills
   - Label: "Skills Preparedness"
   
5. **Social Connections** (Weight: 0.40)
   - Friends graduating, campus life, relationships
   - Label: "Social Connections"
   
6. **Financial Factors** (Weight: 0.30)
   - Student loans, cost savings, job offers
   - Label: "Financial Factors"
   
7. **Mental Health & Burnout** (Weight: 0.20)
   - Stress level, need for break
   - Label: "Mental Health & Burnout"
   
8. **Family Expectations** (Weight: 0.10)
   - Family pressure and expectations
   - Label: "Family Expectations"

**Slider Requirements:**
- Each slider has a label showing the factor name
- Real-time value display (0-100%) next to each slider
- Smooth visual feedback when adjusting
- Default starting position: 50% for all sliders
- Sliders should be vertically stacked on the left side of the interface

### 2. Neural Network Visualization

**Network Architecture:**
- **Input Layer:** 8 nodes (one per factor)
- **Hidden Layer 1:** 6 nodes
- **Hidden Layer 2:** 4 nodes
- **Output Layer:** 1 node (final probability)

**Visual Requirements:**
- Nodes rendered as circles
- Connections (edges) between layers shown as lines
- **Animation effects:**
  - Nodes pulse/glow based on activation strength
  - Brighter = higher activation value
  - Connections change thickness based on weight strength
  - Connections change color intensity based on signal strength
  - Smooth transitions when sliders are adjusted (animate over 300ms)

**Node Sizing:**
- Input nodes: Medium (40px diameter)
- Hidden layer nodes: Medium (35px diameter)
- Output node: Large (60px diameter)

**Connection Rendering:**
- Line thickness: 1-5px based on weight (higher weight = thicker)
- Color intensity: Fade from light to vibrant based on activation
- All connections from input to hidden layer 1
- All connections from hidden layer 1 to hidden layer 2
- All connections from hidden layer 2 to output

**Layout:**
- Center the network visualization in the main area
- Adequate spacing between layers
- Symmetric arrangement of nodes within each layer

### 3. Real-Time Probability Display

**Large Probability Gauge:**
- Display final probability as percentage (0-100%)
- Located prominently near or below the output node
- **Visual style options:**
  - Large percentage number (e.g., "73%")
  - Progress bar or semi-circular gauge
  - Color-coded: Red (0-33%), Yellow (34-66%), Green (67-100%)
- Updates in real-time as sliders change
- Smooth animation of probability changes

**Recommendation Text:**
- Below probability: "Strong recommendation to graduate early" (>70%)
- "Consider graduating early" (50-70%)
- "Uncertain - needs more consideration" (30-50%)
- "Recommendation to stay" (<30%)

### 4. Mathematical Breakdown Panel

**Side Panel Display:**
- Show weighted calculation details
- Display for each input:
  - Factor name
  - Current slider value (%)
  - Weight value
  - Weighted contribution (value × weight)
- Show hidden layer activations
- Show final output calculation
- Use monospace font for numbers
- Collapsible panel to save space (optional)

**Example format:**
```
INPUT LAYER CALCULATIONS
────────────────────────
Academic Readiness:        75% × 1.00 = 0.750
Post-Grad Plan Certainty:  60% × 0.85 = 0.510
Career Timing:             80% × 0.70 = 0.560
...

HIDDEN LAYER 1 (6 nodes)
────────────────────────
Node 1: σ(2.340) = 0.912
Node 2: σ(1.875) = 0.867
...

OUTPUT
────────────────────────
Final Probability: 73.4%
```

### 5. Preset Scenario Buttons

Four preset scenarios that auto-adjust all sliders:

**Scenario 1: "Dream Job Offer"**
- Academic Readiness: 85%
- Post-Grad Plan Certainty: 95%
- Career Timing: 90%
- Skills Preparedness: 80%
- Social Connections: 40%
- Financial Factors: 85%
- Mental Health & Burnout: 60%
- Family Expectations: 70%

**Scenario 2: "Struggling Financially"**
- Academic Readiness: 70%
- Post-Grad Plan Certainty: 50%
- Career Timing: 60%
- Skills Preparedness: 55%
- Social Connections: 60%
- Financial Factors: 90%
- Mental Health & Burnout: 40%
- Family Expectations: 65%

**Scenario 3: "Loving College Life"**
- Academic Readiness: 75%
- Post-Grad Plan Certainty: 40%
- Career Timing: 50%
- Skills Preparedness: 60%
- Social Connections: 95%
- Financial Factors: 50%
- Mental Health & Burnout: 80%
- Family Expectations: 30%

**Scenario 4: "Totally Burnt Out"**
- Academic Readiness: 80%
- Post-Grad Plan Certainty: 65%
- Career Timing: 70%
- Skills Preparedness: 70%
- Social Connections: 30%
- Financial Factors: 60%
- Mental Health & Burnout: 15%
- Family Expectations: 50%

**Button Requirements:**
- Placed in a row above or below the network visualization
- Clear labels
- Smooth animation when sliders transition to preset values (500ms)
- Visual feedback on button click

### 6. Save/Compare Configurations

**Save Functionality:**
- "Save Current Config" button
- Prompts for a name/label
- Stores all 8 slider values + timestamp
- Displays saved configurations in a list
- Maximum 5 saved configurations

**Comparison View:**
- "Compare Saved Configs" button
- Shows side-by-side comparison of 2-3 saved scenarios
- Table format showing:
  - Configuration name
  - All slider values
  - Final probability
  - Recommendation
- Highlight differences between configurations
- Option to load a saved configuration back into the main view

## Technical Implementation Requirements

### Neural Network Calculation

**Forward Propagation:**
1. **Input Layer:** Normalize slider values (0-100% → 0-1)
2. **Input to Hidden Layer 1:**
   - Weighted sum: `z = Σ(input_i × weight_i) + bias`
   - Activation function: Sigmoid `σ(z) = 1 / (1 + e^(-z))`
3. **Hidden Layer 1 to Hidden Layer 2:**
   - Same weighted sum and activation
4. **Hidden Layer 2 to Output:**
   - Final weighted sum and sigmoid activation
   - Output as percentage (0-100%)

**Weight Initialization:**
- Input to Hidden Layer 1: Use the specified weights (1.0, 0.85, 0.70, etc.) for each input
- Hidden Layer connections: Random initialization (-0.5 to 0.5) or fixed values
- Bias terms: Initialize to 0 or small random values

**Real-time Calculation:**
- Recalculate on every slider change
- Update visualization within 50ms
- Smooth animation of changes

### Technology Stack Recommendations
- **HTML5/CSS3/JavaScript** (vanilla or framework)
- **Canvas or SVG** for neural network rendering
- **React** (recommended for state management and smooth updates)
- **D3.js** or **Paper.js** (optional, for advanced visualizations)
- No backend required - pure client-side application

### Performance Requirements
- Smooth 60fps animations
- Instant slider response (<50ms)
- Network visualization updates in real-time
- No lag when adjusting multiple sliders quickly

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         HEADER                               │
│        Early Graduation Decision Neural Network              │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────┬───────────────────┐
│              │                          │                   │
│   SLIDERS    │   NEURAL NETWORK VIZ     │  MATH BREAKDOWN   │
│   (Input     │                          │  (Calculations)   │
│   Controls)  │   [Animated Network]     │                   │
│              │                          │                   │
│              │   ┌──────────────┐       │                   │
│              │   │ PROBABILITY  │       │                   │
│              │   │    73.4%     │       │                   │
│              │   │  Recommend   │       │                   │
│              │   └──────────────┘       │                   │
│              │                          │                   │
└──────────────┴──────────────────────────┴───────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    PRESET SCENARIOS                          │
│  [Dream Job] [Struggling $] [Love College] [Burnt Out]      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 SAVE/COMPARE SECTION                         │
│  [Save Config] [Compare Saved] [Saved Configs List]         │
└─────────────────────────────────────────────────────────────┘
```

## User Experience Flow

1. User lands on page with all sliders at 50% (neutral state)
2. Initial probability displayed (~50%)
3. User explores by:
   - Adjusting individual sliders → sees immediate network updates
   - Clicking preset scenarios → sees sliders animate to new values
   - Viewing math breakdown → understands the calculation
4. User saves interesting configurations
5. User compares different scenarios side-by-side
6. User makes informed decision based on exploration

## Additional Features (Nice to Have)

### Hover Interactions
- **Hover over nodes:** Show activation value tooltip
- **Hover over connections:** Show weight value
- **Hover over slider:** Show factor description/tooltip

### Export Functionality
- "Export Report" button
- Generates PDF or image with:
  - Current configuration
  - Probability result
  - Visual snapshot of network
  - All slider values

### Tutorial/Help
- "?" button that explains how to use the tool
- Brief explanation of neural network concepts
- Guide to interpreting results

### Responsive Design
- Desktop: Full three-column layout
- Tablet: Two-column (sliders + network, math panel collapsible)
- Mobile: Single column, stacked vertically

## Success Criteria

The implementation should:
1. ✅ Display all 8 input sliders with real-time value updates
2. ✅ Render complete neural network with 4 layers (8-6-4-1 architecture)
3. ✅ Animate nodes and connections based on activation/weights
4. ✅ Calculate and display probability in real-time
5. ✅ Show mathematical breakdown of calculations
6. ✅ Include all 4 preset scenarios
7. ✅ Allow saving and comparing configurations
8. ✅ Maintain clean, modern, professional appearance
9. ✅ Run smoothly without performance issues
10. ✅ Be impressive enough to make a professor happy!

## Notes for Implementation

- **Sigmoid activation function** is recommended for smooth probability outputs
- Keep colors consistent throughout (pick a cohesive palette)
- Add subtle shadows and depth for modern look
- Ensure all animations are smooth (use CSS transitions or requestAnimationFrame)
- Test with various slider combinations to ensure realistic outputs
- Consider adding a "Reset to Default" button (all sliders to 50%)

---

**End of Specification**

This spec should provide everything needed to build a complete, professional, and impressive early graduation decision neural network visualization tool.
