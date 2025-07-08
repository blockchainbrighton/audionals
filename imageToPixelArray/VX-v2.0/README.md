# 🪖 Helmet Pixel Art Studio - Enhanced

A professional, feature-rich pixel art editor specifically designed for creating and editing helmet designs with advanced visor support and layer management.

## ✨ Key Features

### 🎯 **Helmet-Focused Design**
- **Dedicated Visor Layer**: Independent visor editing with adjustable size, shape, and position
- **Layer Management**: Separate layers for helmet, visor, and overlay elements
- **Professional UI**: Modern, intuitive interface optimized for helmet design workflow

### 🎨 **Advanced Editing Tools**
- **Live Data Sync**: All edits instantly update saved/exported files - no desyncs
- **Reliable Core Editing**: Smooth drawing, erasing, and fill tools with robust undo/redo
- **Enhanced Mouse/Touch**: Responsive event handling for desktop and mobile
- **Latch Mode**: Toggle for continuous drawing without holding mouse button

### 🥽 **Visor Support**
- **Adjustable Position**: X/Y coordinates with real-time preview
- **Flexible Sizing**: Width and height controls with visual feedback
- **Shape Options**: Rectangular, curved, and custom visor shapes
- **Curvature Control**: Fine-tune curved visor appearance
- **Visual Outline**: Toggle-able green outline for precise positioning

### 🎛️ **Layer Management**
- **Three-Layer System**: Helmet, Visor, and Overlay layers
- **Layer Switching**: Quick toolbar buttons (H, V, O) and keyboard shortcuts (1, 2, 3)
- **Visibility Controls**: Toggle layer visibility with eye icon
- **Lock Protection**: Lock layers to prevent accidental edits
- **Active Layer Indication**: Clear visual feedback for current layer

### 💾 **Reliable Save/Load/Export**
- **Enhanced Project Format**: `.hproj` files preserve all helmet and visor state
- **Legacy Compatibility**: Load original `.pxproj` and `.json` project files
- **PNG Export**: High-quality raster export with proper transparency
- **SVG Export**: Vector format for scalable graphics
- **Array Data**: Copy pixel array data for programmatic use

### 🎨 **Modern UI/UX**
- **Professional Layout**: Three-panel design with dedicated control areas
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Styling**: Clean, professional appearance with smooth animations
- **Intuitive Controls**: Clearly labeled tools and visual feedback
- **Keyboard Shortcuts**: Efficient workflow with hotkeys

## 🚀 Quick Start

### Basic Usage
1. **Open** `index-complete.html` in your web browser
2. **Select Colors** from the palette in the center area
3. **Choose Layer** using H (Helmet), V (Visor), or O (Overlay) buttons
4. **Draw** by clicking and dragging on the grid
5. **Adjust Visor** using the controls in the left panel
6. **Export** your work using the buttons in the array data section

### Layer Workflow
1. **Helmet Layer (H)**: Design the main helmet structure
2. **Visor Layer (V)**: Add visor elements within the defined visor area
3. **Overlay Layer (O)**: Add text, effects, or additional details

### Visor Controls
- **Position**: Adjust X/Y coordinates to move the visor area
- **Size**: Modify width/height to resize the visor area
- **Shape**: Choose between rectangular, curved, or custom shapes
- **Outline**: Toggle the green outline for visual guidance

## 🎮 Controls & Shortcuts

### Mouse/Touch
- **Click & Drag**: Draw pixels
- **Single Click**: Place single pixel
- **Right Click**: Context menu (disabled for clean workflow)

### Keyboard Shortcuts
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo
- **Ctrl+S**: Save project
- **1, 2, 3**: Switch to Helmet, Visor, Overlay layers
- **Space**: Toggle latch mode (planned)

### Toolbar Controls
- **📁 Load Image**: Import reference images
- **💾 Save Project**: Save as enhanced .hproj file
- **📂 Load Project**: Load existing project files
- **↶ Undo / ↷ Redo**: History navigation
- **🗑️ Clear All**: Reset canvas (with confirmation)
- **🔒 Latch**: Toggle continuous drawing mode

## 📁 File Formats

### Project Files
- **`.hproj`**: Enhanced project format with full state preservation
- **`.pxproj`**: Legacy project format (read-only)
- **`.json`**: Generic JSON project format (read-only)

### Export Formats
- **PNG**: Raster image with transparency support
- **SVG**: Vector graphics for infinite scalability
- **Array Data**: Raw pixel data for programmatic use

## 🔧 Technical Features

### Enhanced State Management
- **Unified State System**: Consistent data flow between UI and core
- **Layer Architecture**: Proper separation of helmet, visor, and overlay data
- **Real-time Sync**: Immediate updates across all components

### Performance Optimizations
- **Efficient Rendering**: Optimized grid drawing and updates
- **Memory Management**: Proper cleanup and resource handling
- **Responsive Events**: Smooth interaction on all devices

### Extensibility
- **Modular Code**: Clean separation of concerns for easy enhancement
- **Plugin-Ready**: Architecture supports future tool additions
- **API-Friendly**: Exposed functions for programmatic control

## 🎯 Use Cases

### Game Development
- **Character Design**: Create detailed helmet sprites for games
- **Asset Creation**: Generate helmet variations for different characters
- **Prototype Testing**: Quick iteration on helmet designs

### Digital Art
- **Pixel Art Projects**: Professional helmet illustrations
- **Animation Frames**: Create helmet animation sequences
- **Concept Art**: Rapid helmet design exploration

### Educational
- **Design Learning**: Understand helmet structure and proportions
- **Pixel Art Tutorials**: Teaching tool for pixel art techniques
- **Creative Projects**: Student assignments and portfolios

## 🛠️ Browser Compatibility

### Recommended Browsers
- **Chrome 90+**: Full feature support
- **Firefox 88+**: Full feature support
- **Safari 14+**: Full feature support
- **Edge 90+**: Full feature support

### Mobile Support
- **iOS Safari**: Touch-optimized interface
- **Android Chrome**: Responsive design
- **Mobile Firefox**: Full functionality

## 📋 Version History

### v2.0 - Enhanced Edition
- ✅ **Visor Support**: Dedicated visor layer with shape controls
- ✅ **Layer Management**: Three-layer system with visibility/lock controls
- ✅ **Modern UI**: Professional three-panel layout
- ✅ **Enhanced Export**: Improved PNG/SVG export with state sync
- ✅ **Reliable Save/Load**: Enhanced project format with full state preservation
- ✅ **Responsive Design**: Mobile-friendly interface
- ✅ **Keyboard Shortcuts**: Efficient workflow controls

### v1.22 - Original
- ✅ Basic pixel art editing
- ✅ Color palette management
- ✅ Text insertion tools
- ✅ Array data export
- ✅ Project save/load

## 🤝 Contributing

The codebase is designed for extensibility:

### Adding New Tools
1. Create tool module in separate file
2. Register with core event system
3. Add UI controls to appropriate panel
4. Update state management as needed

### Enhancing Layers
1. Extend `enhancedState.layers` structure
2. Add layer-specific rendering logic
3. Update UI controls and indicators
4. Ensure save/load compatibility

### Custom Export Formats
1. Implement export function using `core.getVisibleGrid()`
2. Add UI button and event handler
3. Follow existing naming conventions
4. Test with various helmet designs

## 📞 Support

For technical issues or feature requests:
1. Check browser console for error messages
2. Verify browser compatibility
3. Test with different helmet designs
4. Document steps to reproduce issues

## 🎉 Conclusion

The Enhanced Helmet Pixel Art Studio provides a professional, reliable, and extensible platform for creating detailed helmet pixel art. With its dedicated visor support, advanced layer management, and modern UI, it delivers exactly what you see is what you save - every time.

**Happy helmet designing! 🪖✨**

