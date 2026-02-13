# Fish Flocking Game -- Full Specification Sheet

## Purpose of This Document

This document is a complete, implementation-ready specification for a
fish-themed boids-style game. It is written to be consumed by another
LLM or developer and contains behavior rules, systems, parameters,
controls, and design constraints needed to accurately code the game.

The game is a real-time, interactive flocking simulation with creative
extensions, not a traditional win/lose game.

------------------------------------------------------------------------

## Core Concept

Simulate a school of fish using classic boids rules (Separation,
Alignment, Cohesion) while layering in: - Fish-specific behavior -
Environmental forces - Mood and state systems - Extensive real-time
tunable parameters - Keyboard-driven control and debugging

The experience should feel organic, fluid, and expressive.

------------------------------------------------------------------------

## Entities

### Fish (Primary Agent)

Each fish is an autonomous agent with the following properties:

**State Variables** - position (x, y) - velocity (x, y) - acceleration
(x, y) - maxSpeed - maxForce - perceptionRadius - separationRadius -
moodState (enum) - energy (0--1)

**Visual Properties** - Color (based on mood) - Size (slight random
variation) - Heading indicates velocity direction

------------------------------------------------------------------------

## Fundamental Behavior Rules (MANDATORY)

### 1. Separation

-   If another fish is within separationRadius, apply a repulsive force
-   Force strength increases as distance decreases
-   Prevents overlap and collisions

### 2. Alignment

-   Average velocity of nearby fish within perceptionRadius
-   Steer current velocity toward that average
-   Smooths group movement

### 3. Cohesion

-   Average position of nearby fish within perceptionRadius
-   Steer toward that center point
-   Maintains school structure

Total Acceleration = weighted sum of all forces

------------------------------------------------------------------------

## Additional Fish-Specific Behaviors

### Wall / Boundary Avoidance

-   Fish gently steer away from screen edges
-   No hard collisions or bouncing

### Flow Drift (Water Current)

-   Global vector force applied to all fish
-   Can be static or noise-based

### School Compression

-   When threatened, cohesion weight temporarily increases

------------------------------------------------------------------------

## Mood System

### Mood Types

#### Calm

-   High cohesion
-   Medium alignment
-   Low separation
-   Lower maxSpeed

#### Alert

-   Medium cohesion
-   High alignment
-   Medium separation
-   Higher maxSpeed

#### Panicked

-   Low cohesion
-   Low alignment
-   Very high separation
-   Very high maxSpeed

#### Curious

-   Medium cohesion
-   Low alignment
-   Medium separation
-   Attracted to points of interest

Mood transitions should be smoothly interpolated.

------------------------------------------------------------------------

## Environmental Objects

### Food Particles

-   Attract nearby fish
-   Increase energy on contact

### Predators

-   Larger agents
-   Cause panic in nearby fish

### Obstacles (Optional)

-   Static shapes fish must steer around

------------------------------------------------------------------------

## Player Interaction

### Mouse / Pointer

-   Left Click: Spawn food
-   Right Click: Create scare pulse

------------------------------------------------------------------------

## Keyboard Controls

### Simulation Controls

-   Space: Pause / Resume
-   R: Reset simulation
-   N: Spawn more fish
-   M: Remove fish

### Global Toggles

-   1: Toggle separation
-   2: Toggle alignment
-   3: Toggle cohesion
-   4: Toggle predators
-   5: Toggle water current

### Mood Overrides

-   Q: Force Calm
-   W: Force Alert
-   E: Force Panicked
-   T: Force Curious

### Debug / Visualization

-   D: Toggle perception radius display
-   F: Toggle force vectors
-   G: Toggle grid / spatial partitioning view

------------------------------------------------------------------------

## Tunable Parameters

### Boid Weights

-   separationWeight
-   alignmentWeight
-   cohesionWeight

### Movement

-   maxSpeed
-   maxForce
-   drag / damping

### Perception

-   perceptionRadius
-   separationRadius

### Environment

-   currentStrength
-   foodAttractionStrength
-   predatorFearRadius

------------------------------------------------------------------------

## Performance Requirements

-   Support 200--1000 fish
-   Use spatial partitioning
-   Avoid O(n²) neighbor checks

------------------------------------------------------------------------

## Visual Style

-   Fish rendered as triangles or simple sprites
-   Orientation matches velocity
-   Color-coded by mood
-   Motion trails optional

------------------------------------------------------------------------

## Architecture Notes

### Update Loop

1.  Gather neighbors
2.  Calculate separation
3.  Calculate alignment
4.  Calculate cohesion
5.  Apply environmental forces
6.  Apply mood modifiers
7.  Limit force and speed
8.  Update velocity and position
9.  Render

------------------------------------------------------------------------

## Non-Goals

-   No scoring system
-   No win/lose state
-   No scripted paths

------------------------------------------------------------------------

## Design Philosophy

Simple local rules produce complex global behavior. The system rewards
watching, tweaking, and experimenting.
