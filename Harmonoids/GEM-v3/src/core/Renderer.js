import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.1.5/dist/pixi.mjs';

export class Renderer {
    /** @type {PIXI.Application} */
    app;
    /** @type {PIXI.Container} */
    stage; // Main container for game objects

    colorblindMode = false;
    highContrastMode = false;

    // Color palettes
    // Standard: based on a rainbow spectrum or musical relationships
    // Colorblind: Use perceptually distinct colors, e.g., from viridis or cividis
    // Frequencies mapping to hue: C=0 (red), C#=30, D=60 ... B=330
    // Base HSL: S=100%, L=50%
    standardPalette = Array(12).fill(null).map((_, i) => `hsl(${i * 30}, 100%, 50%)`);
    // Example: Blue/Orange + varying lightness/shapes
    colorblindPalette = [ 
        '#0072B2', // Blue
        '#D55E00', // Orange
        '#009E73', // Greenish teal
        '#CC79A7', // Pinkish Purple
        '#F0E442', // Yellow
        '#56B4E9', // Sky Blue
        '#E69F00', // Vermillion (lighter orange)
        // Add more, potentially varying lightness or using symbols for very similar colors
        // For simplicity in demo, reuse some with slight variation or accept fewer unique visual tones
        '#0072B2', '#D55E00', '#009E73', '#CC79A7', '#F0E442' 
    ].slice(0,12); // ensure 12 distinct values


    /**
     * @param {number} width
     * @param {number} height
     * @param {HTMLCanvasElement} canvasElement
     */
    constructor(width, height, canvasElement) {
        this.app = new PIXI.Application();
        
        // IIFE to initialize Pixi app
        (async () => {
            await this.app.init({
                canvas: canvasElement,
                width: width,
                height: height,
                backgroundColor: 0x2c2c2c, // Dark grey background
                antialias: true,
                autoDensity: true, // Handles high-resolution displays
                resolution: window.devicePixelRatio || 1,
            });
        })();
        
        this.stage = this.app.stage;

        // Basic graphic styles to reuse
        this.graphicsCache = new Map();
    }

    /**
     * Gets a color based on a musical note index (0-11 for C to B) and current palette.
     * @param {number} noteIndex - 0 (C) to 11 (B).
     * @returns {PIXI.ColorSource} The color for the note.
     */
    getColorForNoteIndex(noteIndex) {
        const palette = this.colorblindMode ? this.colorblindPalette : this.standardPalette;
        const colorStr = palette[noteIndex % 12];
        return PIXI.Color.shared.setValue(colorStr).toNumber();
    }

    /**
     * Creates or retrieves a shared PIXI.Graphics object for simple shapes.
     * Helps reduce object creation for common visuals.
     * @param {string} key A unique key for the graphic type (e.g., "circle_red_10px")
     * @param {() => PIXI.Graphics} creationFunction Function to create the Graphics if not cached.
     * @returns {PIXI.Graphics}
     */
    getSharedGraphics(key, creationFunction) {
        if (!this.graphicsCache.has(key)) {
            this.graphicsCache.set(key, creationFunction());
        }
        return this.graphicsCache.get(key).clone(); // Clone for individual use if modifications are expected
                                                  // Or manage textures from a single Graphics object
    }

    /** @param {PIXI.DisplayObject} displayObject */
    add(displayObject) {
        this.stage.addChild(displayObject);
    }

    /** @param {PIXI.DisplayObject} displayObject */
    remove(displayObject) {
        if (displayObject && displayObject.parent) {
            displayObject.parent.removeChild(displayObject);
            displayObject.destroy(); // Destroy to free resources
        }
    }

    clear() {
        // This is usually not needed as Pixi handles updates.
        // If we were dynamically adding/removing ALL children each frame:
        // while(this.stage.children[0]) {
        //    this.stage.removeChild(this.stage.children[0]).destroy();
        // }
    }
    
    setColorblindMode(enabled) {
        this.colorblindMode = enabled;
        // Existing sprites would need to update their colors.
        // This could be done via an event or by iterating through game objects.
    }

    setHighContrastMode(enabled) {
        this.highContrastMode = enabled;
        // In high contrast, might change background, simplify shapes, add outlines.
        if (enabled) {
            this.app.renderer.background.color = 0x000000; // Black
            // Visuals within entities will need to adapt
        } else {
            this.app.renderer.background.color = 0x2c2c2c; // Default dark grey
        }
    }

    // Rendering loop is typically handled by Pixi's ticker or main game loop calling app.render()
    // But our engine calls it, so no need for app.ticker here.
}