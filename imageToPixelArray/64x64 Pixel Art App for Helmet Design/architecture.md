# Pixel Art Helmet App Architecture

## Overview
A React-based 64x64 pixel art application specifically designed for creating helmet designs with programmable palettes and HUD elements on curved visors.

## Core Features Analysis (from reference images)
1. **64x64 Pixel Grid**: Main canvas for pixel art creation
2. **Palette System**: Predefined colors + 5 user-customizable slots
3. **HUD Text System**: Letter bank with alphanumeric characters for visor display
4. **Drawing Tools**: Brush, eraser, fill, selection tools
5. **Project Management**: Save/load functionality with JSON export
6. **Curved Visor Effect**: Special rendering for HUD elements on helmet visor

## Component Architecture

### Main App Structure
```
App
├── Header (title, project controls)
├── Toolbar (drawing tools, palette)
├── Canvas (64x64 pixel grid)
├── Sidebar (HUD controls, settings)
└── Footer (status, export options)
```

### Core Components

#### 1. PixelCanvas
- 64x64 grid of clickable pixels
- Zoom and pan functionality
- Real-time pixel manipulation
- Overlay system for HUD elements

#### 2. PaletteManager
- Predefined color swatches
- 5 user-customizable color slots
- Color picker integration
- Active color selection

#### 3. HUDSystem
- Letter bank (A-Z, 0-9, symbols)
- Text placement controls
- Size and positioning options
- Curved visor rendering effect

#### 4. DrawingTools
- Brush tool (multiple sizes)
- Eraser tool
- Fill/bucket tool
- Selection tool
- Undo/redo system

#### 5. ProjectManager
- Save project as JSON
- Load project from file
- Export as PNG/other formats
- Project metadata management

## Data Structures

### Pixel Grid
```javascript
// 64x64 array of color indices
pixelGrid: number[64][64]
```

### Palette
```javascript
palette: {
  predefined: string[], // hex colors
  custom: string[5],    // user-defined colors
  active: number        // currently selected color index
}
```

### HUD Elements
```javascript
hudElements: {
  text: string,
  position: {x: number, y: number},
  size: 'S' | 'M' | 'L',
  color: string,
  curved: boolean
}[]
```

### Project Data
```javascript
project: {
  name: string,
  pixelGrid: number[][],
  palette: PaletteData,
  hudElements: HUDElement[],
  metadata: {
    created: Date,
    modified: Date,
    version: string
  }
}
```

## User Interaction Flow

1. **Canvas Interaction**
   - Click to paint single pixel
   - Drag to paint multiple pixels
   - Right-click for context menu
   - Scroll to zoom in/out

2. **Palette Management**
   - Click predefined colors to select
   - Double-click custom slots to open color picker
   - Drag colors to reorder

3. **HUD Text Placement**
   - Select letters from letter bank
   - Click canvas to place text
   - Adjust size and position with controls
   - Toggle curved visor effect

4. **Project Management**
   - Auto-save to localStorage
   - Manual save to file
   - Load from file with validation
   - Export final artwork

## Technical Implementation Notes

### Canvas Rendering
- Use HTML5 Canvas for pixel grid
- Implement efficient redraw system
- Support for pixel-perfect scaling
- Overlay system for HUD elements

### State Management
- React Context for global state
- Local state for component-specific data
- Immutable updates for undo/redo

### File Handling
- JSON format for project files
- Base64 encoding for image export
- File API for browser-based file operations

### Performance Considerations
- Debounced drawing operations
- Efficient canvas updates
- Lazy loading for large operations
- Memory management for undo/redo stack

