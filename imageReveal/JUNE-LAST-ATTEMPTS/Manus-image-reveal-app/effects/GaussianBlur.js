/**
 * Gaussian Blur Effect
 * Applies gaussian blur that gradually reveals sharp image
 *
 * @extends EffectBase
 */

import { EffectBase } from './EffectBase.js';

export class GaussianBlur extends EffectBase {
    constructor(name = 'GaussianBlur', options = {}) {
        super(name, options); // options are passed to EffectBase, which should store them in this.options
    }

    /**
     * Defines default parameters for the effect.
     * @returns {Object}
     */
    getDefaultParameters() {
        return {
            maxRadius: 8,
            quality: 'medium', // 'low', 'medium', 'high'
            direction: 'both', // 'horizontal', 'vertical', 'both'
            beatSync: true,
            // Add any other effect-specific defaults here
        };
    }

    /**
     * Initialize effect-specific parameters.
     * This method is called by EffectBase.initialize().
     */
    initializeParameters() {
        const defaultParams = this.getDefaultParameters();
        // In EffectBase, this.parameters is typically initialized from this.options
        // ensuring options passed to constructor override defaults.
        // Here, we ensure our effect-specific defaults are considered if not provided in options.
        this.parameters = {
            ...defaultParams,
            ...(this.parameters || {}), // Merge with parameters potentially set by EffectBase from options
        };

        // Validate and sanitize maxRadius specifically
        if (typeof this.parameters.maxRadius !== 'number' || this.parameters.maxRadius <= 0 || isNaN(this.parameters.maxRadius)) {
            // console.warn(`[GaussianBlur] Invalid or missing maxRadius (${this.parameters.maxRadius}). Defaulting to ${defaultParams.maxRadius}. Options received:`, this.options);
            this.parameters.maxRadius = defaultParams.maxRadius;
        }

        // console.log(`[GaussianBlur.initializeParameters] Final parameters:`, JSON.parse(JSON.stringify(this.parameters)));
    }

    /**
     * Create gaussian kernel for blur effect
     * @param {number} radius - Blur radius (can be float, will be rounded internally)
     * @returns {Array<number>} Gaussian kernel
     */
    createGaussianKernel(radius) {
        const intRadius = Math.max(1, Math.round(radius)); // Kernel radius must be at least 1
        const size = intRadius * 2 + 1;
        const kernel = new Array(size);
        const sigma = intRadius / 3; // Standard deviation
        const twoSigmaSquare = 2 * sigma * sigma;
        let sum = 0;

        if (twoSigmaSquare === 0) { // Should only happen if sigma is 0 (intRadius leads to this, though unlikely if intRadius >=1)
            // console.warn(`[GaussianBlur.createGaussianKernel] twoSigmaSquare is 0 for radius ${radius} (intRadius ${intRadius}). Creating delta kernel.`);
            for (let i = 0; i < size; i++) {
                kernel[i] = (i === intRadius) ? 1 : 0; // Center pixel is 1, others 0 (no blur)
            }
            return kernel;
        }

        for (let i = 0; i < size; i++) {
            const x = i - intRadius; // Distance from center
            const value = Math.exp(-(x * x) / twoSigmaSquare);
            kernel[i] = value;
            sum += value;
        }

        if (sum === 0) { // Highly unlikely with Math.exp but a safeguard
            // console.warn(`[GaussianBlur.createGaussianKernel] Kernel sum was 0 for radius ${radius}. Using uniform kernel.`);
            const val = 1 / size;
            for (let i = 0; i < size; i++) { kernel[i] = val; }
        } else {
            for (let i = 0; i < size; i++) {
                kernel[i] /= sum; // Normalize
            }
        }
        // console.log(`[GaussianBlur.createGaussianKernel] Created kernel for radius ${radius} (intRadius ${intRadius}):`, kernel);
        return kernel;
    }

    /**
     * Render Gaussian Blur effect for the current frame.
     * Called by EffectBase.update()
     * @param {number} progress - Effect progress (0-1, eased by EffectBase)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        const overallIntensity = this.getIntensity(); // Normalized intensity (0-1) from EffectBase

        let blurRadius = this.parameters.maxRadius * (1 - progress) * overallIntensity;

        // console.log(`[GaussianBlur.render] Frame: ${timingInfo.frameCount}, Progress: ${progress.toFixed(3)}, OverallIntensity: ${overallIntensity.toFixed(3)}, InitialRadiusCalc: ${blurRadius.toFixed(3)}`);

        if (this.parameters.beatSync && timingInfo && typeof timingInfo.currentBeat === 'number') {
            const beatPhase = (timingInfo.currentBeat % 1);
            const beatPulse = Math.sin(beatPhase * Math.PI) * 0.3 + 0.7; // Pulse from 0.7 to 1.0
            blurRadius *= beatPulse;
            // console.log(`[GaussianBlur.render] BeatSync - BeatPhase: ${beatPhase.toFixed(3)}, BeatPulse: ${beatPulse.toFixed(3)}, RadiusAfterPulse: ${blurRadius.toFixed(3)}`);
        }

        blurRadius = Math.max(0, blurRadius); // Ensure non-negative

        if (!this.workingImageData || !this.outputImageData || !this.originalImageData) {
            // console.error("[GaussianBlur.render] ImageData buffers not available!");
            return;
        }

        this.copyImageData(this.originalImageData, this.workingImageData); // Start with a fresh copy of the original

        if (blurRadius < 0.5) { // If blur is negligible, just show the original image
            this.copyImageData(this.originalImageData, this.outputImageData);
            return;
        }

        const roundedBlurRadiusForMedium = Math.round(blurRadius);

        // console.log(`[GaussianBlur.render] Applying blur with quality '${this.parameters.quality}', effective radius: ${blurRadius.toFixed(3)}`);

        switch (this.parameters.quality) {
            case 'low':
                this.applyFastBlur(this.workingImageData, Math.max(1, Math.round(blurRadius / 2)));
                break;
            case 'medium':
                this.applyGaussianBlur(this.workingImageData, Math.max(1, roundedBlurRadiusForMedium));
                break;
            case 'high':
                this.applyHighQualityBlur(this.workingImageData, blurRadius); // Pass float, sub-functions handle rounding if needed
                break;
            default:
                // console.warn(`[GaussianBlur.render] Unknown quality setting: ${this.parameters.quality}. Defaulting to medium.`);
                this.applyGaussianBlur(this.workingImageData, Math.max(1, roundedBlurRadiusForMedium));
        }

        this.copyImageData(this.workingImageData, this.outputImageData);

        if (blurRadius > 1) { // Apply color enhancement if blur is somewhat significant
            this.enhanceColors(this.outputImageData, blurRadius / this.parameters.maxRadius);
        }
    }

    /**
     * Apply fast box blur (approximation of gaussian)
     * @param {ImageData} imageData - Image data to blur
     * @param {number} radius - Blur radius (should be integer >= 1)
     */
    applyFastBlur(imageData, radius) {
        // console.log(`[GaussianBlur.applyFastBlur] Radius: ${radius}`);
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data; // This will be modified

        if (this.parameters.direction === 'horizontal' || this.parameters.direction === 'both') {
            this.boxBlurHorizontal(data, width, height, radius);
        }

        if (this.parameters.direction === 'vertical' || this.parameters.direction === 'both') {
            this.boxBlurVertical(data, width, height, radius);
        }
    }

    /**
     * Apply gaussian blur using convolution
     * @param {ImageData} imageData - Image data to blur
     * @param {number} radius - Blur radius (can be float, kernel creation will handle rounding appropriately)
     */
    applyGaussianBlur(imageData, radius) {
        const floatRadius = Math.max(0, radius);
        if (floatRadius < 0.5) return; // Kernel for radius < 0.5 is effectively no blur

        // console.log(`[GaussianBlur.applyGaussianBlur] Effective radius: ${floatRadius.toFixed(3)}`);

        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data; // Will be modified
        const tempData = new Uint8ClampedArray(data); // Source for convolutions

        const kernel = this.createGaussianKernel(floatRadius); // createGaussianKernel rounds internally
        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);

        // Horizontal pass
        if (this.parameters.direction === 'horizontal' || this.parameters.direction === 'both') {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    const currentPixelBaseIdx = (y * width + x) * 4;

                    for (let k = 0; k < kernelSize; k++) {
                        const pxOffset = k - halfKernel;
                        const px = Math.min(width - 1, Math.max(0, x + pxOffset));
                        const idx = (y * width + px) * 4;
                        const weight = kernel[k];

                        r += tempData[idx] * weight;
                        g += tempData[idx + 1] * weight;
                        b += tempData[idx + 2] * weight;
                        a += tempData[idx + 3] * weight;
                    }
                    data[currentPixelBaseIdx] = r;
                    data[currentPixelBaseIdx + 1] = g;
                    data[currentPixelBaseIdx + 2] = b;
                    data[currentPixelBaseIdx + 3] = a;
                }
            }
            if (this.parameters.direction === 'both') { // Result of H-pass is now in 'data', copy to 'tempData' for V-pass
                tempData.set(data);
            }
        }

        // Vertical pass
        // Source for V-pass is 'tempData'. If only V-pass, 'tempData' is original. If H+V, 'tempData' is H-blurred.
        if (this.parameters.direction === 'vertical' || this.parameters.direction === 'both') {
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let r = 0, g = 0, b = 0, a = 0;
                    const currentPixelBaseIdx = (y * width + x) * 4;

                    for (let k = 0; k < kernelSize; k++) {
                        const pyOffset = k - halfKernel;
                        const py = Math.min(height - 1, Math.max(0, y + pyOffset));
                        const idx = (py * width + x) * 4;
                        const weight = kernel[k];

                        r += tempData[idx] * weight;
                        g += tempData[idx + 1] * weight;
                        b += tempData[idx + 2] * weight;
                        a += tempData[idx + 3] * weight;
                    }
                    data[currentPixelBaseIdx] = r;
                    data[currentPixelBaseIdx + 1] = g;
                    data[currentPixelBaseIdx + 2] = b;
                    data[currentPixelBaseIdx + 3] = a;
                }
            }
        }
    }

    /**
     * Apply high quality blur using multiple passes of GaussianBlur
     * @param {ImageData} imageData - Image data to blur
     * @param {number} radius - Total desired blur radius (float)
     */
    applyHighQualityBlur(imageData, radius) {
        if (radius < 0.5) return;

        // Heuristic for number of passes. More passes for larger radii.
        const passes = (radius <= 3) ? 1 : (radius <= 7) ? 2 : 3;
        const passRadius = radius / passes; // Distribute radius among passes

        // console.log(`[GaussianBlur.applyHighQualityBlur] Total Radius: ${radius.toFixed(3)}, Passes: ${passes}, RadiusPerPass: ${passRadius.toFixed(3)}`);

        if (passRadius < 0.5) { // If individual pass radius is too small, just do one pass with total radius
            this.applyGaussianBlur(imageData, radius);
            return;
        }

        for (let i = 0; i < passes; i++) {
            this.applyGaussianBlur(imageData, passRadius); // Each pass operates on the result of the previous
        }
    }

    /**
     * Box blur horizontal pass using a sliding window.
     * Modifies the 'data' array directly.
     * @param {Uint8ClampedArray} data - Image pixel data (will be modified)
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Blur radius (integer, >= 1)
     */
    boxBlurHorizontal(data, width, height, radius) {
        const tempData = new Uint8ClampedArray(data); // Source for reads
        const diameter = radius * 2 + 1;

        for (let y = 0; y < height; y++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            // Initialize sum for the first window segment at the beginning of the row
            for (let wx = -radius; wx <= radius; wx++) {
                const px = Math.min(width - 1, Math.max(0, 0 + wx)); // Centered at x=0 for initialization
                const idx = (y * width + px) * 4;
                rSum += tempData[idx];
                gSum += tempData[idx + 1];
                bSum += tempData[idx + 2];
                aSum += tempData[idx + 3];
            }

            for (let x = 0; x < width; x++) {
                const currentPixelIdx = (y * width + x) * 4;
                data[currentPixelIdx]     = rSum / diameter;
                data[currentPixelIdx + 1] = gSum / diameter;
                data[currentPixelIdx + 2] = bSum / diameter;
                data[currentPixelIdx + 3] = aSum / diameter;

                // Update sum for the next pixel (sliding window)
                // Subtract pixel leaving window from left
                const oldPixelX = Math.max(0, x - radius);
                const oldPixelIdx = (y * width + oldPixelX) * 4;

                // Add pixel entering window from right
                const newPixelX = Math.min(width - 1, x + radius + 1);
                const newPixelIdx = (y * width + newPixelX) * 4;

                if (x < width -1) { // Avoid issues at the very last pixel where newPixelX might be same as current window's last
                    rSum += tempData[newPixelIdx]     - tempData[oldPixelIdx];
                    gSum += tempData[newPixelIdx + 1] - tempData[oldPixelIdx + 1];
                    bSum += tempData[newPixelIdx + 2] - tempData[oldPixelIdx + 2];
                    aSum += tempData[newPixelIdx + 3] - tempData[oldPixelIdx + 3];
                }
            }
        }
    }

    /**
     * Box blur vertical pass using a sliding window.
     * Modifies the 'data' array directly.
     * @param {Uint8ClampedArray} data - Image pixel data (will be modified)
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Blur radius (integer, >= 1)
     */
    boxBlurVertical(data, width, height, radius) {
        const tempData = new Uint8ClampedArray(data); // Source for reads
        const diameter = radius * 2 + 1;

        for (let x = 0; x < width; x++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            for (let wy = -radius; wy <= radius; wy++) {
                const py = Math.min(height - 1, Math.max(0, 0 + wy)); // Centered at y=0 for initialization
                const idx = (py * width + x) * 4;
                rSum += tempData[idx];
                gSum += tempData[idx + 1];
                bSum += tempData[idx + 2];
                aSum += tempData[idx + 3];
            }

            for (let y = 0; y < height; y++) {
                const currentPixelIdx = (y * width + x) * 4;
                data[currentPixelIdx]     = rSum / diameter;
                data[currentPixelIdx + 1] = gSum / diameter;
                data[currentPixelIdx + 2] = bSum / diameter;
                data[currentPixelIdx + 3] = aSum / diameter;

                const oldPixelY = Math.max(0, y - radius);
                const oldPixelIdx = (oldPixelY * width + x) * 4;

                const newPixelY = Math.min(height - 1, y + radius + 1);
                const newPixelIdx = (newPixelY * width + x) * 4;
                
                if (y < height - 1) {
                    rSum += tempData[newPixelIdx]     - tempData[oldPixelIdx];
                    gSum += tempData[newPixelIdx + 1] - tempData[oldPixelIdx + 1];
                    bSum += tempData[newPixelIdx + 2] - tempData[oldPixelIdx + 2];
                    aSum += tempData[newPixelIdx + 3] - tempData[oldPixelIdx + 3];
                }
            }
        }
    }

    /**
     * Enhance colors during blur for visual appeal.
     * @param {ImageData} imageData - Image data to enhance (will be modified)
     * @param {number} blurAmountNormalized - Current blur amount (0-1, where 1 is max blur)
     */
    enhanceColors(imageData, blurAmountNormalized) {
        const data = imageData.data;
        const enhancementFactor = blurAmountNormalized * 0.1; // Reduced factor for subtlety

        if (enhancementFactor <= 0.01) return; // Only apply if enhancement is somewhat significant

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const avg = (r + g + b) / 3;
            const saturationBoost = 1 + enhancementFactor;

            data[i]     = Math.max(0, Math.min(255, avg + (r - avg) * saturationBoost));
            data[i + 1] = Math.max(0, Math.min(255, avg + (g - avg) * saturationBoost));
            data[i + 2] = Math.max(0, Math.min(255, avg + (b - avg) * saturationBoost));
        }
    }

    /**
     * Called by EffectBase when the effect starts.
     */
    onStart() {
        // super.onStart(); // If EffectBase has an onStart
        // console.log(`[GaussianBlur.onStart] Effect started. MaxRadius: ${this.parameters.maxRadius}, Quality: ${this.parameters.quality}`);
    }

    /**
     * Called by EffectBase when the effect stops or completes.
     */
    onStop() {
        // super.onStop(); // If EffectBase has an onStop
        // console.log('[GaussianBlur.onStop] Effect completed.');
    }
}