/**
 * Alpha Fade Effect
 * Gradually reveals image through alpha transparency changes
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class AlphaFade extends EffectBase {
    constructor(name = 'AlphaFade', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            fadeDirection: this.options.fadeDirection || 'in', // 'in', 'out', 'pulse'
            pattern: this.options.pattern || 'uniform', // 'uniform', 'radial', 'linear', 'noise', 'wave'
            gradientDirection: this.options.gradientDirection || 'horizontal', // 'horizontal', 'vertical', 'diagonal'
            pulseFrequency: this.options.pulseFrequency || 2, // Pulses per beat
            noiseScale: this.options.noiseScale || 0.1,
            waveFrequency: this.options.waveFrequency || 3,
            centerX: this.options.centerX || 0.5,
            centerY: this.options.centerY || 0.5,
            ...this.parameters
        };
        
        // Pre-generate noise pattern for performance
        this.noisePattern = null;
    }

    /**
     * Render Alpha Fade effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Start with original image
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        const width = this.outputImageData.width;
        const height = this.outputImageData.height;
        const data = this.outputImageData.data;
        
        // Calculate base alpha based on fade direction and progress
        let baseAlpha = this.calculateBaseAlpha(progress, timingInfo);
        
        // Apply intensity
        const intensity = this.getIntensity();
        baseAlpha *= intensity;
        
        // Generate alpha mask based on pattern
        const alphaMask = this.generateAlphaMask(width, height, progress, timingInfo);
        
        // Apply alpha fade to each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const maskAlpha = alphaMask[y * width + x];
                
                // Combine base alpha with mask alpha
                const finalAlpha = baseAlpha * maskAlpha;
                
                // Apply alpha to pixel
                data[idx + 3] = Math.round(data[idx + 3] * finalAlpha);
            }
        }
        
        // Add subtle color enhancement during fade
        if (baseAlpha < 0.8) {
            this.enhanceColors(this.outputImageData, 1 - baseAlpha);
        }
    }

    /**
     * Calculate base alpha value based on fade direction and progress
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Base alpha value (0-1)
     */
    calculateBaseAlpha(progress, timingInfo) {
        let alpha = 1;
        
        switch (this.parameters.fadeDirection) {
            case 'in':
                alpha = progress;
                break;
            case 'out':
                alpha = 1 - progress;
                break;
            case 'pulse':
                const pulsePhase = (timingInfo.currentBeat * this.parameters.pulseFrequency) % 1;
                const pulseValue = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5;
                alpha = progress * pulseValue;
                break;
            case 'beat':
                const beatPhase = timingInfo.currentBeat % 1;
                const beatAlpha = Math.sin(beatPhase * Math.PI) * 0.5 + 0.5;
                alpha = progress * beatAlpha;
                break;
        }
        
        return Math.max(0, Math.min(1, alpha));
    }

    /**
     * Generate alpha mask based on pattern
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @returns {Float32Array} Alpha mask values (0-1)
     */
    generateAlphaMask(width, height, progress, timingInfo) {
        const mask = new Float32Array(width * height);
        
        switch (this.parameters.pattern) {
            case 'uniform':
                mask.fill(1);
                break;
            case 'radial':
                this.generateRadialMask(mask, width, height, progress);
                break;
            case 'linear':
                this.generateLinearMask(mask, width, height, progress);
                break;
            case 'noise':
                this.generateNoiseMask(mask, width, height, progress);
                break;
            case 'wave':
                this.generateWaveMask(mask, width, height, progress, timingInfo);
                break;
            case 'spiral':
                this.generateSpiralMask(mask, width, height, progress);
                break;
            case 'checkerboard':
                this.generateCheckerboardMask(mask, width, height, progress);
                break;
        }
        
        return mask;
    }

    /**
     * Generate radial alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     */
    generateRadialMask(mask, width, height, progress) {
        const centerX = this.parameters.centerX * width;
        const centerY = this.parameters.centerY * height;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const currentRadius = progress * maxRadius;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                let alpha = 1;
                if (distance > currentRadius) {
                    const fadeDistance = maxRadius * 0.1; // 10% fade zone
                    alpha = Math.max(0, 1 - (distance - currentRadius) / fadeDistance);
                }
                
                mask[y * width + x] = alpha;
            }
        }
    }

    /**
     * Generate linear gradient alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     */
    generateLinearMask(mask, width, height, progress) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let position = 0;
                
                switch (this.parameters.gradientDirection) {
                    case 'horizontal':
                        position = x / width;
                        break;
                    case 'vertical':
                        position = y / height;
                        break;
                    case 'diagonal':
                        position = (x + y) / (width + height);
                        break;
                    case 'diagonal-reverse':
                        position = (x + (height - y)) / (width + height);
                        break;
                }
                
                // Create fade based on progress
                const fadeStart = progress - 0.3;
                const fadeEnd = progress + 0.3;
                
                let alpha = 1;
                if (position < fadeStart) {
                    alpha = 0;
                } else if (position < fadeEnd) {
                    alpha = (position - fadeStart) / 0.6;
                }
                
                mask[y * width + x] = Math.max(0, Math.min(1, alpha));
            }
        }
    }

    /**
     * Generate noise-based alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     */
    generateNoiseMask(mask, width, height, progress) {
        // Generate or reuse noise pattern
        if (!this.noisePattern || this.noisePattern.length !== width * height) {
            this.noisePattern = this.generatePerlinNoise(width, height, this.parameters.noiseScale);
        }
        
        const threshold = 1 - progress;
        
        for (let i = 0; i < mask.length; i++) {
            const noiseValue = this.noisePattern[i];
            mask[i] = noiseValue > threshold ? 1 : 0;
            
            // Add smooth transition
            const fadeWidth = 0.1;
            if (Math.abs(noiseValue - threshold) < fadeWidth) {
                mask[i] = (noiseValue - threshold + fadeWidth) / (2 * fadeWidth);
            }
        }
    }

    /**
     * Generate wave-based alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     */
    generateWaveMask(mask, width, height, progress, timingInfo) {
        const frequency = this.parameters.waveFrequency;
        const timeOffset = timingInfo.currentTime * 2; // Wave animation speed
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const normalizedX = x / width;
                const normalizedY = y / height;
                
                // Create wave pattern
                const wave1 = Math.sin(normalizedX * frequency * Math.PI + timeOffset);
                const wave2 = Math.sin(normalizedY * frequency * Math.PI + timeOffset * 0.7);
                const waveValue = (wave1 + wave2) / 2;
                
                // Map wave to alpha based on progress
                const threshold = (progress - 0.5) * 2; // -1 to 1
                let alpha = (waveValue - threshold) * 2 + 0.5;
                alpha = Math.max(0, Math.min(1, alpha));
                
                mask[y * width + x] = alpha;
            }
        }
    }

    /**
     * Generate spiral alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     */
    generateSpiralMask(mask, width, height, progress) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const spiralTurns = 3;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) + Math.PI; // 0 to 2π
                
                // Calculate spiral position
                const spiralProgress = (distance / maxRadius + angle / (Math.PI * 2) * spiralTurns) % 1;
                
                let alpha = spiralProgress < progress ? 1 : 0;
                
                // Add smooth transition
                const fadeWidth = 0.05;
                if (Math.abs(spiralProgress - progress) < fadeWidth) {
                    alpha = 1 - Math.abs(spiralProgress - progress) / fadeWidth;
                }
                
                mask[y * width + x] = alpha;
            }
        }
    }

    /**
     * Generate checkerboard alpha mask
     * @param {Float32Array} mask - Alpha mask array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} progress - Effect progress (0-1)
     */
    generateCheckerboardMask(mask, width, height, progress) {
        const tileSize = 32;
        const totalTiles = Math.ceil(width / tileSize) * Math.ceil(height / tileSize);
        const visibleTiles = Math.floor(progress * totalTiles);
        
        // Create random tile order
        const tileOrder = [];
        for (let i = 0; i < totalTiles; i++) {
            tileOrder.push(i);
        }
        
        // Shuffle tiles using seeded random
        for (let i = tileOrder.length - 1; i > 0; i--) {
            const j = this.random.nextInt(0, i);
            [tileOrder[i], tileOrder[j]] = [tileOrder[j], tileOrder[i]];
        }
        
        // Fill mask
        mask.fill(0);
        
        for (let i = 0; i < visibleTiles; i++) {
            const tileIndex = tileOrder[i];
            const tilesPerRow = Math.ceil(width / tileSize);
            const tileX = (tileIndex % tilesPerRow) * tileSize;
            const tileY = Math.floor(tileIndex / tilesPerRow) * tileSize;
            
            // Fill tile
            for (let y = tileY; y < Math.min(tileY + tileSize, height); y++) {
                for (let x = tileX; x < Math.min(tileX + tileSize, width); x++) {
                    mask[y * width + x] = 1;
                }
            }
        }
    }

    /**
     * Generate Perlin noise pattern
     * @param {number} width - Pattern width
     * @param {number} height - Pattern height
     * @param {number} scale - Noise scale
     * @returns {Float32Array} Noise values (0-1)
     */
    generatePerlinNoise(width, height, scale) {
        const noise = new Float32Array(width * height);
        
        // Simple noise generation (simplified Perlin noise)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const nx = x * scale;
                const ny = y * scale;
                
                // Generate noise using multiple octaves
                let value = 0;
                let amplitude = 1;
                let frequency = 1;
                
                for (let octave = 0; octave < 4; octave++) {
                    value += this.noise2D(nx * frequency, ny * frequency) * amplitude;
                    amplitude *= 0.5;
                    frequency *= 2;
                }
                
                // Normalize to 0-1
                noise[y * width + x] = (value + 1) / 2;
            }
        }
        
        return noise;
    }

    /**
     * Simple 2D noise function
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    noise2D(x, y) {
        // Simple hash-based noise
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (hash - Math.floor(hash)) * 2 - 1;
    }

    /**
     * Enhance colors during fade for visual appeal
     * @param {ImageData} imageData - Image data to enhance
     * @param {number} fadeAmount - Current fade amount (0-1)
     */
    enhanceColors(imageData, fadeAmount) {
        const data = imageData.data;
        const enhancement = fadeAmount * 0.3;
        
        for (let i = 0; i < data.length; i += 4) {
            // Skip transparent pixels
            if (data[i + 3] === 0) continue;
            
            // Increase saturation and brightness during fade
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple saturation boost
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max > 0 ? (max - min) / max : 0;
            
            if (saturation > 0.1) {
                const boost = 1 + enhancement;
                const center = (max + min) / 2;
                
                data[i] = Math.min(255, center + (r - center) * boost);
                data[i + 1] = Math.min(255, center + (g - center) * boost);
                data[i + 2] = Math.min(255, center + (b - center) * boost);
            }
        }
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Alpha Fade effect started with pattern: ${this.parameters.pattern}`);
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Alpha Fade effect completed');
    }
}

