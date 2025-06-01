/**
 * Radial Reveal Effect
 * Reveals image in radial patterns from multiple centers
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class RadialReveal extends EffectBase {
    constructor(name = 'RadialReveal', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            centerCount: this.options.centerCount || 3,
            revealSpeed: this.options.revealSpeed || 1.0,
            maxRadius: this.options.maxRadius || 0.8, // Fraction of image diagonal
            fadeWidth: this.options.fadeWidth || 0.1, // Fade zone width
            rotationSpeed: this.options.rotationSpeed || 0.5,
            pulsation: this.options.pulsation || 0.3,
            beatSync: this.options.beatSync !== false, // Default true
            pattern: this.options.pattern || 'circle', // 'circle', 'star', 'polygon', 'spiral'
            centerMode: this.options.centerMode || 'fixed', // 'fixed', 'random', 'grid', 'orbit'
            ...this.parameters
        };
        
        // Reveal centers
        this.revealCenters = [];
        this.maxImageRadius = 0;
    }

    /**
     * Render Radial Reveal effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Initialize reveal centers if needed
        if (this.revealCenters.length === 0) {
            this.initializeRevealCenters();
        }
        
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Update reveal centers
        this.updateRevealCenters(timingInfo, intensity);
        
        // Generate reveal mask
        const revealMask = this.generateRadialRevealMask(progress, timingInfo, intensity);
        
        // Apply reveal effect
        this.applyRadialReveal(revealMask, intensity);
    }

    /**
     * Initialize reveal centers based on center mode
     */
    initializeRevealCenters() {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        this.maxImageRadius = Math.sqrt(width * width + height * height) / 2;
        
        this.revealCenters = [];
        
        switch (this.parameters.centerMode) {
            case 'fixed':
                this.createFixedCenters(width, height);
                break;
            case 'random':
                this.createRandomCenters(width, height);
                break;
            case 'grid':
                this.createGridCenters(width, height);
                break;
            case 'orbit':
                this.createOrbitCenters(width, height);
                break;
        }
        
        console.log(`Initialized ${this.revealCenters.length} reveal centers`);
    }

    /**
     * Create fixed reveal centers
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    createFixedCenters(width, height) {
        const positions = [
            { x: 0.5, y: 0.5 }, // Center
            { x: 0.25, y: 0.25 }, // Top-left
            { x: 0.75, y: 0.75 }, // Bottom-right
            { x: 0.25, y: 0.75 }, // Bottom-left
            { x: 0.75, y: 0.25 }  // Top-right
        ];
        
        for (let i = 0; i < Math.min(this.parameters.centerCount, positions.length); i++) {
            const pos = positions[i];
            this.revealCenters.push({
                x: pos.x * width,
                y: pos.y * height,
                baseX: pos.x * width,
                baseY: pos.y * height,
                radius: 0,
                maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                phase: i * (Math.PI * 2 / this.parameters.centerCount),
                rotationAngle: 0
            });
        }
    }

    /**
     * Create random reveal centers
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    createRandomCenters(width, height) {
        for (let i = 0; i < this.parameters.centerCount; i++) {
            const x = this.random.nextFloat(0.2, 0.8) * width;
            const y = this.random.nextFloat(0.2, 0.8) * height;
            
            this.revealCenters.push({
                x: x,
                y: y,
                baseX: x,
                baseY: y,
                radius: 0,
                maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                phase: this.random.nextFloat(0, Math.PI * 2),
                rotationAngle: 0
            });
        }
    }

    /**
     * Create grid-based reveal centers
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    createGridCenters(width, height) {
        const gridSize = Math.ceil(Math.sqrt(this.parameters.centerCount));
        let centerIndex = 0;
        
        for (let row = 0; row < gridSize && centerIndex < this.parameters.centerCount; row++) {
            for (let col = 0; col < gridSize && centerIndex < this.parameters.centerCount; col++) {
                const x = (col + 0.5) / gridSize * width;
                const y = (row + 0.5) / gridSize * height;
                
                this.revealCenters.push({
                    x: x,
                    y: y,
                    baseX: x,
                    baseY: y,
                    radius: 0,
                    maxRadius: this.maxImageRadius * this.parameters.maxRadius / gridSize,
                    phase: centerIndex * (Math.PI * 2 / this.parameters.centerCount),
                    rotationAngle: 0
                });
                
                centerIndex++;
            }
        }
    }

    /**
     * Create orbiting reveal centers
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    createOrbitCenters(width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const orbitRadius = Math.min(width, height) * 0.3;
        
        for (let i = 0; i < this.parameters.centerCount; i++) {
            const angle = (i / this.parameters.centerCount) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * orbitRadius;
            const y = centerY + Math.sin(angle) * orbitRadius;
            
            this.revealCenters.push({
                x: x,
                y: y,
                baseX: centerX,
                baseY: centerY,
                orbitRadius: orbitRadius,
                orbitAngle: angle,
                radius: 0,
                maxRadius: this.maxImageRadius * this.parameters.maxRadius,
                phase: i * (Math.PI * 2 / this.parameters.centerCount),
                rotationAngle: 0
            });
        }
    }

    /**
     * Update reveal centers based on timing and parameters
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    updateRevealCenters(timingInfo, intensity) {
        for (let i = 0; i < this.revealCenters.length; i++) {
            const center = this.revealCenters[i];
            
            // Update radius based on progress and timing
            const targetRadius = center.maxRadius * intensity;
            center.radius = this.lerp(center.radius, targetRadius, 0.1);
            
            // Add pulsation based on beats
            if (this.parameters.beatSync && this.parameters.pulsation > 0) {
                const beatPhase = (timingInfo.currentBeat + center.phase / (Math.PI * 2)) % 1;
                const pulseFactor = 1 + Math.sin(beatPhase * Math.PI) * this.parameters.pulsation;
                center.radius *= pulseFactor;
            }
            
            // Update rotation
            center.rotationAngle += this.parameters.rotationSpeed * 0.02;
            
            // Update position for orbiting centers
            if (center.orbitRadius !== undefined) {
                center.orbitAngle += this.parameters.rotationSpeed * 0.01;
                center.x = center.baseX + Math.cos(center.orbitAngle) * center.orbitRadius;
                center.y = center.baseY + Math.sin(center.orbitAngle) * center.orbitRadius;
            }
        }
    }

    /**
     * Generate radial reveal mask
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     * @returns {Float32Array} Reveal mask values (0-1)
     */
    generateRadialRevealMask(progress, timingInfo, intensity) {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        const mask = new Float32Array(width * height);
        
        // Generate mask for each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = y * width + x;
                let maxReveal = 0;
                
                // Check reveal from each center
                for (const center of this.revealCenters) {
                    const reveal = this.calculatePixelReveal(x, y, center, timingInfo);
                    maxReveal = Math.max(maxReveal, reveal);
                }
                
                mask[pixelIndex] = maxReveal;
            }
        }
        
        // Apply smoothing to mask
        this.smoothMask(mask, width, height);
        
        return mask;
    }

    /**
     * Calculate reveal amount for a pixel from a specific center
     * @param {number} x - Pixel X coordinate
     * @param {number} y - Pixel Y coordinate
     * @param {Object} center - Reveal center object
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Reveal amount (0-1)
     */
    calculatePixelReveal(x, y, center, timingInfo) {
        const dx = x - center.x;
        const dy = y - center.y;
        
        let reveal = 0;
        
        switch (this.parameters.pattern) {
            case 'circle':
                reveal = this.calculateCircularReveal(dx, dy, center);
                break;
            case 'star':
                reveal = this.calculateStarReveal(dx, dy, center);
                break;
            case 'polygon':
                reveal = this.calculatePolygonReveal(dx, dy, center);
                break;
            case 'spiral':
                reveal = this.calculateSpiralReveal(dx, dy, center, timingInfo);
                break;
        }
        
        return Math.max(0, Math.min(1, reveal));
    }

    /**
     * Calculate circular reveal pattern
     * @param {number} dx - X distance from center
     * @param {number} dy - Y distance from center
     * @param {Object} center - Reveal center object
     * @returns {number} Reveal amount (0-1)
     */
    calculateCircularReveal(dx, dy, center) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= center.radius) {
            return 1;
        } else if (distance <= center.radius + center.maxRadius * this.parameters.fadeWidth) {
            const fadeDistance = distance - center.radius;
            const fadeRange = center.maxRadius * this.parameters.fadeWidth;
            return 1 - (fadeDistance / fadeRange);
        }
        
        return 0;
    }

    /**
     * Calculate star-shaped reveal pattern
     * @param {number} dx - X distance from center
     * @param {number} dy - Y distance from center
     * @param {Object} center - Reveal center object
     * @returns {number} Reveal amount (0-1)
     */
    calculateStarReveal(dx, dy, center) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + center.rotationAngle;
        
        // Create star shape with 5 points
        const starPoints = 5;
        const starAngle = (angle + Math.PI) % (Math.PI * 2 / starPoints);
        const starRadius = center.radius * (0.7 + 0.3 * Math.cos(starAngle * starPoints));
        
        if (distance <= starRadius) {
            return 1;
        } else if (distance <= starRadius + center.maxRadius * this.parameters.fadeWidth) {
            const fadeDistance = distance - starRadius;
            const fadeRange = center.maxRadius * this.parameters.fadeWidth;
            return 1 - (fadeDistance / fadeRange);
        }
        
        return 0;
    }

    /**
     * Calculate polygon reveal pattern
     * @param {number} dx - X distance from center
     * @param {number} dy - Y distance from center
     * @param {Object} center - Reveal center object
     * @returns {number} Reveal amount (0-1)
     */
    calculatePolygonReveal(dx, dy, center) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + center.rotationAngle;
        
        // Create hexagon
        const sides = 6;
        const sideAngle = Math.PI * 2 / sides;
        const normalizedAngle = ((angle + Math.PI) % sideAngle) - sideAngle / 2;
        const polygonRadius = center.radius / Math.cos(normalizedAngle);
        
        if (distance <= polygonRadius) {
            return 1;
        } else if (distance <= polygonRadius + center.maxRadius * this.parameters.fadeWidth) {
            const fadeDistance = distance - polygonRadius;
            const fadeRange = center.maxRadius * this.parameters.fadeWidth;
            return 1 - (fadeDistance / fadeRange);
        }
        
        return 0;
    }

    /**
     * Calculate spiral reveal pattern
     * @param {number} dx - X distance from center
     * @param {number} dy - Y distance from center
     * @param {Object} center - Reveal center object
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Reveal amount (0-1)
     */
    calculateSpiralReveal(dx, dy, center, timingInfo) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create spiral pattern
        const spiralTurns = 3;
        const spiralProgress = (distance / center.maxRadius + angle / (Math.PI * 2) * spiralTurns + timingInfo.currentTime * 0.5) % 1;
        const currentProgress = center.radius / center.maxRadius;
        
        if (spiralProgress <= currentProgress) {
            return 1;
        } else if (spiralProgress <= currentProgress + this.parameters.fadeWidth) {
            const fadeDistance = spiralProgress - currentProgress;
            return 1 - (fadeDistance / this.parameters.fadeWidth);
        }
        
        return 0;
    }

    /**
     * Apply radial reveal effect to the image
     * @param {Float32Array} revealMask - Reveal mask
     * @param {number} intensity - Effect intensity
     */
    applyRadialReveal(revealMask, intensity) {
        // Start with original image
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        const width = this.outputImageData.width;
        const height = this.outputImageData.height;
        const data = this.outputImageData.data;
        
        // Apply reveal mask
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixelIndex = y * width + x;
                const dataIndex = pixelIndex * 4;
                const revealAmount = revealMask[pixelIndex] * intensity;
                
                if (revealAmount < 1) {
                    // Darken unrevealed areas
                    const darkening = 1 - revealAmount;
                    data[dataIndex] = Math.round(data[dataIndex] * revealAmount);         // R
                    data[dataIndex + 1] = Math.round(data[dataIndex + 1] * revealAmount); // G
                    data[dataIndex + 2] = Math.round(data[dataIndex + 2] * revealAmount); // B
                    // Alpha unchanged
                } else if (intensity > 0.5) {
                    // Enhance revealed areas
                    this.enhanceRevealedPixel(data, dataIndex, intensity);
                }
            }
        }
        
        // Add glow effect around reveal edges
        if (intensity > 0.3) {
            this.addRevealGlow(this.outputImageData, revealMask, intensity);
        }
    }

    /**
     * Enhance revealed pixels
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} index - Pixel index
     * @param {number} intensity - Effect intensity
     */
    enhanceRevealedPixel(data, index, intensity) {
        const enhancement = 0.2 * intensity;
        
        // Slight brightness and contrast boost
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Increase contrast
        const contrast = 1 + enhancement;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        
        data[index] = Math.max(0, Math.min(255, factor * (r - 128) + 128));
        data[index + 1] = Math.max(0, Math.min(255, factor * (g - 128) + 128));
        data[index + 2] = Math.max(0, Math.min(255, factor * (b - 128) + 128));
    }

    /**
     * Add glow effect around reveal edges
     * @param {ImageData} imageData - Image data to modify
     * @param {Float32Array} revealMask - Reveal mask
     * @param {number} intensity - Effect intensity
     */
    addRevealGlow(imageData, revealMask, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const glowIntensity = intensity * 0.3;
        
        // Find edge pixels and add glow
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const index = y * width + x;
                const revealAmount = revealMask[index];
                
                // Check if this is an edge pixel
                if (revealAmount > 0.1 && revealAmount < 0.9) {
                    const dataIndex = index * 4;
                    
                    // Add subtle glow
                    const glow = glowIntensity * 50;
                    data[dataIndex] = Math.min(255, data[dataIndex] + glow);     // R
                    data[dataIndex + 1] = Math.min(255, data[dataIndex + 1] + glow); // G
                    data[dataIndex + 2] = Math.min(255, data[dataIndex + 2] + glow); // B
                }
            }
        }
    }

    /**
     * Smooth the reveal mask
     * @param {Float32Array} mask - Mask to smooth
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    smoothMask(mask, width, height) {
        const tempMask = new Float32Array(mask);
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const px = x + kx - 1;
                        const py = y + ky - 1;
                        const idx = py * width + px;
                        sum += tempMask[idx] * kernel[ky][kx];
                    }
                }
                
                mask[y * width + x] = sum / kernelSum;
            }
        }
    }

    /**
     * Linear interpolation utility
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Radial Reveal effect started with pattern: ${this.parameters.pattern}`);
        this.revealCenters = [];
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Radial Reveal effect completed');
    }
}

