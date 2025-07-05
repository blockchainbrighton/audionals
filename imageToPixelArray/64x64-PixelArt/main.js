// Main Application Entry Point
class PixelArtApp {
    constructor() {
        this.pixelCanvas = null;
        this.paletteManager = null;
        this.hudManager = null;
        this.toolManager = null;
        this.projectManager = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('Initializing Pixel Art Helmet App...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeModules());
        } else {
            this.initializeModules();
        }
    }

    /**
     * Initialize all modules
     */
    initializeModules() {
        try {
            // Initialize pixel canvas first
            this.initializeCanvas();
            
            // Initialize other modules (will be implemented in later phases)
            this.initializePalette();
            this.initializeHUD();
            this.initializeTools();
            this.initializeProject();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            console.log('Pixel Art Helmet App initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }

    /**
     * Initialize pixel canvas
     */
    initializeCanvas() {
        this.pixelCanvas = new PixelCanvas('pixelCanvas', {
            gridSize: 64,
            pixelSize: 8
        });
        
        console.log('Pixel canvas initialized');
    }

    /**
     * Initialize palette manager
     */
    initializePalette() {
        this.paletteManager = new PaletteManager();
        console.log('Palette manager initialized');
    }

    /**
     * Initialize HUD manager
     */
    initializeHUD() {
        this.hudManager = new HUDManager(this.pixelCanvas);
        console.log('HUD manager initialized');
    }

    /**
     * Initialize tool manager
     */
    initializeTools() {
        this.toolManager = new ToolManager(this.pixelCanvas);
        console.log('Tool manager initialized');
    }
    /**
     * Initialize project manager
     */
    initializeProject() {
        this.projectManager = new ProjectManager(
            this.pixelCanvas,
            this.paletteManager,
            this.hudManager,
            this.toolManager
        );
        console.log('Project manager initialized');
    }

    /**
     * Update tool display
     */
    updateToolDisplay(tool) {
        const toolDisplay = DOMUtils.getElementById('currentToolDisplay');
        const currentToolSpan = DOMUtils.getElementById('currentTool');
        const currentToolStat = DOMUtils.getElementById('currentToolStat');
        
        const toolInfo = {
            brush: { icon: '🖌️', name: 'Brush', description: 'Paint pixels with selected color', shortcut: 'B' },
            eraser: { icon: '🧽', name: 'Eraser', description: 'Remove pixels from canvas', shortcut: 'E' },
            fill: { icon: '🪣', name: 'Fill', description: 'Fill connected area with color', shortcut: 'F' },
            eyedropper: { icon: '💧', name: 'Eyedropper', description: 'Pick color from canvas', shortcut: 'I' },
            line: { icon: '📏', name: 'Line', description: 'Draw straight lines', shortcut: 'L' },
            rectangle: { icon: '⬜', name: 'Rectangle', description: 'Draw rectangles', shortcut: 'R' }
        };
        
        const info = toolInfo[tool] || toolInfo.brush;
        
        if (toolDisplay) {
            const iconEl = toolDisplay.querySelector('.tool-icon-large');
            const nameEl = toolDisplay.querySelector('.tool-name-large');
            const descEl = toolDisplay.querySelector('.tool-description');
            const shortcutEl = toolDisplay.querySelector('.tool-shortcut');
            
            if (iconEl) iconEl.textContent = info.icon;
            if (nameEl) nameEl.textContent = info.name;
            if (descEl) descEl.textContent = info.description;
            if (shortcutEl) shortcutEl.textContent = `Shortcut: ${info.shortcut}`;
        }
        
        if (currentToolSpan) currentToolSpan.textContent = info.name;
        if (currentToolStat) currentToolStat.textContent = tool;
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Listen to canvas events
        eventManager.on(EVENTS.UI_STATS_UPDATED, this.updateStats.bind(this));
        
        // Keyboard shortcuts
        DOMUtils.addEventListener(document, 'keydown', this.handleKeyboard.bind(this));
        
        // Prevent default drag behavior
        DOMUtils.addEventListener(document, 'dragover', (e) => e.preventDefault());
        DOMUtils.addEventListener(document, 'drop', (e) => e.preventDefault());
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Don't trigger shortcuts when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key.toLowerCase()) {
            case 'b':
                event.preventDefault();
                this.selectTool('brush');
                break;
            case 'e':
                event.preventDefault();
                this.selectTool('eraser');
                break;
            case 'f':
                event.preventDefault();
                this.selectTool('fill');
                break;
            case 'i':
                event.preventDefault();
                this.selectTool('eyedropper');
                break;
            case 'l':
                event.preventDefault();
                this.selectTool('line');
                break;
            case 'r':
                event.preventDefault();
                this.selectTool('rectangle');
                break;
        }
        
        // Brush size shortcuts (1-5)
        if (event.key >= '1' && event.key <= '5') {
            event.preventDefault();
            this.selectBrushSize(parseInt(event.key));
        }
    }

    /**
     * Select tool programmatically
     */
    selectTool(tool) {
        const toolBtn = DOMUtils.querySelectorAll(`.tool-btn[data-tool="${tool}"]`)[0];
        if (toolBtn) {
            toolBtn.click();
        }
    }

    /**
     * Select brush size programmatically
     */
    selectBrushSize(size) {
        const sizeBtn = DOMUtils.querySelectorAll(`.brush-size-btn[data-size="${size}"]`)[0];
        if (sizeBtn) {
            sizeBtn.click();
        }
    }

    /**
     * Update statistics display
     */
    updateStats(stats) {
        const pixelCountEl = DOMUtils.getElementById('pixelCount');
        const colorsUsedEl = DOMUtils.getElementById('colorsUsed');
        const pixelDataEl = DOMUtils.getElementById('pixelArrayData');
        
        if (pixelCountEl) {
            pixelCountEl.textContent = `${stats.pixelCount}/${stats.totalPixels}`;
        }
        
        if (colorsUsedEl) {
            colorsUsedEl.textContent = stats.colorsUsed;
        }
        
        if (pixelDataEl && this.pixelCanvas) {
            pixelDataEl.value = this.pixelCanvas.getPixelDataString();
        }
    }
}

// Initialize the application when the script loads
const app = new PixelArtApp();

