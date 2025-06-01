/**
 * Pixelation Effect
 * Creates pixelated image that gradually resolves to full resolution
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class Pixelation extends EffectBase {
    constructor(name = 'Pixelation', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            maxPixelSize: this.options.pixelSize || 16,
            minPixelSize: this.options.minPixelSize || 1,
            smoothing: this.options.smoothing || 0.2,
            colorMode: this.options.colorMode || 'average', // 'average', 'dominant', 'random'
            beatSync: this.options.beatSync !== false, // Default true
            pattern: this.options.pattern || 'square', // 'square', 'circle', 'diamond'
            ...this.parameters
        };
    }

    /**
     * Render Pixelation effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Calculate current pixel size based on progress
        const intensity = this.getIntensity();
        let pixelSize = this.parameters.maxPixelSize * (1 - progress) * intensity;
        pixelSize = Math.max(this.parameters.minPixelSize, pixelSize);
        
        // Add beat synchronization if enabled
        if (this.parameters.beatSync) {
            const beatPhase = (timingInfo.currentBeat % 1);
            const beatPulse = Math.sin(beatPhase * Math.PI) * 0.3 + 0.7;
            pixelSize *= beatPulse;
        }
        
        // Round to integer pixel size
        const currentPixelSize = Math.max(1, Math.round(pixelSize));
        
        // Start with original image
        this.copyImageData(this.originalImageData, this.workingImageData);
        
        // Apply pixelation
        this.applyPixelation(this.workingImageData, currentPixelSize);
        
        // Apply smoothing if enabled and pixel size is small enough
        if (this.parameters.smoothing > 0 && currentPixelSize <= 4) {
            this.applySmoothingFilter(this.workingImageData, this.parameters.smoothing);
        }
        
        // Copy result to output
        this.copyImageData(this.workingImageData, this.outputImageData);
        
        // Add retro color enhancement for larger pixels
        if (currentPixelSize > 8) {
            this.enhanceRetroColors(this.outputImageData, currentPixelSize / this.parameters.maxPixelSize);
        }
    }

    /**
     * Apply pixelation to image data
     * @param {ImageData} imageData - Image data to pixelate
     * @param {number} pixelSize - Size of pixels
     */
    applyPixelation(imageData, pixelSize) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Process image in blocks
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                // Calculate block boundaries
                const blockWidth = Math.min(pixelSize, width - x);
                const blockHeight = Math.min(pixelSize, height - y);
                
                // Get representative color for this block
                const blockColor = this.getBlockColor(data, width, x, y, blockWidth, blockHeight);
                
                // Fill the entire block with the representative color
                this.fillBlock(data, width, x, y, blockWidth, blockHeight, blockColor);
            }
        }
    }

    /**
     * Get representative color for a block of pixels
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {Array<number>} RGBA color values
     */
    getBlockColor(data, width, startX, startY, blockWidth, blockHeight) {
        switch (this.parameters.colorMode) {
            case 'average':
                return this.getAverageColor(data, width, startX, startY, blockWidth, blockHeight);
            case 'dominant':
                return this.getDominantColor(data, width, startX, startY, blockWidth, blockHeight);
            case 'random':
                return this.getRandomColor(data, width, startX, startY, blockWidth, blockHeight);
            case 'center':
                return this.getCenterColor(data, width, startX, startY, blockWidth, blockHeight);
            default:
                return this.getAverageColor(data, width, startX, startY, blockWidth, blockHeight);
        }
    }

    /**
     * Get average color of a block
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {Array<number>} RGBA color values
     */
    getAverageColor(data, width, startX, startY, blockWidth, blockHeight) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const idx = (y * width + x) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                a += data[idx + 3];
                count++;
            }
        }
        
        return [
            Math.round(r / count),
            Math.round(g / count),
            Math.round(b / count),
            Math.round(a / count)
        ];
    }

    /**
     * Get dominant color of a block (simplified)
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {Array<number>} RGBA color values
     */
    getDominantColor(data, width, startX, startY, blockWidth, blockHeight) {
        const colorMap = new Map();
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const idx = (y * width + x) * 4;
                // Quantize colors to reduce complexity
                const r = Math.floor(data[idx] / 32) * 32;
                const g = Math.floor(data[idx + 1] / 32) * 32;
                const b = Math.floor(data[idx + 2] / 32) * 32;
                const key = `${r},${g},${b}`;
                
                colorMap.set(key, (colorMap.get(key) || 0) + 1);
            }
        }
        
        // Find most frequent color
        let maxCount = 0;
        let dominantColor = [0, 0, 0, 255];
        
        for (const [colorKey, count] of colorMap) {
            if (count > maxCount) {
                maxCount = count;
                const [r, g, b] = colorKey.split(',').map(Number);
                dominantColor = [r, g, b, 255];
            }
        }
        
        return dominantColor;
    }

    /**
     * Get random color from a block
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {Array<number>} RGBA color values
     */
    getRandomColor(data, width, startX, startY, blockWidth, blockHeight) {
        const randomX = startX + this.random.nextInt(0, blockWidth - 1);
        const randomY = startY + this.random.nextInt(0, blockHeight - 1);
        const idx = (randomY * width + randomX) * 4;
        
        return [
            data[idx],
            data[idx + 1],
            data[idx + 2],
            data[idx + 3]
        ];
    }

    /**
     * Get center color of a block
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {Array<number>} RGBA color values
     */
    getCenterColor(data, width, startX, startY, blockWidth, blockHeight) {
        const centerX = startX + Math.floor(blockWidth / 2);
        const centerY = startY + Math.floor(blockHeight / 2);
        const idx = (centerY * width + centerX) * 4;
        
        return [
            data[idx],
            data[idx + 1],
            data[idx + 2],
            data[idx + 3]
        ];
    }

    /**
     * Fill a block with a specific color
     * @param {Uint8ClampedArray} data - Image data
     * @param {number} width - Image width
     * @param {number} startX - Block start X
     * @param {number} startY - Block start Y
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @param {Array<number>} color - RGBA color values
     */
    fillBlock(data, width, startX, startY, blockWidth, blockHeight, color) {
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                // Apply pattern if not square
                if (this.parameters.pattern !== 'square') {
                    const relX = x - startX - blockWidth / 2;
                    const relY = y - startY - blockHeight / 2;
                    
                    if (!this.isInPattern(relX, relY, blockWidth, blockHeight)) {
                        continue; // Skip this pixel
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = color[0];     // R
                data[idx + 1] = color[1]; // G
                data[idx + 2] = color[2]; // B
                data[idx + 3] = color[3]; // A
            }
        }
    }

    /**
     * Check if a pixel is within the pattern shape
     * @param {number} relX - Relative X position from center
     * @param {number} relY - Relative Y position from center
     * @param {number} blockWidth - Block width
     * @param {number} blockHeight - Block height
     * @returns {boolean} Whether pixel is in pattern
     */
    isInPattern(relX, relY, blockWidth, blockHeight) {
        const maxRadius = Math.min(blockWidth, blockHeight) / 2;
        
        switch (this.parameters.pattern) {
            case 'circle':
                return (relX * relX + relY * relY) <= (maxRadius * maxRadius);
            case 'diamond':
                return (Math.abs(relX) + Math.abs(relY)) <= maxRadius;
            default:
                return true; // Square or unknown pattern
        }
    }

    /**
     * Apply smoothing filter to reduce pixelation artifacts
     * @param {ImageData} imageData - Image data to smooth
     * @param {number} strength - Smoothing strength (0-1)
     */
    applySmoothingFilter(imageData, strength) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        // Simple 3x3 smoothing kernel
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                
                // Apply kernel
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const px = x + kx - 1;
                        const py = y + ky - 1;
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky][kx];
                        
                        r += tempData[idx] * weight;
                        g += tempData[idx + 1] * weight;
                        b += tempData[idx + 2] * weight;
                        a += tempData[idx + 3] * weight;
                    }
                }
                
                const idx = (y * width + x) * 4;
                const smoothedR = r / kernelSum;
                const smoothedG = g / kernelSum;
                const smoothedB = b / kernelSum;
                const smoothedA = a / kernelSum;
                
                // Blend smoothed with original based on strength
                data[idx] = tempData[idx] * (1 - strength) + smoothedR * strength;
                data[idx + 1] = tempData[idx + 1] * (1 - strength) + smoothedG * strength;
                data[idx + 2] = tempData[idx + 2] * (1 - strength) + smoothedB * strength;
                data[idx + 3] = tempData[idx + 3] * (1 - strength) + smoothedA * strength;
            }
        }
    }

    /**
     * Enhance colors for retro pixelated look
     * @param {ImageData} imageData - Image data to enhance
     * @param {number} pixelAmount - Current pixelation amount (0-1)
     */
    enhanceRetroColors(imageData, pixelAmount) {
        const data = imageData.data;
        const enhancement = pixelAmount * 0.3;
        
        for (let i = 0; i < data.length; i += 4) {
            // Increase contrast and saturation for retro look
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Increase contrast
            const contrast = 1 + enhancement;
            const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
            
            data[i] = Math.max(0, Math.min(255, factor * (r - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (g - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (b - 128) + 128));
            
            // Slight color quantization for retro feel
            if (enhancement > 0.5) {
                const levels = 8; // Reduce to 8 levels per channel
                data[i] = Math.round(data[i] / (255 / levels)) * (255 / levels);
                data[i + 1] = Math.round(data[i + 1] / (255 / levels)) * (255 / levels);
                data[i + 2] = Math.round(data[i + 2] / (255 / levels)) * (255 / levels);
            }
        }
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Pixelation effect started with max pixel size: ${this.parameters.maxPixelSize}`);
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Pixelation effect completed');
    }
}

