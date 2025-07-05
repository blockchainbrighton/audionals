// Pixel Canvas Module
class PixelCanvas {
    constructor(canvasId, options = {}) {
        this.canvas = DOMUtils.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.gridSize = options.gridSize || 64;
        this.pixelSize = options.pixelSize || 8;
        this.canvasSize = this.gridSize * this.pixelSize;
        
        // State
        this.pixelData = this.createEmptyGrid();
        this.currentColor = '#FFD700';
        this.currentTool = 'brush';
        this.brushSize = 1;
        this.isDrawing = false;
        this.lastPixel = null;
        
        // Zoom and pan
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Initialize canvas
        this.initializeCanvas();
        this.setupEventListeners();
        this.render();
        
        console.log('PixelCanvas initialized:', this.gridSize + 'x' + this.gridSize);
    }

    /**
     * Create empty pixel grid
     */
    createEmptyGrid() {
        const grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                grid[y][x] = null; // null = transparent
            }
        }
        return grid;
    }

    /**
     * Initialize canvas properties
     */
    initializeCanvas() {
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;
        
        // Set CSS size for proper scaling
        this.canvas.style.width = '512px';
        this.canvas.style.height = '512px';
        
        // Disable image smoothing for pixel art
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events
        DOMUtils.addEventListener(this.canvas, 'mousedown', this.handleMouseDown.bind(this));
        DOMUtils.addEventListener(this.canvas, 'mousemove', this.handleMouseMove.bind(this));
        DOMUtils.addEventListener(this.canvas, 'mouseup', this.handleMouseUp.bind(this));
        DOMUtils.addEventListener(this.canvas, 'mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events for mobile
        DOMUtils.addEventListener(this.canvas, 'touchstart', this.handleTouchStart.bind(this));
        DOMUtils.addEventListener(this.canvas, 'touchmove', this.handleTouchMove.bind(this));
        DOMUtils.addEventListener(this.canvas, 'touchend', this.handleTouchEnd.bind(this));
        
        // Prevent context menu
        DOMUtils.addEventListener(this.canvas, 'contextmenu', (e) => e.preventDefault());
        
        // Zoom with mouse wheel
        DOMUtils.addEventListener(this.canvas, 'wheel', this.handleWheel.bind(this));
        
        // Listen to global events
        eventManager.on(EVENTS.COLOR_SELECTED, this.setCurrentColor.bind(this));
        eventManager.on(EVENTS.TOOL_SELECTED, this.setCurrentTool.bind(this));
        eventManager.on(EVENTS.BRUSH_SIZE_CHANGED, this.setBrushSize.bind(this));
    }

    /**
     * Get pixel coordinates from mouse position
     */
    getPixelCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.floor(((clientX - rect.left) * scaleX) / this.pixelSize);
        const y = Math.floor(((clientY - rect.top) * scaleY) / this.pixelSize);
        
        return {
            x: Math.max(0, Math.min(this.gridSize - 1, x)),
            y: Math.max(0, Math.min(this.gridSize - 1, y))
        };
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(event) {
        event.preventDefault();
        this.isDrawing = true;
        
        const coords = this.getPixelCoordinates(event.clientX, event.clientY);
        this.performToolAction(coords.x, coords.y, event);
        this.lastPixel = coords;
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(event) {
        event.preventDefault();
        
        if (!this.isDrawing) return;
        
        const coords = this.getPixelCoordinates(event.clientX, event.clientY);
        
        // Draw line between last pixel and current pixel for smooth drawing
        if (this.lastPixel && (this.currentTool === 'brush' || this.currentTool === 'eraser')) {
            this.drawLine(this.lastPixel.x, this.lastPixel.y, coords.x, coords.y);
        } else {
            this.performToolAction(coords.x, coords.y, event);
        }
        
        this.lastPixel = coords;
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        event.preventDefault();
        this.isDrawing = false;
        this.lastPixel = null;
        
        // Emit canvas change event
        eventManager.emit(EVENTS.CANVAS_CLEARED);
        this.updateStats();
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave(event) {
        this.isDrawing = false;
        this.lastPixel = null;
    }

    /**
     * Handle touch events
     */
    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.handleMouseDown({ 
                clientX: touch.clientX, 
                clientY: touch.clientY,
                preventDefault: () => {}
            });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.handleMouseMove({ 
                clientX: touch.clientX, 
                clientY: touch.clientY,
                preventDefault: () => {}
            });
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handleMouseUp({ preventDefault: () => {} });
    }

    /**
     * Handle mouse wheel for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.5, Math.min(4, this.zoom + delta));
        
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.updateCanvasTransform();
            eventManager.emit(EVENTS.CANVAS_ZOOM_CHANGED, this.zoom);
        }
    }

    /**
     * Update canvas transform for zoom/pan
     */
    updateCanvasTransform() {
        const container = this.canvas.parentElement;
        this.canvas.style.transform = `scale(${this.zoom}) translate(${this.panX}px, ${this.panY}px)`;
        
        // Update zoom indicator
        const zoomLevel = DOMUtils.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    /**
     * Perform tool action at coordinates
     */
    performToolAction(x, y, event) {
        switch (this.currentTool) {
            case 'brush':
                this.paintPixel(x, y, this.currentColor);
                break;
            case 'eraser':
                this.erasePixel(x, y);
                break;
            case 'fill':
                this.floodFill(x, y, this.currentColor);
                break;
            case 'eyedropper':
                this.pickColor(x, y);
                break;
            case 'line':
                // Line tool would need start/end coordinates
                break;
            case 'rectangle':
                // Rectangle tool would need start/end coordinates
                break;
        }
    }

    /**
     * Paint pixel with brush
     */
    paintPixel(x, y, color) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
        
        // Apply brush size
        const halfSize = Math.floor(this.brushSize / 2);
        
        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const px = x + dx;
                const py = y + dy;
                
                if (px >= 0 && px < this.gridSize && py >= 0 && py < this.gridSize) {
                    // Check if pixel is within brush radius for circular brush
                    if (this.brushSize > 1) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > halfSize + 0.5) continue;
                    }
                    
                    this.pixelData[py][px] = color;
                    this.renderPixel(px, py);
                }
            }
        }
        
        eventManager.emit(EVENTS.PIXEL_PAINTED, { x, y, color, brushSize: this.brushSize });
    }

    /**
     * Erase pixel
     */
    erasePixel(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
        
        // Apply brush size
        const halfSize = Math.floor(this.brushSize / 2);
        
        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const px = x + dx;
                const py = y + dy;
                
                if (px >= 0 && px < this.gridSize && py >= 0 && py < this.gridSize) {
                    // Check if pixel is within brush radius
                    if (this.brushSize > 1) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > halfSize + 0.5) continue;
                    }
                    
                    this.pixelData[py][px] = null;
                    this.renderPixel(px, py);
                }
            }
        }
        
        eventManager.emit(EVENTS.PIXEL_ERASED, { x, y, brushSize: this.brushSize });
    }

    /**
     * Flood fill algorithm
     */
    floodFill(startX, startY, newColor) {
        if (startX < 0 || startX >= this.gridSize || startY < 0 || startY >= this.gridSize) return;
        
        const originalColor = this.pixelData[startY][startX];
        if (originalColor === newColor) return;
        
        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
            if (this.pixelData[y][x] !== originalColor) continue;
            
            visited.add(key);
            this.pixelData[y][x] = newColor;
            this.renderPixel(x, y);
            
            // Add adjacent pixels to stack
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        eventManager.emit(EVENTS.PIXEL_PAINTED, { x: startX, y: startY, color: newColor, tool: 'fill' });
    }

    /**
     * Pick color from pixel (eyedropper)
     */
    pickColor(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;
        
        const color = this.pixelData[y][x];
        if (color) {
            this.currentColor = color;
            eventManager.emit(EVENTS.COLOR_SELECTED, color);
        }
    }

    /**
     * Draw line between two points
     */
    drawLine(x0, y0, x1, y1) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        let x = x0;
        let y = y0;
        
        while (true) {
            if (this.currentTool === 'brush') {
                this.paintPixel(x, y, this.currentColor);
            } else if (this.currentTool === 'eraser') {
                this.erasePixel(x, y);
            }
            
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
     * Render single pixel
     */
    renderPixel(x, y) {
        const color = this.pixelData[y][x];
        
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        } else {
            // Clear pixel (transparent)
            this.ctx.clearRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
    }

    /**
     * Render entire canvas
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render all pixels
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.pixelData[y][x]) {
                    this.renderPixel(x, y);
                }
            }
        }
    }

    /**
     * Clear entire canvas
     */
    clear() {
        this.pixelData = this.createEmptyGrid();
        this.render();
        eventManager.emit(EVENTS.CANVAS_CLEARED);
        this.updateStats();
    }

    /**
     * Set current color
     */
    setCurrentColor(color) {
        this.currentColor = color;
    }

    /**
     * Set current tool
     */
    setCurrentTool(tool) {
        this.currentTool = tool;
        
        // Update canvas cursor based on tool
        const cursors = {
            brush: 'crosshair',
            eraser: 'crosshair',
            fill: 'crosshair',
            eyedropper: 'crosshair',
            line: 'crosshair',
            rectangle: 'crosshair'
        };
        
        this.canvas.style.cursor = cursors[tool] || 'default';
    }

    /**
     * Set brush size
     */
    setBrushSize(size) {
        this.brushSize = Math.max(1, Math.min(5, size));
    }

    /**
     * Get pixel data as array
     */
    getPixelDataArray() {
        const data = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                data.push(this.pixelData[y][x] || '000000');
            }
        }
        return data;
    }

    /**
     * Set pixel data from array
     */
    setPixelDataArray(data) {
        if (data.length !== this.gridSize * this.gridSize) {
            console.error('Invalid pixel data array length');
            return;
        }
        
        let index = 0;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.pixelData[y][x] = data[index] === '000000' ? null : data[index];
                index++;
            }
        }
        
        this.render();
        this.updateStats();
    }

    /**
     * Get pixel data as comma-separated string
     */
    getPixelDataString() {
        return this.getPixelDataArray().join(',');
    }

    /**
     * Update statistics
     */
    updateStats() {
        let pixelCount = 0;
        const colorsUsed = new Set();
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.pixelData[y][x]) {
                    pixelCount++;
                    colorsUsed.add(this.pixelData[y][x]);
                }
            }
        }
        
        eventManager.emit(EVENTS.UI_STATS_UPDATED, {
            pixelCount,
            totalPixels: this.gridSize * this.gridSize,
            colorsUsed: colorsUsed.size
        });
    }

    /**
     * Export canvas as image data URL
     */
    exportAsDataURL() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Get canvas element
     */
    getCanvas() {
        return this.canvas;
    }
}

