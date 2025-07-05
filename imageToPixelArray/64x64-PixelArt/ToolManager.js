// Tool Manager Module
class ToolManager {
    constructor(pixelCanvas) {
        this.pixelCanvas = pixelCanvas;
        this.currentTool = 'brush';
        this.brushSize = 1;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.isDrawing = false;
        this.lastPosition = null;
        
        // Tool settings
        this.toolSettings = {
            brush: { size: 1, opacity: 1.0 },
            eraser: { size: 1 },
            fill: {},
            line: { size: 1 },
            rectangle: { size: 1, filled: false },
            eyedropper: {}
        };
        
        // DOM elements
        this.toolButtons = DOMUtils.querySelectorAll('.tool-btn[data-tool]');
        this.brushSizeSlider = DOMUtils.getElementById('brushSizeSlider');
        this.brushSizeDisplay = DOMUtils.getElementById('brushSizeDisplay');
        this.undoBtn = DOMUtils.getElementById('undoBtn');
        this.redoBtn = DOMUtils.getElementById('redoBtn');
        this.expandToolsBtn = DOMUtils.getElementById('expandToolsBtn');
        this.advancedToolsContainer = DOMUtils.getElementById('advancedToolsContainer');
        
        this.init();
    }

    /**
     * Initialize tool manager
     */
    init() {
        this.setupToolButtons();
        this.setupBrushControls();
        this.setupUndoRedo();
        this.setupKeyboardShortcuts();
        this.setupAdvancedTools();
        this.saveState(); // Save initial state
        
        console.log('ToolManager initialized');
    }

    /**
     * Setup tool buttons
     */
    setupToolButtons() {
        this.toolButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);
                this.updateToolButtonStates(btn);
            });
        });
    }

    /**
     * Setup brush controls
     */
    setupBrushControls() {
        if (this.brushSizeSlider) {
            this.brushSizeSlider.value = this.brushSize;
            
            DOMUtils.addEventListener(this.brushSizeSlider, 'input', () => {
                this.setBrushSize(parseInt(this.brushSizeSlider.value));
            });
        }
        
        this.updateBrushSizeDisplay();
    }

    /**
     * Setup undo/redo functionality
     */
    setupUndoRedo() {
        if (this.undoBtn) {
            DOMUtils.addEventListener(this.undoBtn, 'click', () => {
                this.undo();
            });
        }
        
        if (this.redoBtn) {
            DOMUtils.addEventListener(this.redoBtn, 'click', () => {
                this.redo();
            });
        }
        
        this.updateUndoRedoButtons();
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        DOMUtils.addEventListener(document, 'keydown', (e) => {
            // Prevent shortcuts when typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.setTool('brush');
                    break;
                case 'e':
                    e.preventDefault();
                    this.setTool('eraser');
                    break;
                case 'f':
                    e.preventDefault();
                    this.setTool('fill');
                    break;
                case 'l':
                    e.preventDefault();
                    this.setTool('line');
                    break;
                case 'r':
                    e.preventDefault();
                    this.setTool('rectangle');
                    break;
                case 'i':
                    e.preventDefault();
                    this.setTool('eyedropper');
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                    }
                    break;
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
                case '[':
                    e.preventDefault();
                    this.decreaseBrushSize();
                    break;
                case ']':
                    e.preventDefault();
                    this.increaseBrushSize();
                    break;
            }
        });
    }

    /**
     * Setup advanced tools
     */
    setupAdvancedTools() {
        if (this.expandToolsBtn) {
            DOMUtils.addEventListener(this.expandToolsBtn, 'click', () => {
                this.toggleAdvancedTools();
            });
        }
        
        // Setup advanced tool buttons
        const advancedToolButtons = DOMUtils.querySelectorAll('.advanced-tool-btn[data-tool]');
        advancedToolButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', () => {
                const tool = btn.dataset.tool;
                this.setTool(tool);
                this.updateToolButtonStates(btn);
            });
        });
    }

    /**
     * Set current tool
     */
    setTool(tool) {
        this.currentTool = tool;
        
        // Update canvas cursor
        this.updateCanvasCursor();
        
        // Update tool display
        this.updateCurrentToolDisplay();
        
        // Update tool button states
        this.updateAllToolButtonStates();
        
        // Emit tool change event
        eventManager.emit(EVENTS.TOOL_CHANGED, { tool });
        
        console.log(`Tool changed to: ${tool}`);
    }

    /**
     * Update canvas cursor based on current tool
     */
    updateCanvasCursor() {
        const canvas = this.pixelCanvas.canvas;
        if (!canvas) return;
        
        const cursors = {
            brush: 'crosshair',
            eraser: 'crosshair',
            fill: 'crosshair',
            line: 'crosshair',
            rectangle: 'crosshair',
            eyedropper: 'crosshair'
        };
        
        canvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    /**
     * Update current tool display
     */
    updateCurrentToolDisplay() {
        const toolDisplay = DOMUtils.getElementById('currentTool');
        if (toolDisplay) {
            const toolNames = {
                brush: 'Brush',
                eraser: 'Eraser',
                fill: 'Fill',
                line: 'Line',
                rectangle: 'Rectangle',
                eyedropper: 'Eyedropper'
            };
            
            toolDisplay.textContent = toolNames[this.currentTool] || this.currentTool;
        }
    }

    /**
     * Update tool button states
     */
    updateToolButtonStates(activeBtn) {
        // Remove active class from all tool buttons
        const allToolButtons = DOMUtils.querySelectorAll('.tool-btn, .advanced-tool-btn');
        allToolButtons.forEach(btn => {
            DOMUtils.removeClass(btn, 'active');
        });
        
        // Add active class to current button
        if (activeBtn) {
            DOMUtils.addClass(activeBtn, 'active');
        }
    }

    /**
     * Update all tool button states based on current tool
     */
    updateAllToolButtonStates() {
        const allToolButtons = DOMUtils.querySelectorAll('.tool-btn[data-tool], .advanced-tool-btn[data-tool]');
        allToolButtons.forEach(btn => {
            if (btn.dataset.tool === this.currentTool) {
                DOMUtils.addClass(btn, 'active');
            } else {
                DOMUtils.removeClass(btn, 'active');
            }
        });
    }

    /**
     * Set brush size
     */
    setBrushSize(size) {
        this.brushSize = Math.max(1, Math.min(10, size));
        this.toolSettings.brush.size = this.brushSize;
        this.toolSettings.eraser.size = this.brushSize;
        this.toolSettings.line.size = this.brushSize;
        this.toolSettings.rectangle.size = this.brushSize;
        
        this.updateBrushSizeDisplay();
        
        if (this.brushSizeSlider) {
            this.brushSizeSlider.value = this.brushSize;
        }
        
        eventManager.emit(EVENTS.BRUSH_SIZE_CHANGED, { size: this.brushSize });
    }

    /**
     * Update brush size display
     */
    updateBrushSizeDisplay() {
        if (this.brushSizeDisplay) {
            this.brushSizeDisplay.textContent = `${this.brushSize}px`;
        }
        
        // Update brush size in statistics
        const brushSizeEl = DOMUtils.querySelectorAll('.project-stats .stat-value')[3];
        if (brushSizeEl) {
            brushSizeEl.textContent = `${this.brushSize}px`;
        }
    }

    /**
     * Increase brush size
     */
    increaseBrushSize() {
        this.setBrushSize(this.brushSize + 1);
    }

    /**
     * Decrease brush size
     */
    decreaseBrushSize() {
        this.setBrushSize(this.brushSize - 1);
    }

    /**
     * Toggle advanced tools visibility
     */
    toggleAdvancedTools() {
        if (this.advancedToolsContainer) {
            const isVisible = DOMUtils.hasClass(this.advancedToolsContainer, 'expanded');
            
            if (isVisible) {
                DOMUtils.removeClass(this.advancedToolsContainer, 'expanded');
                this.expandToolsBtn.innerHTML = '<span class="expand-icon">▶</span> Advanced Tools';
            } else {
                DOMUtils.addClass(this.advancedToolsContainer, 'expanded');
                this.expandToolsBtn.innerHTML = '<span class="expand-icon">▼</span> Advanced Tools';
            }
        }
    }

    /**
     * Save current state to history
     */
    saveState() {
        const currentState = this.pixelCanvas.getPixelData();
        
        // Remove any states after current index (for redo functionality)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        this.history.push(JSON.parse(JSON.stringify(currentState)));
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateUndoRedoButtons();
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.pixelCanvas.setPixelData(state);
            this.updateUndoRedoButtons();
            
            eventManager.emit(EVENTS.UNDO_PERFORMED, { historyIndex: this.historyIndex });
            console.log('Undo performed');
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.pixelCanvas.setPixelData(state);
            this.updateUndoRedoButtons();
            
            eventManager.emit(EVENTS.REDO_PERFORMED, { historyIndex: this.historyIndex });
            console.log('Redo performed');
        }
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        if (this.undoBtn) {
            if (this.historyIndex > 0) {
                DOMUtils.removeClass(this.undoBtn, 'disabled');
                this.undoBtn.disabled = false;
            } else {
                DOMUtils.addClass(this.undoBtn, 'disabled');
                this.undoBtn.disabled = true;
            }
        }
        
        if (this.redoBtn) {
            if (this.historyIndex < this.history.length - 1) {
                DOMUtils.removeClass(this.redoBtn, 'disabled');
                this.redoBtn.disabled = false;
            } else {
                DOMUtils.addClass(this.redoBtn, 'disabled');
                this.redoBtn.disabled = true;
            }
        }
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.saveState(); // Save current state as first state
        console.log('History cleared');
    }

    /**
     * Handle tool action on canvas
     */
    handleToolAction(x, y, isMouseDown, event) {
        switch (this.currentTool) {
            case 'brush':
                return this.handleBrush(x, y, isMouseDown);
            case 'eraser':
                return this.handleEraser(x, y, isMouseDown);
            case 'fill':
                return this.handleFill(x, y, isMouseDown);
            case 'line':
                return this.handleLine(x, y, isMouseDown, event);
            case 'rectangle':
                return this.handleRectangle(x, y, isMouseDown, event);
            case 'eyedropper':
                return this.handleEyedropper(x, y, isMouseDown);
            default:
                return false;
        }
    }

    /**
     * Handle brush tool
     */
    handleBrush(x, y, isMouseDown) {
        if (!isMouseDown) return false;
        
        const currentColor = this.pixelCanvas.currentColor;
        if (currentColor === 'transparent') return false;
        
        // Paint with brush size
        this.paintWithBrush(x, y, currentColor);
        return true;
    }

    /**
     * Handle eraser tool
     */
    handleEraser(x, y, isMouseDown) {
        if (!isMouseDown) return false;
        
        // Erase with brush size
        this.paintWithBrush(x, y, 'transparent');
        return true;
    }

    /**
     * Handle fill tool
     */
    handleFill(x, y, isMouseDown) {
        if (!isMouseDown) return false;
        
        const currentColor = this.pixelCanvas.currentColor;
        if (currentColor === 'transparent') return false;
        
        this.floodFill(x, y, currentColor);
        return true;
    }

    /**
     * Handle line tool
     */
    handleLine(x, y, isMouseDown, event) {
        if (isMouseDown && !this.isDrawing) {
            // Start line
            this.isDrawing = true;
            this.lastPosition = { x, y };
            return false;
        } else if (!isMouseDown && this.isDrawing) {
            // End line
            this.isDrawing = false;
            this.drawLine(this.lastPosition.x, this.lastPosition.y, x, y);
            this.lastPosition = null;
            return true;
        }
        return false;
    }

    /**
     * Handle rectangle tool
     */
    handleRectangle(x, y, isMouseDown, event) {
        if (isMouseDown && !this.isDrawing) {
            // Start rectangle
            this.isDrawing = true;
            this.lastPosition = { x, y };
            return false;
        } else if (!isMouseDown && this.isDrawing) {
            // End rectangle
            this.isDrawing = false;
            this.drawRectangle(this.lastPosition.x, this.lastPosition.y, x, y);
            this.lastPosition = null;
            return true;
        }
        return false;
    }

    /**
     * Handle eyedropper tool
     */
    handleEyedropper(x, y, isMouseDown) {
        if (!isMouseDown) return false;
        
        const color = this.pixelCanvas.getPixelColor(x, y);
        if (color) {
            this.pixelCanvas.setCurrentColor(color);
            eventManager.emit(EVENTS.COLOR_PICKED, { color, x, y });
            console.log(`Color picked: ${color}`);
        }
        return false;
    }

    /**
     * Paint with brush size
     */
    paintWithBrush(centerX, centerY, color) {
        const size = this.brushSize;
        const radius = Math.floor(size / 2);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                // Check if within brush radius (circular brush)
                if (dx * dx + dy * dy <= radius * radius) {
                    if (this.pixelCanvas.isValidPosition(x, y)) {
                        this.pixelCanvas.paintPixel(x, y, color);
                    }
                }
            }
        }
    }

    /**
     * Flood fill algorithm
     */
    floodFill(startX, startY, newColor) {
        const originalColor = this.pixelCanvas.getPixelColor(startX, startY);
        
        if (originalColor === newColor) return;
        
        const stack = [{ x: startX, y: startY }];
        const visited = new Set();
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (!this.pixelCanvas.isValidPosition(x, y)) continue;
            if (this.pixelCanvas.getPixelColor(x, y) !== originalColor) continue;
            
            visited.add(key);
            this.pixelCanvas.paintPixel(x, y, newColor);
            
            // Add adjacent pixels
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
    }

    /**
     * Draw line using Bresenham's algorithm
     */
    drawLine(x0, y0, x1, y1) {
        const currentColor = this.pixelCanvas.currentColor;
        if (currentColor === 'transparent') return;
        
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        let x = x0;
        let y = y0;
        
        while (true) {
            this.paintWithBrush(x, y, currentColor);
            
            if (x === x1 && y === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    /**
     * Draw rectangle
     */
    drawRectangle(x0, y0, x1, y1) {
        const currentColor = this.pixelCanvas.currentColor;
        if (currentColor === 'transparent') return;
        
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        
        if (this.toolSettings.rectangle.filled) {
            // Filled rectangle
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    this.paintWithBrush(x, y, currentColor);
                }
            }
        } else {
            // Rectangle outline
            for (let x = minX; x <= maxX; x++) {
                this.paintWithBrush(x, minY, currentColor); // Top edge
                this.paintWithBrush(x, maxY, currentColor); // Bottom edge
            }
            for (let y = minY; y <= maxY; y++) {
                this.paintWithBrush(minX, y, currentColor); // Left edge
                this.paintWithBrush(maxX, y, currentColor); // Right edge
            }
        }
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }

    /**
     * Get brush size
     */
    getBrushSize() {
        return this.brushSize;
    }

    /**
     * Get tool settings
     */
    getToolSettings() {
        return { ...this.toolSettings };
    }

    /**
     * Set tool settings
     */
    setToolSettings(settings) {
        this.toolSettings = { ...this.toolSettings, ...settings };
    }

    /**
     * Export tool configuration
     */
    exportToolConfig() {
        const config = {
            currentTool: this.currentTool,
            brushSize: this.brushSize,
            toolSettings: this.toolSettings,
            timestamp: new Date().toISOString()
        };
        
        return config;
    }

    /**
     * Import tool configuration
     */
    importToolConfig(config) {
        if (config.currentTool) {
            this.setTool(config.currentTool);
        }
        
        if (config.brushSize) {
            this.setBrushSize(config.brushSize);
        }
        
        if (config.toolSettings) {
            this.setToolSettings(config.toolSettings);
        }
        
        console.log('Tool configuration imported');
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.setTool('brush');
        this.setBrushSize(1);
        this.toolSettings = {
            brush: { size: 1, opacity: 1.0 },
            eraser: { size: 1 },
            fill: {},
            line: { size: 1 },
            rectangle: { size: 1, filled: false },
            eyedropper: {}
        };
        
        console.log('Tool settings reset to defaults');
    }
}

