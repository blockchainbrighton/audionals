// Palette Manager Module
class PaletteManager {
    constructor() {
        this.currentPalette = 'default';
        this.selectedColor = '#FFD700';
        this.customColors = ['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF1493'];
        this.palettes = ColorUtils.getPalettes();
        
        // DOM elements
        this.colorGrid = DOMUtils.getElementById('colorGrid');
        this.presetButtons = DOMUtils.querySelectorAll('.preset-btn[data-preset]');
        this.userColorSlots = DOMUtils.querySelectorAll('.user-color-slot');
        
        this.init();
    }

    /**
     * Initialize palette manager
     */
    init() {
        this.setupPresetButtons();
        this.setupColorGrid();
        this.setupUserColorSlots();
        this.setupPaletteManagement();
        this.loadPalette(this.currentPalette);
        
        console.log('PaletteManager initialized');
    }

    /**
     * Setup palette preset buttons
     */
    setupPresetButtons() {
        this.presetButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', () => {
                const preset = btn.dataset.preset;
                this.loadPalette(preset);
                this.updatePresetButtonStates(preset);
            });
        });
    }

    /**
     * Setup color grid
     */
    setupColorGrid() {
        if (!this.colorGrid) return;
        
        // Clear existing content
        DOMUtils.clearContent(this.colorGrid);
        
        // Add transparent color swatch
        const transparentSwatch = this.createColorSwatch(null, 'Transparent');
        this.colorGrid.appendChild(transparentSwatch);
    }

    /**
     * Setup user color slots
     */
    setupUserColorSlots() {
        this.userColorSlots.forEach((slot, index) => {
            const colorPreview = slot.querySelector('.color-preview');
            const colorInput = slot.querySelector('.color-input');
            const useButton = slot.querySelector('.use-color-btn');
            
            if (colorPreview && colorInput && useButton) {
                // Set initial color
                const initialColor = this.customColors[index] || '#FFFFFF';
                colorPreview.style.backgroundColor = initialColor;
                colorInput.value = initialColor;
                
                // Color input change handler
                DOMUtils.addEventListener(colorInput, 'change', () => {
                    const newColor = ColorUtils.normalizeHex(colorInput.value);
                    this.updateCustomColor(index, newColor);
                });
                
                // Color preview click handler (opens color picker)
                DOMUtils.addEventListener(colorPreview, 'click', () => {
                    colorInput.click();
                });
                
                // Use button handler
                DOMUtils.addEventListener(useButton, 'click', () => {
                    const color = colorInput.value;
                    this.selectColor(color);
                });
            }
        });
    }

    /**
     * Setup palette management buttons
     */
    setupPaletteManagement() {
        const exportBtn = DOMUtils.getElementById('exportPaletteBtn') || 
                         DOMUtils.querySelectorAll('button')[16]; // Export Palette button
        const resetBtn = DOMUtils.getElementById('resetPaletteBtn') || 
                        DOMUtils.querySelectorAll('button')[17]; // Reset button
        
        if (exportBtn) {
            DOMUtils.addEventListener(exportBtn, 'click', () => {
                this.exportPalette();
            });
        }
        
        if (resetBtn) {
            DOMUtils.addEventListener(resetBtn, 'click', () => {
                if (confirm('Reset palette to default colors?')) {
                    this.resetCustomColors();
                }
            });
        }
    }

    /**
     * Create color swatch element
     */
    createColorSwatch(color, title = '') {
        const swatch = DOMUtils.createElement('div', {
            className: color ? 'color-swatch' : 'color-swatch transparent',
            'data-color': color || 'transparent',
            title: title || color || 'Transparent',
            'aria-label': title || color || 'Transparent'
        });
        
        if (color) {
            swatch.style.backgroundColor = color;
        }
        
        // Click handler
        DOMUtils.addEventListener(swatch, 'click', () => {
            this.selectColor(color);
        });
        
        return swatch;
    }

    /**
     * Load palette by name
     */
    loadPalette(paletteName) {
        if (!this.palettes[paletteName]) {
            console.warn(`Palette '${paletteName}' not found`);
            return;
        }
        
        this.currentPalette = paletteName;
        const colors = this.palettes[paletteName];
        
        // Clear existing color swatches (except transparent)
        const existingSwatches = this.colorGrid.querySelectorAll('.color-swatch:not(.transparent)');
        existingSwatches.forEach(swatch => swatch.remove());
        
        // Add new color swatches
        colors.forEach(color => {
            const swatch = this.createColorSwatch(color);
            this.colorGrid.appendChild(swatch);
        });
        
        // Select first color if none selected
        if (!this.selectedColor || this.selectedColor === 'transparent') {
            this.selectColor(colors[0]);
        }
        
        eventManager.emit(EVENTS.PALETTE_CHANGED, { palette: paletteName, colors });
    }

    /**
     * Select color
     */
    selectColor(color) {
        this.selectedColor = color;
        
        // Update visual selection
        this.updateColorSelection(color);
        
        // Emit color selection event
        eventManager.emit(EVENTS.COLOR_SELECTED, color);
        
        console.log('Color selected:', color);
    }

    /**
     * Update color selection visual state
     */
    updateColorSelection(color) {
        // Remove previous selection
        DOMUtils.querySelectorAll('.color-swatch.selected').forEach(swatch => {
            DOMUtils.removeClass(swatch, 'selected');
        });
        
        // Select new color
        const targetSwatch = DOMUtils.querySelectorAll(`.color-swatch[data-color="${color}"]`)[0];
        if (targetSwatch) {
            DOMUtils.addClass(targetSwatch, 'selected');
            DOMUtils.animate(targetSwatch, 'changing');
        }
    }

    /**
     * Update preset button states
     */
    updatePresetButtonStates(activePreset) {
        this.presetButtons.forEach(btn => {
            if (btn.dataset.preset === activePreset) {
                DOMUtils.addClass(btn, 'active');
            } else {
                DOMUtils.removeClass(btn, 'active');
            }
        });
    }

    /**
     * Update custom color
     */
    updateCustomColor(index, color) {
        if (index >= 0 && index < this.customColors.length) {
            this.customColors[index] = color;
            
            // Update preview
            const slot = this.userColorSlots[index];
            if (slot) {
                const preview = slot.querySelector('.color-preview');
                if (preview) {
                    preview.style.backgroundColor = color;
                }
            }
            
            // Save to localStorage
            this.saveCustomColors();
            
            eventManager.emit(EVENTS.CUSTOM_COLOR_ADDED, { index, color });
        }
    }

    /**
     * Reset custom colors to defaults
     */
    resetCustomColors() {
        this.customColors = ['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF1493'];
        
        // Update UI
        this.userColorSlots.forEach((slot, index) => {
            const colorPreview = slot.querySelector('.color-preview');
            const colorInput = slot.querySelector('.color-input');
            
            if (colorPreview && colorInput) {
                const color = this.customColors[index];
                colorPreview.style.backgroundColor = color;
                colorInput.value = color;
            }
        });
        
        // Save to localStorage
        this.saveCustomColors();
    }

    /**
     * Export current palette
     */
    exportPalette() {
        const paletteData = {
            name: this.currentPalette,
            colors: this.palettes[this.currentPalette],
            customColors: this.customColors,
            selectedColor: this.selectedColor,
            timestamp: new Date().toISOString()
        };
        
        const filename = `palette_${this.currentPalette}_${Date.now()}.json`;
        FileUtils.downloadJSON(paletteData, filename);
        
        console.log('Palette exported:', filename);
    }

    /**
     * Import palette from file
     */
    async importPalette(file) {
        try {
            const jsonString = await FileUtils.readFileAsText(file);
            const paletteData = JSON.parse(jsonString);
            
            if (paletteData.colors && Array.isArray(paletteData.colors)) {
                // Add as custom palette
                const paletteName = paletteData.name || 'imported';
                this.palettes[paletteName] = paletteData.colors;
                
                // Update custom colors if provided
                if (paletteData.customColors) {
                    this.customColors = paletteData.customColors;
                    this.updateCustomColorUI();
                }
                
                // Load the imported palette
                this.loadPalette(paletteName);
                
                console.log('Palette imported successfully');
                return true;
            } else {
                throw new Error('Invalid palette format');
            }
        } catch (error) {
            console.error('Failed to import palette:', error);
            alert('Failed to import palette. Please check the file format.');
            return false;
        }
    }

    /**
     * Update custom color UI
     */
    updateCustomColorUI() {
        this.userColorSlots.forEach((slot, index) => {
            const colorPreview = slot.querySelector('.color-preview');
            const colorInput = slot.querySelector('.color-input');
            
            if (colorPreview && colorInput && this.customColors[index]) {
                const color = this.customColors[index];
                colorPreview.style.backgroundColor = color;
                colorInput.value = color;
            }
        });
    }

    /**
     * Save custom colors to localStorage
     */
    saveCustomColors() {
        if (FileUtils.isLocalStorageAvailable()) {
            FileUtils.saveToLocalStorage('pixelart_custom_colors', this.customColors);
        }
    }

    /**
     * Load custom colors from localStorage
     */
    loadCustomColors() {
        if (FileUtils.isLocalStorageAvailable()) {
            const saved = FileUtils.loadFromLocalStorage('pixelart_custom_colors');
            if (saved && Array.isArray(saved)) {
                this.customColors = saved;
                this.updateCustomColorUI();
            }
        }
    }

    /**
     * Get current color
     */
    getCurrentColor() {
        return this.selectedColor;
    }

    /**
     * Get current palette
     */
    getCurrentPalette() {
        return {
            name: this.currentPalette,
            colors: this.palettes[this.currentPalette],
            customColors: this.customColors
        };
    }

    /**
     * Add color to current palette
     */
    addColorToPalette(color) {
        if (!this.palettes[this.currentPalette].includes(color)) {
            this.palettes[this.currentPalette].push(color);
            
            // Add swatch to UI
            const swatch = this.createColorSwatch(color);
            this.colorGrid.appendChild(swatch);
            
            eventManager.emit(EVENTS.PALETTE_CHANGED, {
                palette: this.currentPalette,
                colors: this.palettes[this.currentPalette]
            });
        }
    }

    /**
     * Remove color from current palette
     */
    removeColorFromPalette(color) {
        const colors = this.palettes[this.currentPalette];
        const index = colors.indexOf(color);
        
        if (index !== -1) {
            colors.splice(index, 1);
            
            // Remove swatch from UI
            const swatch = DOMUtils.querySelectorAll(`.color-swatch[data-color="${color}"]`)[0];
            if (swatch) {
                swatch.remove();
            }
            
            eventManager.emit(EVENTS.PALETTE_CHANGED, {
                palette: this.currentPalette,
                colors: this.palettes[this.currentPalette]
            });
        }
    }

    /**
     * Generate palette from image
     */
    async generatePaletteFromImage(imageFile) {
        try {
            const img = await FileUtils.loadImageFromFile(imageFile);
            
            // Create temporary canvas to analyze image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Extract colors (simplified algorithm)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const colors = this.extractColorsFromImageData(imageData);
            
            // Create new palette
            const paletteName = 'generated_' + Date.now();
            this.palettes[paletteName] = colors;
            this.loadPalette(paletteName);
            
            console.log('Palette generated from image:', colors);
            return colors;
            
        } catch (error) {
            console.error('Failed to generate palette from image:', error);
            return null;
        }
    }

    /**
     * Extract dominant colors from image data
     */
    extractColorsFromImageData(imageData, maxColors = 16) {
        const colorMap = new Map();
        const data = imageData.data;
        
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            const hex = ColorUtils.rgbToHex(r, g, b);
            colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
        
        // Sort by frequency and take top colors
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(entry => entry[0]);
        
        return sortedColors;
    }

    /**
     * Get color harmony suggestions
     */
    getColorHarmony(baseColor, type = 'complementary') {
        switch (type) {
            case 'complementary':
                return [baseColor, ColorUtils.getComplementary(baseColor)];
            case 'analogous':
                return [baseColor, ...ColorUtils.getAnalogous(baseColor, 2)];
            case 'triadic':
                // Simplified triadic colors
                const rgb = ColorUtils.hexToRgb(baseColor);
                if (!rgb) return [baseColor];
                
                return [
                    baseColor,
                    ColorUtils.rgbToHex(rgb.g, rgb.b, rgb.r),
                    ColorUtils.rgbToHex(rgb.b, rgb.r, rgb.g)
                ];
            default:
                return [baseColor];
        }
    }

    /**
     * Create gradient between two colors
     */
    createGradient(color1, color2, steps = 5) {
        const gradient = [];
        
        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            const blended = ColorUtils.blendColors(color1, color2, ratio);
            gradient.push(blended);
        }
        
        return gradient;
    }
}

