# Vanilla JS Pixel Art Helmet App Architecture

## Project Structure
```
vanilla-pixel-art/
├── index.html              # Main HTML file
├── css/
│   ├── main.css            # Main styles
│   ├── canvas.css          # Canvas-specific styles
│   ├── palette.css         # Palette component styles
│   ├── hud.css             # HUD component styles
│   └── tools.css           # Tools component styles
├── js/
│   ├── main.js             # Application entry point
│   ├── modules/
│   │   ├── PixelCanvas.js  # Canvas management module
│   │   ├── PaletteManager.js # Palette management module
│   │   ├── HUDManager.js   # HUD elements module
│   │   ├── ToolManager.js  # Drawing tools module
│   │   ├── ProjectManager.js # Save/load functionality
│   │   └── EventManager.js # Event handling coordination
│   └── utils/
│       ├── ColorUtils.js   # Color manipulation utilities
│       ├── FileUtils.js    # File I/O utilities
│       └── DOMUtils.js     # DOM manipulation utilities
└── assets/
    └── icons/              # Tool icons and UI elements
```

## Module Design Principles

### 1. PixelCanvas Module
- Manages 64x64 pixel grid
- Handles drawing operations (brush, eraser, fill)
- Provides zoom and pan functionality
- Renders HUD overlay effects
- Exports pixel data

### 2. PaletteManager Module
- Manages color palettes (default, helmet, visor presets)
- Handles custom color creation and management
- Provides color picker functionality
- Manages user-defined palette slots (Color 1-5)
- Exports/imports palette configurations

### 3. HUDManager Module
- Manages HUD text elements on visor
- Provides letter bank (0-9, A-Z)
- Handles text placement and sizing
- Implements curved visor effects
- Manages HUD element properties (color, size, position)

### 4. ToolManager Module
- Manages drawing tools (brush, eraser, fill, line, rectangle)
- Handles tool selection and configuration
- Provides undo/redo functionality
- Manages brush sizes and tool properties
- Implements keyboard shortcuts

### 5. ProjectManager Module
- Handles project save/load operations
- Manages project metadata
- Exports pixel art as PNG/JSON
- Imports project files
- Maintains project history

### 6. EventManager Module
- Coordinates inter-module communication
- Manages global event handling
- Provides pub/sub pattern for module communication
- Handles keyboard shortcuts globally

## Data Structures

### Pixel Grid
```javascript
// 64x64 array of color values (hex strings or null for transparent)
pixelGrid = [
  [null, "#FFD700", null, ...], // Row 0
  [null, null, "#FF0000", ...], // Row 1
  ...
]
```

### HUD Element
```javascript
hudElement = {
  id: "unique_id",
  text: "DISPLAY",
  position: { x: 15, y: 15 },
  color: "#0066CC",
  size: "M", // S, M, L
  curved: true,
  opacity: 1.0
}
```

### Palette Configuration
```javascript
palette = {
  name: "helmet",
  colors: ["#FFD700", "#FFA500", "#FF8C00", ...],
  customColors: ["#CUSTOM1", "#CUSTOM2", ...]
}
```

### Project Data
```javascript
project = {
  name: "helmet-design",
  pixelData: pixelGrid,
  hudElements: [hudElement1, hudElement2, ...],
  palette: palette,
  metadata: {
    created: "2025-01-01T00:00:00Z",
    modified: "2025-01-01T00:00:00Z",
    version: "1.0"
  }
}
```

## Key Features Implementation

### 1. Programmable Palette System
- Predefined palettes (default, helmet, visor)
- Custom color slots with hex input
- Color picker integration
- Palette export/import functionality

### 2. HUD Elements with Curved Visor
- Text rendering with CSS transforms for curve effect
- Letter bank for quick character input
- Preset text options (DISPLAY, HELMET, STATUS, etc.)
- Custom text input capability
- Position and size controls

### 3. Advanced Drawing Tools
- Brush with variable sizes (1-5px)
- Eraser tool
- Fill/bucket tool with flood fill algorithm
- Line and rectangle tools
- Eyedropper for color picking

### 4. Project Management
- Save/load projects as JSON
- Export pixel art as PNG (64x64)
- Project metadata tracking
- Undo/redo with history management

### 5. User Interface
- Clean, responsive design
- Keyboard shortcuts
- Real-time statistics display
- Pixel array data visualization
- Mobile-friendly touch support

## Module Communication Pattern

```javascript
// Event-driven architecture
EventManager.emit('colorSelected', { color: '#FFD700' });
EventManager.on('pixelPainted', (data) => {
  // Update statistics, save to history, etc.
});
```

This modular architecture ensures:
- Clean separation of concerns
- Easy maintenance and testing
- Extensible design for future features
- Efficient performance with minimal dependencies

