// HUD Manager Module
class HUDManager {
    constructor(pixelCanvas) {
        this.pixelCanvas = pixelCanvas;
        this.hudElements = [];
        this.letterColor = '#4169E1'; // Default blue
        this.currentStyle = 'normal';
        this.letterSize = 'M';
        this.visorCurve = 0.6; // Curvature factor for visor effect
        
        // Letter bank data
        this.letterBank = this.createLetterBank();
        
        // DOM elements
        this.letterColorInput = DOMUtils.getElementById('letterColorInput') || 
                               DOMUtils.querySelectorAll('input[type="color"]')[0];
        this.letterBankContainer = DOMUtils.getElementById('letterBank');
        this.customTextInput = DOMUtils.getElementById('customTextInput');
        this.addTextBtn = DOMUtils.getElementById('addTextBtn');
        this.clearHudBtn = DOMUtils.getElementById('clearHudBtn');
        this.hudStyleSelect = DOMUtils.getElementById('hudStyleSelect');
        this.letterSizeButtons = DOMUtils.querySelectorAll('.letter-size-btn[data-size]');
        
        this.init();
    }

    /**
     * Initialize HUD manager
     */
    init() {
        this.setupLetterBank();
        this.setupHUDControls();
        this.setupEventListeners();
        
        console.log('HUDManager initialized');
    }

    /**
     * Create letter bank data with pixel patterns
     */
    createLetterBank() {
        // 5x7 pixel font patterns for letters and numbers
        const patterns = {
            // Numbers 0-9
            '0': [
                '01110',
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '01110'
            ],
            '1': [
                '00100',
                '01100',
                '00100',
                '00100',
                '00100',
                '00100',
                '01110'
            ],
            '2': [
                '01110',
                '10001',
                '00001',
                '00010',
                '00100',
                '01000',
                '11111'
            ],
            '3': [
                '01110',
                '10001',
                '00001',
                '00110',
                '00001',
                '10001',
                '01110'
            ],
            '4': [
                '00010',
                '00110',
                '01010',
                '10010',
                '11111',
                '00010',
                '00010'
            ],
            '5': [
                '11111',
                '10000',
                '11110',
                '00001',
                '00001',
                '10001',
                '01110'
            ],
            '6': [
                '01110',
                '10001',
                '10000',
                '11110',
                '10001',
                '10001',
                '01110'
            ],
            '7': [
                '11111',
                '00001',
                '00010',
                '00100',
                '01000',
                '01000',
                '01000'
            ],
            '8': [
                '01110',
                '10001',
                '10001',
                '01110',
                '10001',
                '10001',
                '01110'
            ],
            '9': [
                '01110',
                '10001',
                '10001',
                '01111',
                '00001',
                '10001',
                '01110'
            ],
            // Letters A-Z
            'A': [
                '01110',
                '10001',
                '10001',
                '11111',
                '10001',
                '10001',
                '10001'
            ],
            'B': [
                '11110',
                '10001',
                '10001',
                '11110',
                '10001',
                '10001',
                '11110'
            ],
            'C': [
                '01110',
                '10001',
                '10000',
                '10000',
                '10000',
                '10001',
                '01110'
            ],
            'D': [
                '11110',
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '11110'
            ],
            'E': [
                '11111',
                '10000',
                '10000',
                '11110',
                '10000',
                '10000',
                '11111'
            ],
            'F': [
                '11111',
                '10000',
                '10000',
                '11110',
                '10000',
                '10000',
                '10000'
            ],
            'G': [
                '01110',
                '10001',
                '10000',
                '10111',
                '10001',
                '10001',
                '01110'
            ],
            'H': [
                '10001',
                '10001',
                '10001',
                '11111',
                '10001',
                '10001',
                '10001'
            ],
            'I': [
                '01110',
                '00100',
                '00100',
                '00100',
                '00100',
                '00100',
                '01110'
            ],
            'J': [
                '00111',
                '00010',
                '00010',
                '00010',
                '00010',
                '10010',
                '01100'
            ],
            'K': [
                '10001',
                '10010',
                '10100',
                '11000',
                '10100',
                '10010',
                '10001'
            ],
            'L': [
                '10000',
                '10000',
                '10000',
                '10000',
                '10000',
                '10000',
                '11111'
            ],
            'M': [
                '10001',
                '11011',
                '10101',
                '10001',
                '10001',
                '10001',
                '10001'
            ],
            'N': [
                '10001',
                '11001',
                '10101',
                '10011',
                '10001',
                '10001',
                '10001'
            ],
            'O': [
                '01110',
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '01110'
            ],
            'P': [
                '11110',
                '10001',
                '10001',
                '11110',
                '10000',
                '10000',
                '10000'
            ],
            'Q': [
                '01110',
                '10001',
                '10001',
                '10001',
                '10101',
                '10010',
                '01101'
            ],
            'R': [
                '11110',
                '10001',
                '10001',
                '11110',
                '10100',
                '10010',
                '10001'
            ],
            'S': [
                '01110',
                '10001',
                '10000',
                '01110',
                '00001',
                '10001',
                '01110'
            ],
            'T': [
                '11111',
                '00100',
                '00100',
                '00100',
                '00100',
                '00100',
                '00100'
            ],
            'U': [
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '01110'
            ],
            'V': [
                '10001',
                '10001',
                '10001',
                '10001',
                '10001',
                '01010',
                '00100'
            ],
            'W': [
                '10001',
                '10001',
                '10001',
                '10001',
                '10101',
                '11011',
                '10001'
            ],
            'X': [
                '10001',
                '10001',
                '01010',
                '00100',
                '01010',
                '10001',
                '10001'
            ],
            'Y': [
                '10001',
                '10001',
                '01010',
                '00100',
                '00100',
                '00100',
                '00100'
            ],
            'Z': [
                '11111',
                '00001',
                '00010',
                '00100',
                '01000',
                '10000',
                '11111'
            ],
            // Special characters
            ' ': [
                '00000',
                '00000',
                '00000',
                '00000',
                '00000',
                '00000',
                '00000'
            ],
            '.': [
                '00000',
                '00000',
                '00000',
                '00000',
                '00000',
                '00000',
                '00100'
            ],
            '-': [
                '00000',
                '00000',
                '00000',
                '11111',
                '00000',
                '00000',
                '00000'
            ],
            ':': [
                '00000',
                '00100',
                '00000',
                '00000',
                '00000',
                '00100',
                '00000'
            ]
        };

        return patterns;
    }

    /**
     * Setup letter bank UI
     */
    setupLetterBank() {
        if (!this.letterBankContainer) return;
        
        // Clear existing content
        DOMUtils.clearContent(this.letterBankContainer);
        
        // Add numbers 0-9
        for (let i = 0; i <= 9; i++) {
            const btn = this.createLetterButton(i.toString());
            this.letterBankContainer.appendChild(btn);
        }
        
        // Add letters A-Z
        for (let i = 65; i <= 90; i++) {
            const char = String.fromCharCode(i);
            const btn = this.createLetterButton(char);
            this.letterBankContainer.appendChild(btn);
        }
        
        // Add special characters
        const specialChars = [' ', '.', '-', ':'];
        specialChars.forEach(char => {
            const btn = this.createLetterButton(char, char === ' ' ? 'SPC' : char);
            this.letterBankContainer.appendChild(btn);
        });
    }

    /**
     * Create letter button
     */
    createLetterButton(char, displayText = null) {
        const btn = DOMUtils.createElement('button', {
            className: 'letter-btn',
            'data-char': char,
            'aria-label': `Add letter ${char}`
        }, displayText || char);
        
        DOMUtils.addEventListener(btn, 'click', () => {
            this.addLetterToCanvas(char);
        });
        
        return btn;
    }

    /**
     * Setup HUD controls
     */
    setupHUDControls() {
        // Letter color input
        if (this.letterColorInput) {
            this.letterColorInput.value = this.letterColor;
            DOMUtils.addEventListener(this.letterColorInput, 'change', () => {
                this.letterColor = this.letterColorInput.value;
            });
        }
        
        // Letter size buttons
        this.letterSizeButtons.forEach(btn => {
            DOMUtils.addEventListener(btn, 'click', () => {
                this.letterSize = btn.dataset.size;
                this.updateSizeButtonStates(btn);
            });
        });
        
        // Custom text input and button
        if (this.customTextInput && this.addTextBtn) {
            DOMUtils.addEventListener(this.addTextBtn, 'click', () => {
                const text = this.customTextInput.value.trim();
                if (text) {
                    this.addTextToCanvas(text);
                    this.customTextInput.value = '';
                }
            });
            
            DOMUtils.addEventListener(this.customTextInput, 'keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addTextBtn.click();
                }
            });
        }
        
        // Clear HUD button
        if (this.clearHudBtn) {
            DOMUtils.addEventListener(this.clearHudBtn, 'click', () => {
                this.clearAllHUDElements();
            });
        }
        
        // HUD style select
        if (this.hudStyleSelect) {
            DOMUtils.addEventListener(this.hudStyleSelect, 'change', () => {
                this.currentStyle = this.hudStyleSelect.value;
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen to global events
        eventManager.on(EVENTS.CANVAS_CLEARED, () => {
            this.hudElements = [];
            this.updateHUDStats();
        });
    }

    /**
     * Update size button states
     */
    updateSizeButtonStates(activeBtn) {
        this.letterSizeButtons.forEach(btn => {
            if (btn === activeBtn) {
                DOMUtils.addClass(btn, 'active');
            } else {
                DOMUtils.removeClass(btn, 'active');
            }
        });
    }

    /**
     * Add single letter to canvas
     */
    addLetterToCanvas(char) {
        const pattern = this.letterBank[char.toUpperCase()];
        if (!pattern) {
            console.warn(`No pattern found for character: ${char}`);
            return;
        }
        
        // Find a good position for the letter (center area of visor)
        const startX = Math.floor(this.pixelCanvas.gridSize / 2) - 15;
        const startY = Math.floor(this.pixelCanvas.gridSize / 2) - 3;
        
        this.renderLetterPattern(pattern, startX, startY, char);
    }

    /**
     * Add text string to canvas
     */
    addTextToCanvas(text) {
        const spacing = this.getLetterSpacing();
        const startX = Math.floor((this.pixelCanvas.gridSize - (text.length * spacing)) / 2);
        const startY = Math.floor(this.pixelCanvas.gridSize / 2) - 3;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            const pattern = this.letterBank[char];
            
            if (pattern) {
                const x = startX + (i * spacing);
                this.renderLetterPattern(pattern, x, startY, char);
            }
        }
        
        // Add to HUD elements list
        this.hudElements.push({
            type: 'text',
            content: text,
            x: startX,
            y: startY,
            color: this.letterColor,
            style: this.currentStyle,
            size: this.letterSize,
            timestamp: Date.now()
        });
        
        this.updateHUDStats();
        eventManager.emit(EVENTS.HUD_ELEMENT_ADDED, { text, x: startX, y: startY });
    }

    /**
     * Render letter pattern on canvas
     */
    renderLetterPattern(pattern, startX, startY, char) {
        const sizeMultiplier = this.getSizeMultiplier();
        
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                if (pattern[row][col] === '1') {
                    // Apply size multiplier
                    for (let dy = 0; dy < sizeMultiplier; dy++) {
                        for (let dx = 0; dx < sizeMultiplier; dx++) {
                            const x = startX + (col * sizeMultiplier) + dx;
                            const y = startY + (row * sizeMultiplier) + dy;
                            
                            // Apply visor curve effect if enabled
                            const adjustedPos = this.applyVisorCurve(x, y);
                            
                            if (this.isValidPosition(adjustedPos.x, adjustedPos.y)) {
                                this.pixelCanvas.paintPixel(adjustedPos.x, adjustedPos.y, this.letterColor);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Apply visor curve effect to coordinates
     */
    applyVisorCurve(x, y) {
        if (this.currentStyle !== 'curved') {
            return { x, y };
        }
        
        const centerX = this.pixelCanvas.gridSize / 2;
        const centerY = this.pixelCanvas.gridSize / 2;
        
        // Calculate distance from center
        const distanceFromCenter = Math.abs(x - centerX) / centerX;
        
        // Apply curve effect (simulate helmet visor curvature)
        const curveOffset = Math.floor(distanceFromCenter * this.visorCurve * 2);
        
        return {
            x: x,
            y: y + curveOffset
        };
    }

    /**
     * Get letter spacing based on size
     */
    getLetterSpacing() {
        const sizeMultiplier = this.getSizeMultiplier();
        return 5 * sizeMultiplier + 1; // 5 pixels wide + 1 pixel spacing
    }

    /**
     * Get size multiplier based on current letter size
     */
    getSizeMultiplier() {
        switch (this.letterSize) {
            case 'S': return 1;
            case 'M': return 1;
            case 'L': return 2;
            default: return 1;
        }
    }

    /**
     * Check if position is valid on canvas
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.pixelCanvas.gridSize && 
               y >= 0 && y < this.pixelCanvas.gridSize;
    }

    /**
     * Clear all HUD elements
     */
    clearAllHUDElements() {
        // This would ideally only clear HUD pixels, but for simplicity, 
        // we'll emit an event that the canvas can handle
        this.hudElements = [];
        this.updateHUDStats();
        
        eventManager.emit(EVENTS.HUD_ELEMENT_REMOVED, { type: 'all' });
        
        console.log('All HUD elements cleared');
    }

    /**
     * Remove specific HUD element
     */
    removeHUDElement(index) {
        if (index >= 0 && index < this.hudElements.length) {
            const element = this.hudElements.splice(index, 1)[0];
            this.updateHUDStats();
            
            eventManager.emit(EVENTS.HUD_ELEMENT_REMOVED, { element, index });
        }
    }

    /**
     * Update HUD statistics
     */
    updateHUDStats() {
        const hudCount = this.hudElements.length;
        
        // Update HUD count in canvas header
        const hudCountEl = DOMUtils.querySelectorAll('.canvas-info')[0];
        if (hudCountEl) {
            const hudText = hudCountEl.textContent.replace(/HUD: \d+/, `HUD: ${hudCount}`);
            hudCountEl.textContent = hudText;
        }
        
        eventManager.emit(EVENTS.UI_STATS_UPDATED, { hudElements: hudCount });
    }

    /**
     * Get HUD elements data
     */
    getHUDElements() {
        return [...this.hudElements];
    }

    /**
     * Set HUD elements data
     */
    setHUDElements(elements) {
        this.hudElements = elements || [];
        this.updateHUDStats();
        
        // Re-render HUD elements
        this.hudElements.forEach(element => {
            if (element.type === 'text') {
                this.addTextToCanvas(element.content);
            }
        });
    }

    /**
     * Set letter color
     */
    setLetterColor(color) {
        this.letterColor = color;
        if (this.letterColorInput) {
            this.letterColorInput.value = color;
        }
    }

    /**
     * Set HUD style
     */
    setHUDStyle(style) {
        this.currentStyle = style;
        if (this.hudStyleSelect) {
            this.hudStyleSelect.value = style;
        }
    }

    /**
     * Set letter size
     */
    setLetterSize(size) {
        this.letterSize = size;
        
        // Update button states
        this.letterSizeButtons.forEach(btn => {
            if (btn.dataset.size === size) {
                DOMUtils.addClass(btn, 'active');
            } else {
                DOMUtils.removeClass(btn, 'active');
            }
        });
    }

    /**
     * Export HUD configuration
     */
    exportHUDConfig() {
        const config = {
            elements: this.hudElements,
            letterColor: this.letterColor,
            currentStyle: this.currentStyle,
            letterSize: this.letterSize,
            visorCurve: this.visorCurve,
            timestamp: new Date().toISOString()
        };
        
        return config;
    }

    /**
     * Import HUD configuration
     */
    importHUDConfig(config) {
        if (config.elements) {
            this.setHUDElements(config.elements);
        }
        
        if (config.letterColor) {
            this.setLetterColor(config.letterColor);
        }
        
        if (config.currentStyle) {
            this.setHUDStyle(config.currentStyle);
        }
        
        if (config.letterSize) {
            this.setLetterSize(config.letterSize);
        }
        
        if (config.visorCurve !== undefined) {
            this.visorCurve = config.visorCurve;
        }
        
        console.log('HUD configuration imported');
    }

    /**
     * Add preset text options
     */
    addPresetText(presetName) {
        const presets = {
            'HELMET': 'HELMET',
            'VISOR': 'VISOR',
            'READY': 'READY',
            'ONLINE': 'ONLINE',
            'SYSTEM': 'SYSTEM',
            'ERROR': 'ERROR',
            'WARNING': 'WARNING',
            'OK': 'OK'
        };
        
        const text = presets[presetName];
        if (text) {
            this.addTextToCanvas(text);
        }
    }
}

