/**
 * V-Shift Effect
 * Creates vertical slice offset distortion synchronized to beats
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class VShift extends EffectBase {
    constructor(name = 'VShift', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            maxOffset: this.options.maxOffset || 20,
            direction: this.options.direction || 'random',
            sliceWidth: this.options.sliceWidth || 4,
            frequency: this.options.frequency || 1,
            ...this.parameters
        };
    }

    /**
     * Render V-Shift effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Copy original image data to working buffer
        this.copyImageData(this.originalImageData, this.workingImageData);
        
        const width = this.workingImageData.width;
        const height = this.workingImageData.height;
        const data = this.workingImageData.data;
        
        // Create output buffer
        this.copyImageData(this.originalImageData, this.outputImageData);
        const outputData = this.outputImageData.data;
        
        // Calculate effect intensity based on progress and beat
        const intensity = this.getIntensity() * progress;
        const beatPhase = (timingInfo.currentBeat * this.parameters.frequency) % 1;
        const beatIntensity = Math.sin(beatPhase * Math.PI * 2) * 0.5 + 0.5;
        
        // Calculate slice parameters
        const sliceWidth = this.parameters.sliceWidth;
        const maxOffset = this.parameters.maxOffset * intensity * beatIntensity;
        
        // Process image in vertical slices
        for (let x = 0; x < width; x += sliceWidth) {
            const sliceEnd = Math.min(x + sliceWidth, width);
            
            // Calculate offset for this slice
            let offset = 0;
            
            switch (this.parameters.direction) {
                case 'up':
                    offset = -maxOffset;
                    break;
                case 'down':
                    offset = maxOffset;
                    break;
                case 'random':
                    // Use seeded random for consistent results
                    this.random.setSeed(this.random.seed + x);
                    offset = this.random.nextFloat(-maxOffset, maxOffset);
                    break;
                case 'wave':
                    offset = Math.sin((x / width) * Math.PI * 4 + timingInfo.currentTime * 2) * maxOffset;
                    break;
            }
            
            // Apply vertical shift to slice
            for (let sliceX = x; sliceX < sliceEnd; sliceX++) {
                for (let y = 0; y < height; y++) {
                    const sourceY = y + Math.round(offset);
                    
                    // Wrap or clamp source Y coordinate
                    let wrappedY = sourceY;
                    if (sourceY < 0) {
                        wrappedY = height + (sourceY % height);
                    } else if (sourceY >= height) {
                        wrappedY = sourceY % height;
                    }
                    
                    // Copy pixel from source to destination
                    const sourceIdx = (wrappedY * width + sliceX) * 4;
                    const destIdx = (y * width + sliceX) * 4;
                    
                    if (sourceIdx >= 0 && sourceIdx < data.length - 3) {
                        outputData[destIdx] = data[sourceIdx];         // R
                        outputData[destIdx + 1] = data[sourceIdx + 1]; // G
                        outputData[destIdx + 2] = data[sourceIdx + 2]; // B
                        outputData[destIdx + 3] = data[sourceIdx + 3]; // A
                    }
                }
            }
        }
        
        // Add subtle noise for enhanced effect
        if (intensity > 0.3) {
            this.addNoise(this.outputImageData, intensity * 0.1);
        }
    }

    /**
     * Add subtle noise to enhance the effect
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Noise intensity (0-1)
     */
    addNoise(imageData, intensity) {
        const data = imageData.data;
        const noiseAmount = intensity * 10;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (this.random.next() - 0.5) * noiseAmount;
            
            data[i] = Math.max(0, Math.min(255, data[i] + noise));         // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
            // Alpha unchanged
        }
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`V-Shift effect started with max offset: ${this.parameters.maxOffset}`);
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('V-Shift effect completed');
    }
}

