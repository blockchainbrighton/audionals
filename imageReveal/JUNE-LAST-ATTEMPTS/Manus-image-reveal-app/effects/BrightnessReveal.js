/**
 * Brightness-Based Reveal Effect
 * Reveals image based on brightness levels of the original image
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class BrightnessReveal extends EffectBase {
    constructor(name = 'BrightnessReveal', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            revealMode: this.options.revealMode || 'brightFirst', // 'brightFirst', 'darkFirst', 'midtones', 'contrast'
            threshold: this.options.threshold || 0.5,
            featherSize: this.options.featherSize || 0.1,
            contrastBoost: this.options.contrastBoost || 1.2,
            colorEnhancement: this.options.colorEnhancement || 0.3,
            beatSync: this.options.beatSync !== false, // Default true
            adaptiveThreshold: this.options.adaptiveThreshold !== false, // Default true
            ...this.parameters
        };
        
        // Brightness analysis cache
        this.brightnessMap = null;
        this.brightnessHistogram = null;
        this.adaptiveThresholds = null;
    }

    /**
     * Render Brightness-Based Reveal effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Start with original image
        this.copyImageData(this.originalImageData, this.outputImageData);
        
        const width = this.outputImageData.width;
        const height = this.outputImageData.height;
        const data = this.outputImageData.data;
        
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Analyze brightness if not cached
        if (!this.brightnessMap) {
            this.analyzeBrightness(this.originalImageData);
        }
        
        // Calculate current threshold based on progress and mode
        const currentThreshold = this.calculateCurrentThreshold(progress, timingInfo);
        
        // Generate reveal mask based on brightness
        const revealMask = this.generateBrightnessRevealMask(
            width, height, currentThreshold, intensity
        );
        
        // Apply reveal effect
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const maskValue = revealMask[y * width + x];
                
                if (maskValue < 1) {
                    // Apply reveal effect
                    const revealFactor = maskValue * intensity;
                    
                    // Darken unrevealed areas
                    data[idx] = Math.round(data[idx] * revealFactor);         // R
                    data[idx + 1] = Math.round(data[idx + 1] * revealFactor); // G
                    data[idx + 2] = Math.round(data[idx + 2] * revealFactor); // B
                    // Alpha unchanged
                } else if (intensity > 0.3) {
                    // Enhance revealed areas
                    this.enhanceRevealedPixel(data, idx, intensity);
                }
            }
        }
        
        // Apply global contrast boost if enabled
        if (this.parameters.contrastBoost > 1 && intensity > 0.5) {
            this.applyContrastBoost(this.outputImageData, intensity);
        }
    }

    /**
     * Analyze brightness distribution of the image
     * @param {ImageData} imageData - Image data to analyze
     */
    analyzeBrightness(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Create brightness map
        this.brightnessMap = new Float32Array(width * height);
        
        // Create brightness histogram (256 bins)
        this.brightnessHistogram = new Array(256).fill(0);
        
        // Calculate brightness for each pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate luminance using standard formula
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const pixelIndex = i / 4;
            
            this.brightnessMap[pixelIndex] = brightness / 255;
            this.brightnessHistogram[Math.floor(brightness)]++;
        }
        
        // Calculate adaptive thresholds if enabled
        if (this.parameters.adaptiveThreshold) {
            this.calculateAdaptiveThresholds(width, height);
        }
        
        console.log('Brightness analysis completed');
    }

    /**
     * Calculate adaptive thresholds for different image regions
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    calculateAdaptiveThresholds(width, height) {
        const blockSize = 32;
        const blocksX = Math.ceil(width / blockSize);
        const blocksY = Math.ceil(height / blockSize);
        
        this.adaptiveThresholds = new Float32Array(blocksX * blocksY);
        
        for (let by = 0; by < blocksY; by++) {
            for (let bx = 0; bx < blocksX; bx++) {
                const startX = bx * blockSize;
                const startY = by * blockSize;
                const endX = Math.min(startX + blockSize, width);
                const endY = Math.min(startY + blockSize, height);
                
                // Calculate average brightness for this block
                let totalBrightness = 0;
                let pixelCount = 0;
                
                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        totalBrightness += this.brightnessMap[y * width + x];
                        pixelCount++;
                    }
                }
                
                const avgBrightness = totalBrightness / pixelCount;
                this.adaptiveThresholds[by * blocksX + bx] = avgBrightness;
            }
        }
    }

    /**
     * Calculate current threshold based on progress and timing
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Current threshold value
     */
    calculateCurrentThreshold(progress, timingInfo) {
        let threshold = this.parameters.threshold;
        
        // Adjust threshold based on reveal mode and progress
        switch (this.parameters.revealMode) {
            case 'brightFirst':
                threshold = 1 - progress; // Start with bright areas
                break;
            case 'darkFirst':
                threshold = progress; // Start with dark areas
                break;
            case 'midtones':
                // Reveal from middle brightness outward
                const midpoint = 0.5;
                const range = progress * 0.5;
                threshold = [midpoint - range, midpoint + range];
                break;
            case 'contrast':
                // Reveal high contrast areas first
                threshold = this.calculateContrastThreshold(progress);
                break;
            case 'adaptive':
                // Use adaptive thresholding
                threshold = this.calculateAdaptiveThreshold(progress);
                break;
        }
        
        // Add beat synchronization if enabled
        if (this.parameters.beatSync) {
            const beatPhase = (timingInfo.currentBeat % 1);
            const beatInfluence = Math.sin(beatPhase * Math.PI) * 0.1;
            
            if (Array.isArray(threshold)) {
                threshold[0] += beatInfluence;
                threshold[1] += beatInfluence;
            } else {
                threshold += beatInfluence;
            }
        }
        
        return threshold;
    }

    /**
     * Calculate contrast-based threshold
     * @param {number} progress - Effect progress (0-1)
     * @returns {number} Contrast threshold
     */
    calculateContrastThreshold(progress) {
        // Find areas with high local contrast
        const width = Math.sqrt(this.brightnessMap.length);
        const height = this.brightnessMap.length / width;
        
        // This is a simplified approach - in practice, you'd calculate
        // local contrast for each pixel and use that for thresholding
        return 0.5 + (progress - 0.5) * 0.8;
    }

    /**
     * Calculate adaptive threshold based on local image statistics
     * @param {number} progress - Effect progress (0-1)
     * @returns {number} Adaptive threshold
     */
    calculateAdaptiveThreshold(progress) {
        if (!this.adaptiveThresholds) {
            return this.parameters.threshold;
        }
        
        // Use histogram to find optimal threshold
        const totalPixels = this.brightnessMap.length;
        const targetPixels = totalPixels * progress;
        
        let cumulativePixels = 0;
        for (let i = 0; i < this.brightnessHistogram.length; i++) {
            cumulativePixels += this.brightnessHistogram[i];
            if (cumulativePixels >= targetPixels) {
                return i / 255;
            }
        }
        
        return 1;
    }

    /**
     * Generate brightness-based reveal mask
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number|Array} threshold - Threshold value(s)
     * @param {number} intensity - Effect intensity
     * @returns {Float32Array} Reveal mask values (0-1)
     */
    generateBrightnessRevealMask(width, height, threshold, intensity) {
        const mask = new Float32Array(width * height);
        const featherSize = this.parameters.featherSize;
        
        for (let i = 0; i < this.brightnessMap.length; i++) {
            const brightness = this.brightnessMap[i];
            let maskValue = 0;
            
            if (Array.isArray(threshold)) {
                // Midtones mode - reveal pixels within threshold range
                const [minThreshold, maxThreshold] = threshold;
                if (brightness >= minThreshold && brightness <= maxThreshold) {
                    maskValue = 1;
                } else {
                    // Calculate distance to nearest threshold
                    const distToMin = Math.abs(brightness - minThreshold);
                    const distToMax = Math.abs(brightness - maxThreshold);
                    const minDist = Math.min(distToMin, distToMax);
                    
                    if (minDist <= featherSize) {
                        maskValue = 1 - (minDist / featherSize);
                    }
                }
            } else {
                // Single threshold mode
                let shouldReveal = false;
                
                switch (this.parameters.revealMode) {
                    case 'brightFirst':
                        shouldReveal = brightness >= threshold;
                        break;
                    case 'darkFirst':
                        shouldReveal = brightness <= threshold;
                        break;
                    default:
                        shouldReveal = brightness >= threshold;
                        break;
                }
                
                if (shouldReveal) {
                    maskValue = 1;
                } else {
                    // Apply feathering
                    const distance = Math.abs(brightness - threshold);
                    if (distance <= featherSize) {
                        maskValue = 1 - (distance / featherSize);
                    }
                }
            }
            
            // Apply adaptive threshold adjustment if enabled
            if (this.parameters.adaptiveThreshold && this.adaptiveThresholds) {
                const blockSize = 32;
                const blocksX = Math.ceil(width / blockSize);
                const x = i % width;
                const y = Math.floor(i / width);
                const blockX = Math.floor(x / blockSize);
                const blockY = Math.floor(y / blockSize);
                const blockIndex = blockY * blocksX + blockX;
                
                if (blockIndex < this.adaptiveThresholds.length) {
                    const localThreshold = this.adaptiveThresholds[blockIndex];
                    const adjustment = (localThreshold - 0.5) * 0.3; // Subtle adjustment
                    maskValue = Math.max(0, Math.min(1, maskValue + adjustment));
                }
            }
            
            mask[i] = maskValue;
        }
        
        // Apply smoothing to mask for better visual quality
        if (featherSize > 0.05) {
            this.smoothMask(mask, width, height);
        }
        
        return mask;
    }

    /**
     * Smooth the reveal mask to reduce harsh edges
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
     * Enhance revealed pixels for better visual impact
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} idx - Pixel index
     * @param {number} intensity - Effect intensity
     */
    enhanceRevealedPixel(data, idx, intensity) {
        const enhancement = this.parameters.colorEnhancement * intensity;
        
        // Get current pixel values
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate brightness
        const brightness = (r + g + b) / 3;
        
        // Enhance saturation for colorful pixels
        if (brightness > 50 && brightness < 200) {
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max > 0 ? (max - min) / max : 0;
            
            if (saturation > 0.1) {
                const boost = 1 + enhancement;
                const center = (max + min) / 2;
                
                data[idx] = Math.min(255, center + (r - center) * boost);
                data[idx + 1] = Math.min(255, center + (g - center) * boost);
                data[idx + 2] = Math.min(255, center + (b - center) * boost);
            }
        }
        
        // Slight brightness boost for very dark or very bright areas
        if (brightness < 50 || brightness > 200) {
            const brightnessFactor = 1 + enhancement * 0.2;
            data[idx] = Math.min(255, data[idx] * brightnessFactor);
            data[idx + 1] = Math.min(255, data[idx + 1] * brightnessFactor);
            data[idx + 2] = Math.min(255, data[idx + 2] * brightnessFactor);
        }
    }

    /**
     * Apply contrast boost to the entire image
     * @param {ImageData} imageData - Image data to enhance
     * @param {number} intensity - Effect intensity
     */
    applyContrastBoost(imageData, intensity) {
        const data = imageData.data;
        const contrast = 1 + (this.parameters.contrastBoost - 1) * intensity;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Brightness Reveal effect started with mode: ${this.parameters.revealMode}`);
        // Reset brightness analysis cache
        this.brightnessMap = null;
        this.brightnessHistogram = null;
        this.adaptiveThresholds = null;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Brightness Reveal effect completed');
    }
}

