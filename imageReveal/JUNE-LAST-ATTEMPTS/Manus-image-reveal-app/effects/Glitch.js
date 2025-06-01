/**
 * Glitch Effect
 * Creates digital distortion with RGB shift and noise artifacts
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class Glitch extends EffectBase {
    constructor(name = 'Glitch', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            rgbShift: this.options.rgbShift || 5,
            noiseIntensity: this.options.noiseIntensity || 0.3,
            blockSize: this.options.blockSize || 15,
            scanlineIntensity: this.options.scanlineIntensity || 0.5,
            digitalNoise: this.options.digitalNoise || 0.2,
            colorCorruption: this.options.colorCorruption || 0.4,
            glitchFrequency: this.options.glitchFrequency || 0.1, // Probability of glitch per frame
            beatSync: this.options.beatSync !== false, // Default true
            ...this.parameters
        };
        
        // Glitch state
        this.glitchBlocks = [];
        this.lastGlitchTime = 0;
        this.glitchDuration = 0;
    }

    /**
     * Render Glitch effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Start with original image
        this.copyImageData(this.originalImageData, this.workingImageData);
        
        const width = this.workingImageData.width;
        const height = this.workingImageData.height;
        
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Determine if we should trigger new glitch
        const shouldGlitch = this.shouldTriggerGlitch(timingInfo, intensity);
        
        if (shouldGlitch) {
            this.generateGlitchBlocks(width, height, intensity);
            this.lastGlitchTime = timingInfo.currentTime;
            this.glitchDuration = this.random.nextFloat(0.05, 0.2); // 50-200ms glitch
        }
        
        // Apply glitch effects if within glitch duration
        const isGlitching = (timingInfo.currentTime - this.lastGlitchTime) < this.glitchDuration;
        
        if (isGlitching || intensity > 0.7) {
            // Apply RGB shift
            this.applyRGBShift(this.workingImageData, intensity);
            
            // Apply block displacement
            this.applyBlockDisplacement(this.workingImageData, intensity);
            
            // Apply scanline distortion
            this.applyScanlineDistortion(this.workingImageData, intensity, timingInfo);
            
            // Apply digital noise
            this.applyDigitalNoise(this.workingImageData, intensity);
            
            // Apply color corruption
            this.applyColorCorruption(this.workingImageData, intensity);
        }
        
        // Always apply some base noise for continuous effect
        this.applyBaseNoise(this.workingImageData, intensity * 0.3);
        
        // Copy result to output
        this.copyImageData(this.workingImageData, this.outputImageData);
    }

    /**
     * Determine if a new glitch should be triggered
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Current effect intensity
     * @returns {boolean} Whether to trigger glitch
     */
    shouldTriggerGlitch(timingInfo, intensity) {
        // Beat-synchronized glitches
        if (this.parameters.beatSync) {
            const beatPhase = timingInfo.currentBeat % 1;
            if (beatPhase < 0.1 && this.random.next() < intensity) {
                return true;
            }
        }
        
        // Random glitches based on frequency
        const glitchProbability = this.parameters.glitchFrequency * intensity;
        return this.random.next() < glitchProbability;
    }

    /**
     * Generate random glitch blocks for displacement
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} intensity - Effect intensity
     */
    generateGlitchBlocks(width, height, intensity) {
        this.glitchBlocks = [];
        const blockCount = Math.floor(intensity * 10 + 2);
        
        for (let i = 0; i < blockCount; i++) {
            const blockWidth = this.random.nextInt(20, this.parameters.blockSize * 3);
            const blockHeight = this.random.nextInt(5, this.parameters.blockSize);
            const x = this.random.nextInt(0, width - blockWidth);
            const y = this.random.nextInt(0, height - blockHeight);
            const offsetX = this.random.nextInt(-this.parameters.blockSize, this.parameters.blockSize);
            const offsetY = this.random.nextInt(-5, 5);
            
            this.glitchBlocks.push({
                x, y, width: blockWidth, height: blockHeight,
                offsetX, offsetY
            });
        }
    }

    /**
     * Apply RGB channel shift effect
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    applyRGBShift(imageData, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        const shiftAmount = this.parameters.rgbShift * intensity;
        const redShiftX = Math.round(this.random.nextFloat(-shiftAmount, shiftAmount));
        const greenShiftX = Math.round(this.random.nextFloat(-shiftAmount, shiftAmount));
        const blueShiftX = Math.round(this.random.nextFloat(-shiftAmount, shiftAmount));
        
        // Apply channel shifts
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Red channel
                const redX = Math.max(0, Math.min(width - 1, x + redShiftX));
                const redIdx = (y * width + redX) * 4;
                data[idx] = tempData[redIdx];
                
                // Green channel
                const greenX = Math.max(0, Math.min(width - 1, x + greenShiftX));
                const greenIdx = (y * width + greenX) * 4;
                data[idx + 1] = tempData[greenIdx + 1];
                
                // Blue channel
                const blueX = Math.max(0, Math.min(width - 1, x + blueShiftX));
                const blueIdx = (y * width + blueX) * 4;
                data[idx + 2] = tempData[blueIdx + 2];
                
                // Alpha unchanged
                data[idx + 3] = tempData[idx + 3];
            }
        }
    }

    /**
     * Apply block displacement glitch
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    applyBlockDisplacement(imageData, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        // Apply each glitch block
        for (const block of this.glitchBlocks) {
            const sourceX = block.x;
            const sourceY = block.y;
            const destX = Math.max(0, Math.min(width - block.width, block.x + block.offsetX));
            const destY = Math.max(0, Math.min(height - block.height, block.y + block.offsetY));
            
            // Copy block to new position
            for (let y = 0; y < block.height; y++) {
                for (let x = 0; x < block.width; x++) {
                    const srcIdx = ((sourceY + y) * width + (sourceX + x)) * 4;
                    const destIdx = ((destY + y) * width + (destX + x)) * 4;
                    
                    if (srcIdx >= 0 && srcIdx < tempData.length - 3 &&
                        destIdx >= 0 && destIdx < data.length - 3) {
                        data[destIdx] = tempData[srcIdx];
                        data[destIdx + 1] = tempData[srcIdx + 1];
                        data[destIdx + 2] = tempData[srcIdx + 2];
                        data[destIdx + 3] = tempData[srcIdx + 3];
                    }
                }
            }
        }
    }

    /**
     * Apply scanline distortion
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     * @param {Object} timingInfo - Beat timing information
     */
    applyScanlineDistortion(imageData, intensity, timingInfo) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        const scanlineIntensity = this.parameters.scanlineIntensity * intensity;
        const distortionLines = Math.floor(intensity * 20);
        
        for (let i = 0; i < distortionLines; i++) {
            const y = this.random.nextInt(0, height - 1);
            const offset = this.random.nextInt(-20, 20) * scanlineIntensity;
            
            // Distort entire scanline
            for (let x = 0; x < width; x++) {
                const sourceX = Math.max(0, Math.min(width - 1, x + Math.round(offset)));
                const sourceIdx = (y * width + sourceX) * 4;
                const destIdx = (y * width + x) * 4;
                
                data[destIdx] = tempData[sourceIdx];
                data[destIdx + 1] = tempData[sourceIdx + 1];
                data[destIdx + 2] = tempData[sourceIdx + 2];
                data[destIdx + 3] = tempData[sourceIdx + 3];
            }
            
            // Add scanline artifacts
            if (this.random.next() < 0.5) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const brightness = this.random.nextFloat(0.5, 1.5);
                    
                    data[idx] = Math.min(255, data[idx] * brightness);
                    data[idx + 1] = Math.min(255, data[idx + 1] * brightness);
                    data[idx + 2] = Math.min(255, data[idx + 2] * brightness);
                }
            }
        }
    }

    /**
     * Apply digital noise
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    applyDigitalNoise(imageData, intensity) {
        const data = imageData.data;
        const noiseIntensity = this.parameters.digitalNoise * intensity;
        const noiseAmount = 255 * noiseIntensity;
        
        // Apply random digital noise
        for (let i = 0; i < data.length; i += 4) {
            if (this.random.next() < noiseIntensity) {
                // Digital noise - completely random pixel
                data[i] = this.random.nextInt(0, 255);     // R
                data[i + 1] = this.random.nextInt(0, 255); // G
                data[i + 2] = this.random.nextInt(0, 255); // B
                // Alpha unchanged
            } else if (this.random.next() < noiseIntensity * 0.5) {
                // Additive noise
                const noise = (this.random.next() - 0.5) * noiseAmount;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }
    }

    /**
     * Apply color corruption
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    applyColorCorruption(imageData, intensity) {
        const data = imageData.data;
        const corruptionIntensity = this.parameters.colorCorruption * intensity;
        
        for (let i = 0; i < data.length; i += 4) {
            if (this.random.next() < corruptionIntensity * 0.1) {
                // Channel swapping
                const swapType = this.random.nextInt(0, 5);
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                switch (swapType) {
                    case 0: // R->G, G->B, B->R
                        data[i] = g;
                        data[i + 1] = b;
                        data[i + 2] = r;
                        break;
                    case 1: // R->B, B->G, G->R
                        data[i] = b;
                        data[i + 1] = r;
                        data[i + 2] = g;
                        break;
                    case 2: // Invert red channel
                        data[i] = 255 - r;
                        break;
                    case 3: // Invert green channel
                        data[i + 1] = 255 - g;
                        break;
                    case 4: // Invert blue channel
                        data[i + 2] = 255 - b;
                        break;
                    case 5: // Extreme saturation
                        const max = Math.max(r, g, b);
                        data[i] = r === max ? 255 : 0;
                        data[i + 1] = g === max ? 255 : 0;
                        data[i + 2] = b === max ? 255 : 0;
                        break;
                }
            } else if (this.random.next() < corruptionIntensity * 0.05) {
                // Bit shifting corruption
                const shiftAmount = this.random.nextInt(1, 4);
                data[i] = (data[i] >> shiftAmount) << shiftAmount;
                data[i + 1] = (data[i + 1] >> shiftAmount) << shiftAmount;
                data[i + 2] = (data[i + 2] >> shiftAmount) << shiftAmount;
            }
        }
    }

    /**
     * Apply base noise for continuous effect
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    applyBaseNoise(imageData, intensity) {
        const data = imageData.data;
        const noiseAmount = 10 * intensity;
        
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
     * Called when effect starts
     */
    onStart() {
        console.log(`Glitch effect started with RGB shift: ${this.parameters.rgbShift}`);
        this.glitchBlocks = [];
        this.lastGlitchTime = 0;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Glitch effect completed');
        this.glitchBlocks = [];
    }
}

