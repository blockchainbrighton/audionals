/**
 * Scanlines Effect
 * Creates horizontal scanline reveal pattern synchronized to beats
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class Scanlines extends EffectBase {
    constructor(name = 'Scanlines', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            lineSpacing: this.options.lineSpacing || 4,
            opacity: this.options.opacity || 0.6,
            direction: this.options.direction || 'down',
            speed: this.options.speed || 1.0,
            thickness: this.options.thickness || 1,
            color: this.options.color || [0, 255, 0], // Green scanlines by default
            ...this.parameters
        };
    }

    /**
     * Render Scanlines effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        if (!this.workingImageData || this.workingImageData.width !== this.originalImageData.width) {
            console.error(`[Scanlines.render] Dimension mismatch or uninitialized workingImageData! working: ${this.workingImageData?.width}x${this.workingImageData?.height}, original: ${this.originalImageData?.width}x${this.originalImageData?.height}`);
            return; // Stop if dimensions are wrong
        }
        // Start with original image
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        const width = this.outputImageData.width;
        const height = this.outputImageData.height;
        const data = this.outputImageData.data;
        
        // Calculate effect parameters
        const intensity = this.getIntensity() * progress;
        const lineSpacing = this.parameters.lineSpacing;
        const opacity = this.parameters.opacity * intensity;
        const thickness = this.parameters.thickness;
        
        // Calculate scanline position based on time and direction
        const speed = this.parameters.speed;
        const timeOffset = timingInfo.currentTime * speed * 60; // 60 pixels per second
        
        // Beat synchronization - pulse effect on beats
        const beatPhase = (timingInfo.currentBeat % 1);
        const beatPulse = Math.sin(beatPhase * Math.PI) * 0.3 + 0.7;
        const adjustedOpacity = opacity * beatPulse;
        
        // Create scanline pattern
        for (let y = 0; y < height; y++) {
            // Determine if this line should be a scanline
            const linePosition = this.parameters.direction === 'down' 
                ? (y + timeOffset) % (lineSpacing * 2)
                : (height - y + timeOffset) % (lineSpacing * 2);
            
            const isScanline = linePosition < thickness;
            
            if (isScanline) {
                // Apply scanline effect to this row
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    
                    // Get original pixel values
                    const originalR = data[idx];
                    const originalG = data[idx + 1];
                    const originalB = data[idx + 2];
                    
                    // Apply scanline color with blending
                    const scanlineR = this.parameters.color[0];
                    const scanlineG = this.parameters.color[1];
                    const scanlineB = this.parameters.color[2];
                    
                    // Blend scanline color with original
                    data[idx] = this.blendColor(originalR, scanlineR, adjustedOpacity);
                    data[idx + 1] = this.blendColor(originalG, scanlineG, adjustedOpacity);
                    data[idx + 2] = this.blendColor(originalB, scanlineB, adjustedOpacity);
                    // Alpha unchanged
                }
            } else {
                // Apply reveal effect - gradually show more of the image
                const revealProgress = Math.min(1, progress * 2); // Reveal faster than scanlines
                
                if (revealProgress < 1) {
                    for (let x = 0; x < width; x++) {
                        const idx = (y * width + x) * 4;
                        
                        // Darken non-scanline areas based on reveal progress
                        const darkenFactor = 1 - (1 - revealProgress) * 0.8;
                        
                        data[idx] *= darkenFactor;     // R
                        data[idx + 1] *= darkenFactor; // G
                        data[idx + 2] *= darkenFactor; // B
                        // Alpha unchanged
                    }
                }
            }
        }
        
        // Add interlacing effect for authenticity
        if (intensity > 0.5) {
            this.addInterlacing(this.outputImageData, intensity);
        }
        
        // Add subtle glow effect to scanlines
        if (adjustedOpacity > 0.3) {
            this.addScanlineGlow(this.outputImageData, timeOffset, intensity);
        }
    }

    /**
     * Blend two color values
     * @param {number} base - Base color value (0-255)
     * @param {number} overlay - Overlay color value (0-255)
     * @param {number} alpha - Blend alpha (0-1)
     * @returns {number} Blended color value
     */
    blendColor(base, overlay, alpha) {
        return Math.round(base * (1 - alpha) + overlay * alpha);
    }

    /**
     * Add interlacing effect for CRT-like appearance
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity (0-1)
     */
    addInterlacing(imageData, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const interlaceOpacity = intensity * 0.2;
        
        // Darken every other line slightly
        for (let y = 1; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                data[idx] *= (1 - interlaceOpacity);     // R
                data[idx + 1] *= (1 - interlaceOpacity); // G
                data[idx + 2] *= (1 - interlaceOpacity); // B
                // Alpha unchanged
            }
        }
    }

    /**
     * Add glow effect to scanlines
     * @param {ImageData} imageData - Image data to modify
     * @param {number} timeOffset - Current time offset
     * @param {number} intensity - Effect intensity (0-1)
     */
    addScanlineGlow(imageData, timeOffset, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const glowRadius = 2;
        const glowIntensity = intensity * 0.3;
        
        // Create glow effect around scanlines
        for (let y = 0; y < height; y++) {
            const linePosition = (y + timeOffset) % (this.parameters.lineSpacing * 2);
            const isScanline = linePosition < this.parameters.thickness;
            
            if (isScanline) {
                // Add glow above and below scanline
                for (let dy = -glowRadius; dy <= glowRadius; dy++) {
                    const glowY = y + dy;
                    if (glowY >= 0 && glowY < height) {
                        const glowStrength = (1 - Math.abs(dy) / glowRadius) * glowIntensity;
                        
                        for (let x = 0; x < width; x++) {
                            const idx = (glowY * width + x) * 4;
                            
                            // Add green glow
                            data[idx + 1] = Math.min(255, data[idx + 1] + glowStrength * 50);
                        }
                    }
                }
            }
        }
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Scanlines effect started with spacing: ${this.parameters.lineSpacing}`);
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Scanlines effect completed');
    }
}

