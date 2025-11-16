# Solar System Explorer - Game Guide

## Overview

**Solar System Explorer** is a realistic space simulation game featuring accurate orbital mechanics, true-to-life celestial body data, and immersive exploration gameplay. Navigate through our solar system with a modular probe, discover planets, moons, dwarf planets, and asteroids while conducting scientific research.

## Key Features

### Realistic Physics & Astronomy
- **Accurate Orbital Mechanics**: All celestial bodies follow elliptical orbits calculated using Kepler's equations
- **True Physical Data**: Real sizes, masses, rotation periods, axial tilts, and atmospheric compositions
- **30 Celestial Bodies**: Sun, 8 planets, Pluto, 4 dwarf planets, 13 major moons, and 3 asteroids
- **Gravity Simulation**: Multi-body gravitational physics affecting probe trajectory
- **Stable Elliptical Orbits**: Proper eccentricity, inclination, and orbital periods

### Celestial Bodies Included

**Planets**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune

**Dwarf Planets**: Ceres, Pluto, Eris, Makemake, Haumea

**Moons**: 
- Earth: Moon
- Jupiter: Io, Europa, Ganymede, Callisto
- Saturn: Mimas, Enceladus, Tethys, Dione, Rhea, Iapetus, Titan
- Neptune: Triton

**Asteroids**: Vesta, Pallas, Hygiea

### Gameplay Features

#### Probe Control
- **Physics-Based Movement**: Thrust in any direction with realistic momentum
- **Rotation Control**: Orient your probe for precise maneuvers
- **Boost Mode**: Accelerate faster when needed (consumes more fuel)
- **Fuel Management**: Limited fuel requires strategic planning
- **Energy System**: Solar panels regenerate energy over time

#### Scientific Modules
1. **Scanner (S)**: Detect and analyze nearby celestial bodies
   - Reveals basic data: mass, diameter, composition
   - Awards 10 science points per scan
   - First discovery bonus: +50 science points

2. **Mapper (M)**: Create detailed surface maps from orbit
   - Requires stable orbit (specific altitude range)
   - Awards 30 science points per mapping
   - Records surface features

3. **Lander (L)**: Touch down on solid surfaces
   - Requires low altitude and slow speed
   - Awards 100 science points per landing
   - Collects surface samples

4. **Camera (C)**: Capture stunning space photographs
   - Works from any location
   - Awards 5 science points per photo
   - Build your space photography collection

#### Time Control
- **Time Warp Levels**: 1x, 10x, 100x, 1000x, 10000x, 100000x
- **Pause Function**: Stop time to plan your next move
- **Real-Time Date**: Watch days, months, and years pass

#### Camera System
- **Free Camera**: Rotate view with mouse drag
- **Follow Mode**: Lock camera to any celestial body
- **Zoom Control**: Mouse wheel to zoom in/out
- **3D Perspective**: Full three-dimensional visualization

## Controls

### Keyboard Controls

| Key | Action |
|-----|--------|
| **W** | Thrust forward |
| **S** | Thrust backward |
| **A** | Thrust left |
| **D** | Thrust right |
| **Q** | Rotate counterclockwise |
| **E** | Rotate clockwise |
| **SPACE** | Boost (3x thrust power) |
| **T** | Increase time warp |
| **R** | Decrease time warp |
| **P** | Pause/unpause |
| **TAB** | Cycle through celestial bodies |
| **F** | Toggle follow mode on selected body |
| **S** | Activate scanner |
| **M** | Activate mapper |
| **L** | Attempt landing |
| **C** | Take photo |

### Mouse Controls

| Action | Control |
|--------|---------|
| **Rotate Camera** | Click and drag |
| **Zoom In/Out** | Scroll wheel |
| **Select Body** | Click on body name in right panel |

## User Interface

### Top Bar
- **Date/Time Display**: Current simulation date and time
- **Time Warp Indicator**: Shows current time acceleration (flashes red when paused)
- **Selected Body**: Name of currently selected celestial body
- **Science Points**: Total accumulated science points
- **Discovery Counter**: Bodies discovered / Total discoverable bodies

### Left Panel - Probe Status
- **Velocity**: Current speed in km/s
- **Altitude**: Distance from selected body (km or AU)
- **Fuel**: Remaining fuel percentage
- **Energy**: Current energy level (regenerates via solar panels)

### Left Panel - Target Info
- **Body Name**: Selected celestial body
- **Distance**: Distance from probe to target
- **Type**: Classification (PLANET, MOON, DWARF, ASTEROID)
- **Diameter**: Size of the body in kilometers

### Right Panel - Celestial Bodies
- **Scrollable List**: All 30 celestial bodies organized by type
- **Color Coding**: 
  - Cyan border: Not yet discovered
  - Green border: Discovered
  - Purple highlight: Currently selected
- **Click to Select**: Choose any body as your target

### Bottom Bar
- **Quick Reference**: All keyboard controls at a glance

### Center HUD
- **Crosshair**: Center of screen reference
- **Velocity Vector**: Yellow line showing probe's direction of travel

## Gameplay Tips

### Getting Started
1. **Start Location**: You begin near Earth with initial orbital velocity
2. **First Mission**: Try to reach and scan the Moon
3. **Learn Controls**: Practice maneuvering in space before long journeys
4. **Watch Your Fuel**: Plan your burns carefully

### Efficient Space Travel
1. **Use Time Warp**: Long distances require patience - increase time warp for interplanetary travel
2. **Gravity Assists**: Fly close to planets to gain velocity (advanced technique)
3. **Orbital Mechanics**: Thrust in the direction of travel to increase orbit, opposite to decrease
4. **Conservation**: Coast when possible to save fuel

### Scientific Progression
1. **Scan Everything**: Use the scanner liberally - it's low cost and high reward
2. **Map from Orbit**: Achieve stable orbit before mapping (not too close, not too far)
3. **Land Carefully**: Approach slowly and reduce speed before landing attempts
4. **Photograph Rare Events**: Capture unique alignments and close encounters

### Advanced Techniques
1. **Hohmann Transfer**: Most efficient way to change orbits
2. **Gravity Slingshot**: Use planetary flybys to gain speed
3. **Orbital Insertion**: Match velocity with target body for stable orbit
4. **Multi-Body Tours**: Plan routes that visit multiple moons efficiently

## Technical Details

### Orbital Mechanics Implementation
The game uses **Kepler's equations** to calculate precise orbital positions:

1. **Mean Motion**: n = 2π / T (orbital period)
2. **Mean Anomaly**: M = n × t (time-dependent position)
3. **Eccentric Anomaly**: Solved iteratively using Newton-Raphson method
4. **True Anomaly**: Converted from eccentric anomaly
5. **3D Position**: Transformed using inclination, longitude of ascending node, and argument of periapsis

### Gravity Simulation
Multi-body gravitational forces calculated using:
- **Newton's Law**: F = G × m₁ × m₂ / r²
- **Acceleration**: a = F / m_probe
- **Velocity Update**: Integrates acceleration over time
- **Position Update**: Integrates velocity over time

### Accurate Data Sources
All celestial body data sourced from:
- NASA JPL Horizons System
- Astronomy Notes (Nick Strobel)
- IAU (International Astronomical Union)

## Performance Notes

- **Optimized Rendering**: Only visible objects are drawn
- **Efficient Calculations**: Orbital positions cached when possible
- **Smooth Animation**: 60 FPS target with adaptive time steps
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## Achievements to Pursue

- **Inner System Explorer**: Visit all inner planets (Mercury, Venus, Earth, Mars)
- **Gas Giant Tourist**: Visit all gas giants (Jupiter, Saturn, Uranus, Neptune)
- **Moon Collector**: Discover all 13 major moons
- **Dwarf Planet Hunter**: Find all 5 dwarf planets
- **Asteroid Prospector**: Visit all 3 asteroids
- **Complete Explorer**: Discover all 29 bodies
- **Master Lander**: Successfully land on 10 different bodies
- **Photographer**: Take 100 photos
- **Science Master**: Accumulate 5000+ science points

## Educational Value

This game accurately demonstrates:
- **Kepler's Laws of Planetary Motion**
- **Newton's Law of Universal Gravitation**
- **Conservation of Energy and Momentum**
- **Orbital Mechanics and Space Navigation**
- **Scale of the Solar System**
- **Diversity of Planetary Bodies**
- **Challenges of Space Exploration**

## Credits

**Game Design & Development**: Created as a realistic solar system simulation

**Data Sources**:
- NASA Jet Propulsion Laboratory
- Nick Strobel's Astronomy Notes
- International Astronomical Union

**Technologies**: HTML5 Canvas, JavaScript, CSS3

---

**Enjoy your journey through our solar system! Remember: In space, patience and planning are your best friends.**
