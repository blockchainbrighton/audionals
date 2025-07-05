# Pixel Art Helmet Designer

A comprehensive 64x64 pixel art application built with vanilla JavaScript, CSS, and HTML. Designed specifically for creating helmet designs with programmable palettes and HUD elements for curved visor display.

## 🚀 Features

### Core Canvas
- **64x64 Pixel Grid**: High-resolution pixel art canvas
- **Real-time Drawing**: Smooth brush, eraser, and fill tools
- **Zoom Functionality**: Mouse wheel zoom for detailed work
- **Touch Support**: Mobile-friendly touch interactions

### Advanced Drawing Tools
- **Brush Tool**: Variable size painting (1-10px)
- **Eraser Tool**: Clean pixel removal
- **Fill Tool**: Flood fill for large areas
- **Line Tool**: Straight line drawing
- **Rectangle Tool**: Filled and outline rectangles
- **Eyedropper Tool**: Color sampling from canvas

### Programmable Palette System
- **Preset Palettes**: Default, Helmet, and Visor color schemes
- **Custom Colors**: 5 user-defined color slots with color picker
- **Palette Export/Import**: Save and share color schemes
- **Real-time Color Management**: Instant palette switching

### HUD Elements System
- **Letter Bank**: Complete alphanumeric character set (A-Z, 0-9)
- **5x7 Pixel Font**: Crisp, readable pixel font
- **Curved Visor Effects**: Specialized rendering for helmet visors
- **Preset Text Options**: Quick access to common helmet text
- **Custom Text Input**: Type any text for HUD display
- **Positioning Controls**: Precise HUD element placement

### Project Management
- **Save/Load Projects**: Complete project state preservation
- **PNG Export**: High-quality scaled image export (8x resolution)
- **JSON Export**: Raw project data export
- **Auto-save**: Automatic localStorage backup
- **Project Metadata**: Name, description, and version tracking

### User Experience
- **Keyboard Shortcuts**: Quick tool switching and actions
- **Undo/Redo**: 50-step history management
- **Real-time Statistics**: Pixel count, colors used, tool info
- **Responsive Design**: Works on desktop and mobile devices
- **Modular Architecture**: Clean, maintainable codebase

## 🎮 Controls

### Keyboard Shortcuts
- `B` - Brush tool
- `E` - Eraser tool
- `F` - Fill tool
- `L` - Line tool
- `R` - Rectangle tool
- `I` - Eyedropper tool
- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `[` - Decrease brush size
- `]` - Increase brush size

### Mouse Controls
- **Left Click**: Paint/use current tool
- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Continuous painting (brush/eraser)

### Touch Controls
- **Tap**: Paint/use current tool
- **Pinch**: Zoom in/out
- **Touch + Drag**: Continuous painting

## 🏗️ Architecture

The application follows a modular architecture with clear separation of concerns:

### Core Modules
- **PixelCanvas**: 64x64 grid management and rendering
- **PaletteManager**: Color palette and preset management
- **HUDManager**: Text overlay and visor effects
- **ToolManager**: Drawing tools and interaction handling
- **ProjectManager**: File operations and project state
- **EventManager**: Inter-module communication

### Utility Classes
- **DOMUtils**: DOM manipulation helpers
- **ColorUtils**: Color conversion and validation
- **FileUtils**: File download and upload operations

### Styling
- **Modular CSS**: Separate files for each component
- **Responsive Design**: Mobile-first approach
- **Clean UI**: Professional, intuitive interface

## 📁 File Structure

```
vanilla-pixel-art/
├── index.html              # Main application HTML
├── css/                    # Stylesheets
│   ├── main.css           # Core layout and common styles
│   ├── canvas.css         # Canvas-specific styles
│   ├── palette.css        # Palette section styles
│   ├── hud.css           # HUD elements styles
│   └── tools.css         # Tools section styles
├── js/                    # JavaScript modules
│   ├── main.js           # Application entry point
│   ├── modules/          # Core modules
│   │   ├── EventManager.js
│   │   ├── PixelCanvas.js
│   │   ├── PaletteManager.js
│   │   ├── HUDManager.js
│   │   ├── ToolManager.js
│   │   └── ProjectManager.js
│   └── utils/            # Utility classes
│       ├── DOMUtils.js
│       ├── ColorUtils.js
│       └── FileUtils.js
├── README.md             # This documentation
├── architecture.md       # Technical architecture details
└── todo.md              # Development progress tracking
```

## 🎨 Usage Examples

### Creating a Helmet Design
1. Select the "Helmet" palette preset
2. Choose a base color (yellow/gold recommended)
3. Use the brush tool to paint the helmet shape
4. Add details with different colors
5. Use the HUD system to add visor text
6. Export as PNG or save as project file

### Adding HUD Elements
1. Scroll to the HUD Elements section
2. Select a letter color (blue recommended for contrast)
3. Click letter buttons to add individual characters
4. Use preset text buttons for common phrases
5. Type custom text in the input field
6. HUD elements automatically apply curved visor effects

### Managing Projects
1. Set project name in the Project Info section
2. Add description for documentation
3. Use "Save Project" to download .pixelart file
4. Use "Load Project" to restore saved work
5. Export PNG for sharing or printing
6. Export JSON for data analysis

## 🔧 Technical Details

### Performance Optimizations
- **Canvas Rendering**: Efficient pixel-by-pixel drawing
- **Event Debouncing**: Smooth interaction handling
- **Memory Management**: Optimized history storage
- **Lazy Loading**: On-demand module initialization

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: iOS Safari, Chrome Mobile
- **Feature Detection**: Graceful degradation for older browsers

### Data Formats
- **Project Files**: JSON with complete application state
- **PNG Export**: 8x scaled, pixel-perfect images
- **Palette Data**: Hex color codes with metadata

## 🚀 Getting Started

1. Open `index.html` in a modern web browser
2. Select a palette preset or create custom colors
3. Choose a drawing tool (brush recommended for beginners)
4. Click on the canvas to start painting
5. Add HUD elements for helmet visor text
6. Save your work using the project management tools

## 🎯 Use Cases

### Game Development
- Character helmet designs
- UI mockups for helmet HUDs
- Sprite creation for retro games

### Design Prototyping
- Helmet concept visualization
- Safety equipment design
- Industrial design mockups

### Educational Projects
- Pixel art tutorials
- Digital art education
- Programming demonstrations

### Personal Projects
- Custom helmet designs
- Avatar creation
- Digital art practice

## 🔮 Future Enhancements

The modular architecture supports easy extension with:
- Additional drawing tools (circle, polygon)
- Animation frame support
- Layer management
- Collaborative editing
- Cloud storage integration
- Advanced export formats

## 📄 License

This project is created as a demonstration of modular vanilla JavaScript architecture for pixel art applications. Feel free to use, modify, and extend for your own projects.

---

**Created with vanilla JavaScript, CSS, and HTML - No frameworks required!**

