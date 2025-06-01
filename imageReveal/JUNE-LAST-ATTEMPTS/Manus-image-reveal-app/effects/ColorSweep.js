/**
 * Color Sweep Effect
 * Applies color transformations that sweep across the image
 * 
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class ColorSweep extends EffectBase {
    constructor(name = 'ColorSweep', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect-specific parameters
     */
    initializeParameters() {
        this.parameters = {
            hueShift: this.options.hueShift || 180,
            saturationBoost: this.options.saturationBoost || 1.5,
            brightnessAdjust: this.options.brightnessAdjust || 0,
            direction: this.options.direction || 'horizontal', // 'horizontal', 'vertical', 'radial', 'spiral'
            sweepWidth: this.options.sweepWidth || 0.3, // Width of the color sweep (0-1)
            colorMode: this.options.colorMode || 'hueShift', // 'hueShift', 'rainbow', 'duotone', 'invert', 'sepia'
            speed: this.options.speed || 1.0,
            beatSync: this.options.beatSync !== false, // Default true
            ...this.parameters
        };
        
        // Color transformation state
        this.sweepPosition = 0;
        this.colorPhase = 0;
    }

    /**
     * Render Color Sweep effect
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
        
        // Update sweep position and color phase
        this.updateSweepParameters(progress, timingInfo);
        
        // Generate sweep mask
        const sweepMask = this.generateSweepMask(width, height);
        
        // Apply color transformations
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const maskValue = sweepMask[y * width + x];
                
                if (maskValue > 0) {
                    // Get original color
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    // Apply color transformation
                    const transformedColor = this.applyColorTransformation(
                        r, g, b, maskValue, x, y, width, height
                    );
                    
                    // Blend with original based on intensity and mask
                    const blendFactor = intensity * maskValue;
                    data[idx] = this.blendValue(r, transformedColor[0], blendFactor);
                    data[idx + 1] = this.blendValue(g, transformedColor[1], blendFactor);
                    data[idx + 2] = this.blendValue(b, transformedColor[2], blendFactor);
                    // Alpha unchanged
                }
            }
        }
    }

    /**
     * Update sweep position and color phase
     * @param {number} progress - Effect progress (0-1)
     * @param {Object} timingInfo - Beat timing information
     */
    updateSweepParameters(progress, timingInfo) {
        // Update sweep position based on progress and speed
        this.sweepPosition = (progress * this.parameters.speed) % 1;
        
        // Add beat synchronization if enabled
        if (this.parameters.beatSync) {
            const beatPhase = (timingInfo.currentBeat % 1);
            const beatInfluence = Math.sin(beatPhase * Math.PI) * 0.2;
            this.sweepPosition += beatInfluence;
        }
        
        // Update color phase for animated effects
        this.colorPhase = (timingInfo.currentTime * 0.5) % 1;
    }

    /**
     * Generate sweep mask based on direction
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Float32Array} Sweep mask values (0-1)
     */
    generateSweepMask(width, height) {
        const mask = new Float32Array(width * height);
        
        switch (this.parameters.direction) {
            case 'horizontal':
                this.generateHorizontalSweep(mask, width, height);
                break;
            case 'vertical':
                this.generateVerticalSweep(mask, width, height);
                break;
            case 'radial':
                this.generateRadialSweep(mask, width, height);
                break;
            case 'spiral':
                this.generateSpiralSweep(mask, width, height);
                break;
            case 'diagonal':
                this.generateDiagonalSweep(mask, width, height);
                break;
            case 'wave':
                this.generateWaveSweep(mask, width, height);
                break;
        }
        
        return mask;
    }

    /**
     * Generate horizontal sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateHorizontalSweep(mask, width, height) {
        const sweepCenter = this.sweepPosition * width;
        const sweepHalfWidth = this.parameters.sweepWidth * width / 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const distance = Math.abs(x - sweepCenter);
                let maskValue = 0;
                
                if (distance <= sweepHalfWidth) {
                    // Smooth falloff
                    maskValue = 1 - (distance / sweepHalfWidth);
                    maskValue = Math.sin(maskValue * Math.PI / 2); // Smooth curve
                }
                
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Generate vertical sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateVerticalSweep(mask, width, height) {
        const sweepCenter = this.sweepPosition * height;
        const sweepHalfWidth = this.parameters.sweepWidth * height / 2;
        
        for (let y = 0; y < height; y++) {
            const distance = Math.abs(y - sweepCenter);
            let maskValue = 0;
            
            if (distance <= sweepHalfWidth) {
                maskValue = 1 - (distance / sweepHalfWidth);
                maskValue = Math.sin(maskValue * Math.PI / 2);
            }
            
            for (let x = 0; x < width; x++) {
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Generate radial sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateRadialSweep(mask, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const sweepRadius = this.sweepPosition * maxRadius;
        const sweepWidth = this.parameters.sweepWidth * maxRadius;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radiusDistance = Math.abs(distance - sweepRadius);
                
                let maskValue = 0;
                if (radiusDistance <= sweepWidth / 2) {
                    maskValue = 1 - (radiusDistance / (sweepWidth / 2));
                    maskValue = Math.sin(maskValue * Math.PI / 2);
                }
                
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Generate spiral sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateSpiralSweep(mask, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(width * width + height * height) / 2;
        const spiralTurns = 3;
        const sweepAngle = this.sweepPosition * Math.PI * 2 * spiralTurns;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) + Math.PI;
                
                // Calculate spiral position
                const spiralAngle = angle + (distance / maxRadius) * Math.PI * 2 * spiralTurns;
                const angleDiff = Math.abs(spiralAngle - sweepAngle);
                const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                
                let maskValue = 0;
                const sweepWidth = this.parameters.sweepWidth * Math.PI;
                if (normalizedDiff <= sweepWidth / 2) {
                    maskValue = 1 - (normalizedDiff / (sweepWidth / 2));
                    maskValue = Math.sin(maskValue * Math.PI / 2);
                }
                
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Generate diagonal sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateDiagonalSweep(mask, width, height) {
        const diagonal = width + height;
        const sweepCenter = this.sweepPosition * diagonal;
        const sweepHalfWidth = this.parameters.sweepWidth * diagonal / 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const diagonalPos = x + y;
                const distance = Math.abs(diagonalPos - sweepCenter);
                
                let maskValue = 0;
                if (distance <= sweepHalfWidth) {
                    maskValue = 1 - (distance / sweepHalfWidth);
                    maskValue = Math.sin(maskValue * Math.PI / 2);
                }
                
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Generate wave sweep mask
     * @param {Float32Array} mask - Mask array to fill
     * @param {number} width - Image width
     * @param {number} height - Image height
     */
    generateWaveSweep(mask, width, height) {
        const waveFrequency = 3;
        const waveAmplitude = height * 0.2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const normalizedX = x / width;
                const waveY = height / 2 + Math.sin(normalizedX * waveFrequency * Math.PI * 2 + this.sweepPosition * Math.PI * 2) * waveAmplitude;
                const distance = Math.abs(y - waveY);
                const sweepHalfWidth = this.parameters.sweepWidth * height / 2;
                
                let maskValue = 0;
                if (distance <= sweepHalfWidth) {
                    maskValue = 1 - (distance / sweepHalfWidth);
                    maskValue = Math.sin(maskValue * Math.PI / 2);
                }
                
                mask[y * width + x] = maskValue;
            }
        }
    }

    /**
     * Apply color transformation based on mode
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @param {number} maskValue - Mask value (0-1)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array<number>} Transformed RGB values
     */
    applyColorTransformation(r, g, b, maskValue, x, y, width, height) {
        switch (this.parameters.colorMode) {
            case 'hueShift':
                return this.applyHueShift(r, g, b, maskValue);
            case 'rainbow':
                return this.applyRainbow(r, g, b, x, y, width, height);
            case 'duotone':
                return this.applyDuotone(r, g, b, maskValue);
            case 'invert':
                return this.applyInvert(r, g, b, maskValue);
            case 'sepia':
                return this.applySepia(r, g, b, maskValue);
            case 'thermal':
                return this.applyThermal(r, g, b, maskValue);
            case 'neon':
                return this.applyNeon(r, g, b, maskValue);
            default:
                return [r, g, b];
        }
    }

    /**
     * Apply hue shift transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applyHueShift(r, g, b, maskValue) {
        const hsl = this.rgbToHsl(r, g, b);
        hsl[0] = (hsl[0] + this.parameters.hueShift * maskValue / 360) % 1;
        hsl[1] = Math.min(1, hsl[1] * this.parameters.saturationBoost);
        hsl[2] = Math.max(0, Math.min(1, hsl[2] + this.parameters.brightnessAdjust / 100));
        
        return this.hslToRgb(hsl[0], hsl[1], hsl[2]);
    }

    /**
     * Apply rainbow transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array<number>} Transformed RGB values
     */
    applyRainbow(r, g, b, x, y, width, height) {
        const hue = ((x / width + y / height + this.colorPhase) % 1);
        const brightness = (r + g + b) / (3 * 255); // Preserve original brightness
        const saturation = 0.8;
        
        const rainbowColor = this.hslToRgb(hue, saturation, brightness);
        return rainbowColor;
    }

    /**
     * Apply duotone transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applyDuotone(r, g, b, maskValue) {
        const brightness = (r + g + b) / 3;
        const color1 = [255, 0, 128]; // Pink
        const color2 = [0, 255, 255]; // Cyan
        
        const t = brightness / 255;
        return [
            Math.round(color1[0] * (1 - t) + color2[0] * t),
            Math.round(color1[1] * (1 - t) + color2[1] * t),
            Math.round(color1[2] * (1 - t) + color2[2] * t)
        ];
    }

    /**
     * Apply invert transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applyInvert(r, g, b, maskValue) {
        return [255 - r, 255 - g, 255 - b];
    }

    /**
     * Apply sepia transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applySepia(r, g, b, maskValue) {
        const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        
        return [Math.round(sepiaR), Math.round(sepiaG), Math.round(sepiaB)];
    }

    /**
     * Apply thermal transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applyThermal(r, g, b, maskValue) {
        const brightness = (r + g + b) / 3;
        const intensity = brightness / 255;
        
        // Thermal color mapping: black -> red -> yellow -> white
        let thermalR, thermalG, thermalB;
        
        if (intensity < 0.33) {
            // Black to red
            const t = intensity / 0.33;
            thermalR = Math.round(255 * t);
            thermalG = 0;
            thermalB = 0;
        } else if (intensity < 0.66) {
            // Red to yellow
            const t = (intensity - 0.33) / 0.33;
            thermalR = 255;
            thermalG = Math.round(255 * t);
            thermalB = 0;
        } else {
            // Yellow to white
            const t = (intensity - 0.66) / 0.34;
            thermalR = 255;
            thermalG = 255;
            thermalB = Math.round(255 * t);
        }
        
        return [thermalR, thermalG, thermalB];
    }

    /**
     * Apply neon transformation
     * @param {number} r - Red value
     * @param {number} g - Green value
     * @param {number} b - Blue value
     * @param {number} maskValue - Mask value
     * @returns {Array<number>} Transformed RGB values
     */
    applyNeon(r, g, b, maskValue) {
        // Enhance bright colors, darken dark colors
        const brightness = (r + g + b) / 3;
        const threshold = 128;
        
        if (brightness > threshold) {
            // Enhance bright areas
            const enhancement = 1.5;
            return [
                Math.min(255, Math.round(r * enhancement)),
                Math.min(255, Math.round(g * enhancement)),
                Math.min(255, Math.round(b * enhancement))
            ];
        } else {
            // Darken dark areas
            const darkening = 0.3;
            return [
                Math.round(r * darkening),
                Math.round(g * darkening),
                Math.round(b * darkening)
            ];
        }
    }

    /**
     * Convert RGB to HSL
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {Array<number>} HSL values [0-1, 0-1, 0-1]
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const sum = max + min;
        const l = sum / 2;
        
        let h = 0;
        let s = 0;
        
        if (diff !== 0) {
            s = l > 0.5 ? diff / (2 - sum) : diff / sum;
            
            switch (max) {
                case r:
                    h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / diff + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / diff + 4) / 6;
                    break;
            }
        }
        
        return [h, s, l];
    }

    /**
     * Convert HSL to RGB
     * @param {number} h - Hue (0-1)
     * @param {number} s - Saturation (0-1)
     * @param {number} l - Lightness (0-1)
     * @returns {Array<number>} RGB values [0-255, 0-255, 0-255]
     */
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }

    /**
     * Blend two values
     * @param {number} a - First value
     * @param {number} b - Second value
     * @param {number} t - Blend factor (0-1)
     * @returns {number} Blended value
     */
    blendValue(a, b, t) {
        return Math.round(a * (1 - t) + b * t);
    }

    /**
     * Called when effect starts
     */
    onStart() {
        console.log(`Color Sweep effect started with mode: ${this.parameters.colorMode}`);
        this.sweepPosition = 0;
        this.colorPhase = 0;
    }

    /**
     * Called when effect stops
     */
    onStop() {
        console.log('Color Sweep effect completed');
    }
}

