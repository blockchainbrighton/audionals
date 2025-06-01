/**
 * Ripple Distortion Effect
 * Creates wave-like distortions emanating from beat-synchronized points
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class RippleDistortion extends EffectBase {
    constructor(name = 'RippleDistortion', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            amplitude: this.options.amplitude || 15,
            frequency: this.options.frequency || 0.3,
            speed: this.options.speed || 2.0,
            damping: this.options.damping || 0.95,
            centerX: this.options.centerX || 0.5,
            centerY: this.options.centerY || 0.5,
            multipleRipples: this.options.multipleRipples !== false, // Default true
            maxRipples: this.options.maxRipples || 5,
            beatSync: this.options.beatSync !== false, // Default true
            waveType: this.options.waveType || 'sine', // 'sine', 'square', 'triangle', 'sawtooth'
            distortionMode: this.options.distortionMode || 'radial', // 'radial', 'horizontal', 'vertical', 'spiral'
            ...this.parameters
        };
        
        // Ripple state
        this.ripples = [];
        this.lastBeatTime = 0;
        this.distortionField = null;
    }

    /**
     * Render Ripple Distortion effect
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        // Calculate effect intensity
        const intensity = this.getIntensity() * progress;
        
        // Update ripples
        this.updateRipples(timingInfo, intensity);
        
        // Generate distortion field
        this.generateDistortionField(timingInfo, intensity);
        
        // Apply distortion to image
        this.applyDistortion(intensity);
    }

    /**
     * Update ripple states and create new ripples
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    updateRipples(timingInfo, intensity) {
        // Create new ripples on beats if enabled
        if (this.parameters.beatSync) {
            const beatPhase = timingInfo.currentBeat % 1;
            
            // Trigger new ripple on beat
            if (beatPhase < 0.1 && timingInfo.currentTime - this.lastBeatTime > 0.2) {
                this.createRipple(timingInfo.currentTime, intensity);
                this.lastBeatTime = timingInfo.currentTime;
            }
        } else {
            // Create ripples at regular intervals
            if (this.ripples.length === 0 || 
                timingInfo.currentTime - this.ripples[this.ripples.length - 1].startTime > 1.0) {
                this.createRipple(timingInfo.currentTime, intensity);
            }
        }
        
        // Update existing ripples
        this.ripples = this.ripples.filter(ripple => {
            ripple.age = timingInfo.currentTime - ripple.startTime;
            ripple.radius = ripple.age * this.parameters.speed * 100;
            ripple.amplitude = ripple.initialAmplitude * Math.pow(this.parameters.damping, ripple.age);
            
            // Remove ripples that have faded out or grown too large
            return ripple.amplitude > 0.1 && ripple.radius < 2000;
        });
    }

    /**
     * Create a new ripple
     * @param {number} currentTime - Current time
     * @param {number} intensity - Effect intensity
     */
    createRipple(currentTime, intensity) {
        if (this.ripples.length >= this.parameters.maxRipples) {
            // Remove oldest ripple
            this.ripples.shift();
        }
        
        let centerX, centerY;
        
        if (this.parameters.multipleRipples) {
            // Random position for multiple ripples
            centerX = this.random.nextFloat(0.2, 0.8);
            centerY = this.random.nextFloat(0.2, 0.8);
        } else {
            // Use specified center
            centerX = this.parameters.centerX;
            centerY = this.parameters.centerY;
        }
        
        const ripple = {
            centerX: centerX * this.originalImageData.width,
            centerY: centerY * this.originalImageData.height,
            startTime: currentTime,
            age: 0,
            radius: 0,
            initialAmplitude: this.parameters.amplitude * intensity,
            amplitude: this.parameters.amplitude * intensity,
            frequency: this.parameters.frequency + this.random.nextFloat(-0.1, 0.1),
            phase: this.random.nextFloat(0, Math.PI * 2)
        };
        
        this.ripples.push(ripple);
    }

    /**
     * Generate distortion field based on active ripples
     * @param {Object} timingInfo - Beat timing information
     * @param {number} intensity - Effect intensity
     */
    generateDistortionField(timingInfo, intensity) {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        
        // Initialize distortion field if needed
        if (!this.distortionField || this.distortionField.length !== width * height * 2) {
            this.distortionField = new Float32Array(width * height * 2); // x, y offsets
        }
        
        // Clear distortion field
        this.distortionField.fill(0);
        
        // Calculate distortion for each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 2;
                let totalOffsetX = 0;
                let totalOffsetY = 0;
                
                // Accumulate distortion from all active ripples
                for (const ripple of this.ripples) {
                    const dx = x - ripple.centerX;
                    const dy = y - ripple.centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const distortion = this.calculateRippleDistortion(
                            distance, ripple, timingInfo
                        );
                        
                        // Calculate distortion direction based on mode
                        const { offsetX, offsetY } = this.calculateDistortionOffset(
                            dx, dy, distance, distortion
                        );
                        
                        totalOffsetX += offsetX;
                        totalOffsetY += offsetY;
                    }
                }
                
                // Store distortion offsets
                this.distortionField[index] = totalOffsetX;
                this.distortionField[index + 1] = totalOffsetY;
            }
        }
    }

    /**
     * Calculate ripple distortion at a given distance
     * @param {number} distance - Distance from ripple center
     * @param {Object} ripple - Ripple object
     * @param {Object} timingInfo - Beat timing information
     * @returns {number} Distortion amount
     */
    calculateRippleDistortion(distance, ripple, timingInfo) {
        // Calculate wave based on distance and ripple properties
        const wavePhase = distance * ripple.frequency - ripple.age * this.parameters.speed + ripple.phase;
        
        let waveValue;
        switch (this.parameters.waveType) {
            case 'sine':
                waveValue = Math.sin(wavePhase);
                break;
            case 'square':
                waveValue = Math.sign(Math.sin(wavePhase));
                break;
            case 'triangle':
                waveValue = (2 / Math.PI) * Math.asin(Math.sin(wavePhase));
                break;
            case 'sawtooth':
                waveValue = 2 * (wavePhase / (2 * Math.PI) - Math.floor(wavePhase / (2 * Math.PI) + 0.5));
                break;
            default:
                waveValue = Math.sin(wavePhase);
                break;
        }
        
        // Apply amplitude and distance falloff
        const distanceFalloff = Math.exp(-distance / 200); // Falloff over distance
        const distortion = waveValue * ripple.amplitude * distanceFalloff;
        
        return distortion;
    }

    /**
     * Calculate distortion offset based on distortion mode
     * @param {number} dx - X distance from center
     * @param {number} dy - Y distance from center
     * @param {number} distance - Total distance
     * @param {number} distortion - Distortion amount
     * @returns {Object} Offset values {offsetX, offsetY}
     */
    calculateDistortionOffset(dx, dy, distance, distortion) {
        let offsetX = 0;
        let offsetY = 0;
        
        switch (this.parameters.distortionMode) {
            case 'radial':
                // Distort radially outward/inward
                if (distance > 0) {
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;
                    offsetX = normalizedX * distortion;
                    offsetY = normalizedY * distortion;
                }
                break;
                
            case 'tangential':
                // Distort tangentially (perpendicular to radius)
                if (distance > 0) {
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;
                    offsetX = -normalizedY * distortion;
                    offsetY = normalizedX * distortion;
                }
                break;
                
            case 'horizontal':
                // Horizontal distortion only
                offsetX = distortion;
                offsetY = 0;
                break;
                
            case 'vertical':
                // Vertical distortion only
                offsetX = 0;
                offsetY = distortion;
                break;
                
            case 'spiral':
                // Spiral distortion
                if (distance > 0) {
                    const angle = Math.atan2(dy, dx);
                    const spiralAngle = angle + distortion * 0.1;
                    const newX = Math.cos(spiralAngle) * distance;
                    const newY = Math.sin(spiralAngle) * distance;
                    offsetX = newX - dx;
                    offsetY = newY - dy;
                }
                break;
                
            case 'twist':
                // Twist distortion (rotation based on distance)
                if (distance > 0) {
                    const twistAngle = distortion * 0.01;
                    const cos = Math.cos(twistAngle);
                    const sin = Math.sin(twistAngle);
                    const newX = dx * cos - dy * sin;
                    const newY = dx * sin + dy * cos;
                    offsetX = newX - dx;
                    offsetY = newY - dy;
                }
                break;
        }
        
        return { offsetX, offsetY };
    }

    /**
     * Apply distortion to the image
     * @param {number} intensity - Effect intensity
     */
    applyDistortion(intensity) {
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        const sourceData = this.originalImageData.data;
        
        // Create output image data
        this.copyImageData(this.originalImageData, this.outputImageData);
        const outputData = this.outputImageData.data;
        
        // Apply distortion using backward mapping for better quality
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const distortionIndex = (y * width + x) * 2;
                const offsetX = this.distortionField[distortionIndex] * intensity;
                const offsetY = this.distortionField[distortionIndex + 1] * intensity;
                
                // Calculate source coordinates
                const sourceX = x - offsetX;
                const sourceY = y - offsetY;
                
                // Sample from source image with bilinear interpolation
                const sampledColor = this.bilinearSample(
                    sourceData, width, height, sourceX, sourceY
                );
                
                // Set output pixel
                const outputIndex = (y * width + x) * 4;
                outputData[outputIndex] = sampledColor[0];     // R
                outputData[outputIndex + 1] = sampledColor[1]; // G
                outputData[outputIndex + 2] = sampledColor[2]; // B
                outputData[outputIndex + 3] = sampledColor[3]; // A
            }
        }
        
        // Add subtle chromatic aberration for enhanced effect
        if (intensity > 0.6) {
            this.addChromaticAberration(this.outputImageData, intensity);
        }
    }

    /**
     * Bilinear sampling from image data
     * @param {Uint8ClampedArray} data - Source image data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} x - Sample X coordinate (can be fractional)
     * @param {number} y - Sample Y coordinate (can be fractional)
     * @returns {Array<number>} RGBA values
     */
    bilinearSample(data, width, height, x, y) {
        // Clamp coordinates to image bounds
        x = Math.max(0, Math.min(width - 1, x));
        y = Math.max(0, Math.min(height - 1, y));
        
        // Get integer and fractional parts
        const x1 = Math.floor(x);
        const y1 = Math.floor(y);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);
        
        const fx = x - x1;
        const fy = y - y1;
        
        // Get four corner pixels
        const idx11 = (y1 * width + x1) * 4;
        const idx21 = (y1 * width + x2) * 4;
        const idx12 = (y2 * width + x1) * 4;
        const idx22 = (y2 * width + x2) * 4;
        
        // Bilinear interpolation for each channel
        const result = new Array(4);
        for (let c = 0; c < 4; c++) {
            const top = data[idx11 + c] * (1 - fx) + data[idx21 + c] * fx;
            const bottom = data[idx12 + c] * (1 - fx) + data[idx22 + c] * fx;
            result[c] = Math.round(top * (1 - fy) + bottom * fy);
        }
        
        return result;
    }

    /**
     * Add chromatic aberration effect
     * @param {ImageData} imageData - Image data to modify
     * @param {number} intensity - Effect intensity
     */
    addChromaticAberration(imageData, intensity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        const aberrationAmount = intensity * 2;
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const normalizedDistance = distance / Math.sqrt(centerX * centerX + centerY * centerY);
                
                // Calculate chromatic aberration offsets
                const redOffset = aberrationAmount * normalizedDistance;
                const blueOffset = -aberrationAmount * normalizedDistance;
                
                // Sample red channel with offset
                const redX = Math.max(0, Math.min(width - 1, x + redOffset));
                const redIdx = (y * width + Math.round(redX)) * 4;
                data[idx] = tempData[redIdx];
                
                // Green channel unchanged
                data[idx + 1] = tempData[idx + 1];
                
                // Sample blue channel with offset
                const blueX = Math.max(0, Math.min(width - 1, x + blueOffset));
                const blueIdx = (y * width + Math.round(blueX)) * 4;
                data[idx + 2] = tempData[blueIdx + 2];
                
                // Alpha unchanged
                data[idx + 3] = tempData[idx + 3];
            }
        }
    }

    /**
     * Get current ripple count
     * @returns {number} Number of active ripples
     */
    getActiveRippleCount() {
        return this.ripples.length;
    }

    /**
     * Get total distortion energy
     * @returns {number} Total distortion energy
     */
    getTotalDistortionEnergy() {
        let totalEnergy = 0;
        for (const ripple of this.ripples) {
            totalEnergy += ripple.amplitude;
        }
        return totalEnergy;
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Ripple Distortion effect started with mode: ${this.parameters.distortionMode}`);
        this.ripples = [];
        this.lastBeatTime = 0;
        this.distortionField = null;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log(`Ripple Distortion effect completed. Final ripples: ${this.ripples.length}`);
        this.ripples = [];
    }
}

