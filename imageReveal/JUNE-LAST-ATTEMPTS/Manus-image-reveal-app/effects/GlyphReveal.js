/**
 * Glyph Reveal Effect
 * Reveals pixels by transitioning from random glyphs to the actual image
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class GlyphReveal extends EffectBase {
    constructor(name = 'GlyphReveal', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            glyphSet: this.options.glyphSet || 'ascii', // 'ascii', 'unicode', 'symbols', 'binary', 'matrix'
            density: this.options.density || 0.6,
            fontSize: this.options.fontSize || 12,
            glyphColor: this.options.glyphColor || [0, 255, 0], // Green by default
            backgroundColor: this.options.backgroundColor || [0, 0, 0], // Black background
            revealSpeed: this.options.revealSpeed || 1.0,
            glyphChangeRate: this.options.glyphChangeRate || 0.1, // How often glyphs change
            convergenceMode: this.options.convergenceMode || 'random', // 'random', 'wave', 'center', 'edges'
            beatSync: this.options.beatSync !== false, // Default true
            ...this.parameters
        };
        
        // Glyph state
        this.glyphGrid = null;
        this.revealGrid = null;
        this.glyphCanvas = null;
        this.glyphContext = null;
        this.glyphSets = this.initializeGlyphSets();
        this.gridWidth = 0;
        this.gridHeight = 0;
    }

    /**
     * Initialize different glyph character sets
     * @returns {Object} Glyph sets
     */
    initializeGlyphSets() {
        return {
            ascii: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
            unicode: '▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕▖▗▘▙▚▛▜▝▞▟■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵▶▷▸▹►▻▼▽▾▿◀◁◂◃◄◅◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯',
            symbols: '☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☐☑☒☓☔☕☖☗☘☙☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☰☱☲☳☴☵☶☷☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟',
            binary: '01',
            matrix: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789',
            braille: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿'
        };
    }

    /**
     * Render Glyph Reveal effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Initialize glyph grid if needed
        if (!this.glyphGrid) {
            this.initializeGlyphGrid();
        }
        
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Update glyph states
        this.updateGlyphStates(progress, timingInfo, intensity);
        
        // Render glyphs to canvas
        this.renderGlyphsToCanvas(intensity);
        
        // Composite with original image
        this.compositeWithOriginal(progress, intensity);
    }

    /**
     * Initialize the glyph grid system
     */
    initializeGlyphGrid() {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        
        // Calculate grid dimensions based on font size
        this.gridWidth = Math.ceil(width / this.parameters.fontSize);
        this.gridHeight = Math.ceil(height / this.parameters.fontSize);
        
        // Initialize glyph grid
        this.glyphGrid = new Array(this.gridWidth * this.gridHeight);
        this.revealGrid = new Float32Array(this.gridWidth * this.gridHeight);
        
        // Create off-screen canvas for glyph rendering
        this.glyphCanvas = document.createElement('canvas');
        this.glyphCanvas.width = width;
        this.glyphCanvas.height = height;
        this.glyphContext = this.glyphCanvas.getContext('2d');
        
        // Setup font
        this.glyphContext.font = `${this.parameters.fontSize}px monospace`;
        this.glyphContext.textAlign = 'center';
        this.glyphContext.textBaseline = 'middle';
        
        // Initialize grid with random glyphs
        for (let i = 0; i < this.glyphGrid.length; i++) {
            this.glyphGrid[i] = this.getRandomGlyph();
            this.revealGrid[i] = 0; // Not revealed initially
        }
        
        console.log(`Glyph grid initialized: ${this.gridWidth}x${this.gridHeight}`);
    }

    /**
     * Get a random glyph from the current set
     * @returns {string} Random glyph character
     */
    getRandomGlyph() {
        const glyphSet = this.glyphSets[this.parameters.glyphSet] || this.glyphSets.ascii;
        return glyphSet[this.random.nextInt(0, glyphSet.length - 1)];
    }

    /**
     * Update glyph states based on progress and timing
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    updateGlyphStates(progress, timingInfo, intensity) {
        // Calculate reveal threshold based on convergence mode
        const revealThreshold = this.calculateRevealThreshold(progress, timingInfo);
        
        // Update each glyph cell
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const index = y * this.gridWidth + x;
                
                // Calculate reveal probability for this cell
                const revealProbability = this.calculateRevealProbability(
                    x, y, progress, timingInfo, revealThreshold
                );
                
                // Update reveal state
                if (this.revealGrid[index] < 1 && this.random.next() < revealProbability) {
                    this.revealGrid[index] = Math.min(1, this.revealGrid[index] + 0.1);
                }
                
                // Change glyph occasionally for animation effect
                if (this.revealGrid[index] < 0.8 && this.random.next() < this.parameters.glyphChangeRate) {
                    this.glyphGrid[index] = this.getRandomGlyph();
                }
                
                // Add beat synchronization effects
                if (this.parameters.beatSync && timingInfo.currentBeat % 1 < 0.1) {
                    if (this.random.next() < intensity * 0.3) {
                        this.glyphGrid[index] = this.getRandomGlyph();
                    }
                }
            }
        }
    }

    /**
     * Calculate reveal threshold based on convergence mode
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Reveal threshold
     */
    calculateRevealThreshold(progress, timingInfo) {
        const baseThreshold = progress * this.parameters.revealSpeed;
        
        switch (this.parameters.convergenceMode) {
            case 'wave':
                // Add wave pattern to threshold
                return baseThreshold + Math.sin(timingInfo.currentTime * 2) * 0.1;
            case 'pulse':
                // Pulse with beats
                const beatPhase = timingInfo.currentBeat % 1;
                return baseThreshold + Math.sin(beatPhase * Math.PI) * 0.2;
            default:
                return baseThreshold;
        }
    }

    /**
     * Calculate reveal probability for a specific grid cell
     * @param {number} x - Grid X coordinate
     * @param {number} y - Grid Y coordinate
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @param {number} threshold - Base reveal threshold
     * @returns {number} Reveal probability (0-1)
     */
    calculateRevealProbability(x, y, progress, timingInfo, threshold) {
        let probability = 0;
        
        switch (this.parameters.convergenceMode) {
            case 'random':
                probability = threshold * this.parameters.density;
                break;
                
            case 'center':
                // Reveal from center outward
                const centerX = this.gridWidth / 2;
                const centerY = this.gridHeight / 2;
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const normalizedDistance = distance / maxDistance;
                probability = Math.max(0, threshold - normalizedDistance) * this.parameters.density;
                break;
                
            case 'edges':
                // Reveal from edges inward
                const edgeDistance = Math.min(
                    x, y, this.gridWidth - 1 - x, this.gridHeight - 1 - y
                );
                const maxEdgeDistance = Math.min(this.gridWidth, this.gridHeight) / 2;
                const normalizedEdgeDistance = edgeDistance / maxEdgeDistance;
                probability = Math.max(0, threshold - normalizedEdgeDistance) * this.parameters.density;
                break;
                
            case 'wave':
                // Wave pattern reveal
                const waveX = Math.sin((x / this.gridWidth) * Math.PI * 4 + timingInfo.currentTime * 2);
                const waveY = Math.sin((y / this.gridHeight) * Math.PI * 4 + timingInfo.currentTime * 1.5);
                const waveValue = (waveX + waveY) / 2;
                probability = Math.max(0, threshold + waveValue * 0.3) * this.parameters.density;
                break;
                
            case 'scanline':
                // Horizontal scanline reveal
                const scanlineY = (progress * this.gridHeight) % this.gridHeight;
                const scanlineDistance = Math.abs(y - scanlineY);
                probability = scanlineDistance < 3 ? threshold * this.parameters.density * 2 : 0;
                break;
                
            case 'spiral':
                // Spiral reveal pattern
                const spiralCenterX = this.gridWidth / 2;
                const spiralCenterY = this.gridHeight / 2;
                const spiralDistance = Math.sqrt((x - spiralCenterX) ** 2 + (y - spiralCenterY) ** 2);
                const spiralAngle = Math.atan2(y - spiralCenterY, x - spiralCenterX);
                const spiralProgress = (spiralDistance + spiralAngle * 2) / 10;
                probability = Math.max(0, threshold - spiralProgress * 0.5) * this.parameters.density;
                break;
                
            default:
                probability = threshold * this.parameters.density;
                break;
        }
        
        return Math.max(0, Math.min(1, probability));
    }

    /**
     * Render glyphs to the off-screen canvas
     * @param {number} intensity - Effect intensity
     */
    renderGlyphsToCanvas(intensity) {
        const ctx = this.glyphContext;
        const width = this.glyphCanvas.width;
        const height = this.glyphCanvas.height;
        
        // Clear canvas with background color
        ctx.fillStyle = `rgb(${this.parameters.backgroundColor.join(',')})`;
        ctx.fillRect(0, 0, width, height);
        
        // Set glyph color
        ctx.fillStyle = `rgb(${this.parameters.glyphColor.join(',')})`;
        
        // Render each glyph
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const index = y * this.gridWidth + x;
                const revealAmount = this.revealGrid[index];
                
                // Only render if not fully revealed
                if (revealAmount < 1) {
                    const glyph = this.glyphGrid[index];
                    const pixelX = (x + 0.5) * this.parameters.fontSize;
                    const pixelY = (y + 0.5) * this.parameters.fontSize;
                    
                    // Calculate glyph opacity based on reveal state
                    const glyphOpacity = (1 - revealAmount) * intensity;
                    
                    if (glyphOpacity > 0.1) {
                        ctx.globalAlpha = glyphOpacity;
                        
                        // Add some visual effects to glyphs
                        if (intensity > 0.7) {
                            // Add glow effect for high intensity
                            ctx.shadowColor = `rgb(${this.parameters.glyphColor.join(',')})`;
                            ctx.shadowBlur = 3;
                        }
                        
                        // Render the glyph
                        ctx.fillText(glyph, pixelX, pixelY);
                        
                        // Reset shadow
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }
        
        ctx.globalAlpha = 1;
    }

    /**
     * Composite glyph canvas with original image
     * @param {number} progress - Effect progress (0-1)
     * @param {number} intensity - Effect intensity
     */
    compositeWithOriginal(progress, intensity) {
        // Start with original image
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        // Get glyph canvas image data
        const glyphImageData = this.glyphContext.getImageData(
            0, 0, this.glyphCanvas.width, this.glyphCanvas.height
        );
        
        const originalData = this.outputImageData.data;
        const glyphData = glyphImageData.data;
        
        // Composite the images
        for (let i = 0; i < originalData.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % this.outputImageData.width;
            const y = Math.floor(pixelIndex / this.outputImageData.width);
            
            // Calculate grid position
            const gridX = Math.floor(x / this.parameters.fontSize);
            const gridY = Math.floor(y / this.parameters.fontSize);
            const gridIndex = gridY * this.gridWidth + gridX;
            
            // Get reveal amount for this grid cell
            const revealAmount = gridIndex < this.revealGrid.length ? this.revealGrid[gridIndex] : 1;
            
            // Blend original image with glyph layer
            const glyphAlpha = glyphData[i + 3] / 255;
            const originalAlpha = revealAmount;
            
            if (glyphAlpha > 0 && originalAlpha < 1) {
                // Blend glyph with background
                const blendFactor = glyphAlpha * (1 - originalAlpha);
                
                originalData[i] = Math.round(originalData[i] * originalAlpha + glyphData[i] * blendFactor);
                originalData[i + 1] = Math.round(originalData[i + 1] * originalAlpha + glyphData[i + 1] * blendFactor);
                originalData[i + 2] = Math.round(originalData[i + 2] * originalAlpha + glyphData[i + 2] * blendFactor);
            } else {
                // Apply reveal amount to original image
                originalData[i] = Math.round(originalData[i] * originalAlpha);
                originalData[i + 1] = Math.round(originalData[i + 1] * originalAlpha);
                originalData[i + 2] = Math.round(originalData[i + 2] * originalAlpha);
            }
        }
        
        // Add digital noise for enhanced effect
        if (intensity > 0.5) {
            this.addDigitalNoise(this.outputImageData, intensity * 0.1);
        }
    }

    /**
     * Add digital noise to enhance the glyph effect
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Noise intensity
     */
    addDigitalNoise(imageData, intensity) {
        const data = imageData.data;
        const noiseAmount = 20 * intensity;
        
        for (let i = 0; i < data.length; i += 4) {
            if (this.random.next() < intensity * 0.1) {
                const noise = (this.random.next() - 0.5) * noiseAmount;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
    }

    /**
     * Check if effect has converged (all glyphs revealed)
     * @returns {boolean} Whether effect has converged
     */
    hasConverged() {
        if (!this.revealGrid) return false;
        
        let revealedCount = 0;
        for (let i = 0; i < this.revealGrid.length; i++) {
            if (this.revealGrid[i] >= 0.9) {
                revealedCount++;
            }
        }
        
        const convergenceRatio = revealedCount / this.revealGrid.length;
        return convergenceRatio > 0.95; // 95% revealed
    }

    /**
     * Get convergence progress
     * @returns {number} Convergence progress (0-1)
     */
    getConvergenceProgress() {
        if (!this.revealGrid) return 0;
        
        let totalReveal = 0;
        for (let i = 0; i < this.revealGrid.length; i++) {
            totalReveal += this.revealGrid[i];
        }
        
        return totalReveal / this.revealGrid.length;
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Glyph Reveal effect started with glyph set: ${this.parameters.glyphSet}`);
        // Reset glyph grid
        this.glyphGrid = null;
        this.revealGrid = null;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log(`Glyph Reveal effect completed. Convergence: ${(this.getConvergenceProgress() * 100).toFixed(1)}%`);
    }
}

