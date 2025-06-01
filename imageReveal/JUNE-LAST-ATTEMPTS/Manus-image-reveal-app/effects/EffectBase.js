/**
 * EffectBase - Abstract base class for all visual effects
 * Provides common interface and utilities for effect implementations
 * 
 * @abstract
 * @author Music-Synced Image-Reveal Team
 * @version 1.0.0
 */

export class EffectBase {
    /**
     * @param {string} name - Effect name
     * @param {Object} options - Effect configuration options
     */
    constructor(name, options = {}) {
        if (this.constructor === EffectBase) {
            throw new Error('EffectBase is abstract and cannot be instantiated directly');
        }

        this.name = name;
        this.options = {
            intensity: 50,
            duration: 1.0,
            easing: 'easeInOut',
            ...options
        };

        // Effect state
        this.isActive = false;
        this.progress = 0;
        this.startTime = 0;
        this.endTime = 0;
        
        // Canvas and image data references
        this.canvas = null;
        this.ctx = null;
        this.originalImageData = null;
        this.workingImageData = null;
        this.outputImageData = null;
        
        // Random number generator
        this.random = null;
        
        // Effect parameters (to be defined by subclasses)
        this.parameters = {};
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
    }

    /**
     * Initialize effect with canvas and image data
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {ImageData} originalImageData - Original image data
     * @param {SeededRandom} random - Seeded random number generator
     */
    initialize(canvas, originalImageData, random) {
        this.canvas = canvas;
        this.originalImageData = originalImageData;
        this.random = random;
    
        // Log these critical dimensions
        console.log(`[EffectBase.initialize - ${this.name}] originalImageData dimensions: ${originalImageData.width}x${originalImageData.height}`);
        console.log(`[EffectBase.initialize - ${this.name}] Main canvas (passed in) dimensions: ${canvas.width}x${canvas.height}`);
    
    
        this.width = originalImageData.width;
        this.height = originalImageData.height;
        console.log(`[EffectBase.initialize - ${this.name}] Effect internal width/height set to: ${this.width}x${this.height}`);
    
    
        if (this.width <=0 || this.height <=0) {
            console.error(`[EffectBase.initialize - ${this.name}] FATAL: Zero or negative dimensions for effect! W: ${this.width}, H: ${this.height}`);
            // Potentially throw an error or set a flag to disable the effect
        }
    
        this.workingImageData = new ImageData(this.width, this.height);
        this.outputImageData = new ImageData(this.width, this.height);
        console.log(`[EffectBase.initialize - ${this.name}] working/output ImageData created with: ${this.workingImageData.width}x${this.workingImageData.height}`);
    
    
        this.isInitialized = true;
        this.initializeParameters(); // Calls subclass (e.g., GaussianBlur.initializeParameters)
        if (typeof this.onInitialize === 'function') {
            this.onInitialize(); // Call only if it's defined by the subclass
        }
    }

    /**
     * Initialize effect-specific parameters
     * @abstract
     */
    initializeParameters() {
        throw new Error('initializeParameters() must be implemented by subclass');
    }

    /**
     * Start the effect
     * @param {number} startTime - Effect start time
     * @param {number} duration - Effect duration in seconds
     */
    start(startTime, duration = null) {
        this.isActive = true;
        this.progress = 0;
        this.startTime = startTime;
        this.endTime = startTime + (duration || this.options.duration);
        this.frameCount = 0;
        
        this.onStart();
        console.log(`Effect ${this.name} started at ${startTime.toFixed(2)}s`);
    }

    /**
     * Stop the effect
     */
    stop() {
        this.isActive = false;
        this.progress = 1;
        this.onStop();
        console.log(`Effect ${this.name} stopped`);
    }

    /**
     * Update effect for current time
     * @param {number} currentTime - Current time in seconds
     * @param {Object} timingInfo - Beat timing information
     * @returns {ImageData|null} Updated image data or null if not active
     */
    update(currentTime, timingInfo) {
        if (!this.isActive) {
            return null;
        }

        // Calculate progress
        const elapsed = currentTime - this.startTime;
        const duration = this.endTime - this.startTime;
        this.progress = Math.max(0, Math.min(1, elapsed / duration));

        // Apply easing function
        const easedProgress = this.applyEasing(this.progress);

        // Update effect
        this.frameCount++;
        const frameStartTime = performance.now();
        
        this.render(easedProgress, timingInfo);
        
        this.lastFrameTime = performance.now() - frameStartTime;

        // Check if effect is complete
        if (this.progress >= 1) {
            this.stop();
        }

        return this.outputImageData;
    }

    /**
     * Render effect for given progress
     * @abstract
     * @param {number} progress - Effect progress (0-1, eased)
     * @param {Object} timingInfo - Beat timing information
     */
    render(progress, timingInfo) {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Apply easing function to progress
     * @param {number} t - Linear progress (0-1)
     * @returns {number} Eased progress (0-1)
     */
    applyEasing(t) {
        switch (this.options.easing) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return 1 - (1 - t) * (1 - t);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
            case 'easeInCubic':
                return t * t * t;
            case 'easeOutCubic':
                return 1 - (1 - t) * (1 - t) * (1 - t);
            case 'easeInOutCubic':
                return t < 0.5 ? 4 * t * t * t : 1 - 4 * (1 - t) * (1 - t) * (1 - t);
            case 'bounce':
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            default:
                return t;
        }
    }

    /**
     * Called when effect starts
     * @virtual
     */
    onStart() {
        // Override in subclasses if needed
    }

    /**
     * Called when effect stops
     * @virtual
     */
    onStop() {
        // Override in subclasses if needed
    }

    /**
     * Set effect intensity
     * @param {number} intensity - Intensity value (0-100)
     */
    setIntensity(intensity) {
        this.options.intensity = Math.max(0, Math.min(100, intensity));
    }

    /**
     * Get effect intensity as normalized value
     * @returns {number} Intensity (0-1)
     */
    getIntensity() {
        return this.options.intensity / 100;
    }

    /**
     * Copy pixel data from source to destination
     * @param {ImageData} source - Source image data
     * @param {ImageData} destination - Destination image data
     */
    copyImageData(source, destination) {
        destination.data.set(source.data);
    }

    /**
     * Blend two image data objects
     * @param {ImageData} base - Base image data
     * @param {ImageData} overlay - Overlay image data
     * @param {number} alpha - Blend alpha (0-1)
     * @param {string} mode - Blend mode ('normal', 'multiply', 'screen', 'overlay')
     * @returns {ImageData} Blended image data
     */
    blendImageData(base, overlay, alpha = 1, mode = 'normal') {
        const result = new ImageData(
            new Uint8ClampedArray(base.data),
            base.width,
            base.height
        );

        for (let i = 0; i < result.data.length; i += 4) {
            const baseR = base.data[i];
            const baseG = base.data[i + 1];
            const baseB = base.data[i + 2];
            const baseA = base.data[i + 3];

            const overlayR = overlay.data[i];
            const overlayG = overlay.data[i + 1];
            const overlayB = overlay.data[i + 2];
            const overlayA = overlay.data[i + 3];

            let resultR, resultG, resultB;

            switch (mode) {
                case 'multiply':
                    resultR = (baseR * overlayR) / 255;
                    resultG = (baseG * overlayG) / 255;
                    resultB = (baseB * overlayB) / 255;
                    break;
                case 'screen':
                    resultR = 255 - ((255 - baseR) * (255 - overlayR)) / 255;
                    resultG = 255 - ((255 - baseG) * (255 - overlayG)) / 255;
                    resultB = 255 - ((255 - baseB) * (255 - overlayB)) / 255;
                    break;
                case 'overlay':
                    resultR = baseR < 128 ? (2 * baseR * overlayR) / 255 : 255 - (2 * (255 - baseR) * (255 - overlayR)) / 255;
                    resultG = baseG < 128 ? (2 * baseG * overlayG) / 255 : 255 - (2 * (255 - baseG) * (255 - overlayG)) / 255;
                    resultB = baseB < 128 ? (2 * baseB * overlayB) / 255 : 255 - (2 * (255 - baseB) * (255 - overlayB)) / 255;
                    break;
                default: // normal
                    resultR = overlayR;
                    resultG = overlayG;
                    resultB = overlayB;
                    break;
            }

            // Apply alpha blending
            result.data[i] = baseR + (resultR - baseR) * alpha;
            result.data[i + 1] = baseG + (resultG - baseG) * alpha;
            result.data[i + 2] = baseB + (resultB - baseB) * alpha;
            result.data[i + 3] = baseA + (overlayA - baseA) * alpha;
        }

        return result;
    }

    /**
     * Apply convolution filter to image data
     * @param {ImageData} imageData - Image data to filter
     * @param {Array<Array<number>>} kernel - Convolution kernel
     * @param {number} divisor - Kernel divisor (default: sum of kernel values)
     * @returns {ImageData} Filtered image data
     */
    applyConvolution(imageData, kernel, divisor = null) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const result = new ImageData(width, height);
        
        const kernelSize = kernel.length;
        const half = Math.floor(kernelSize / 2);
        
        // Calculate divisor if not provided
        if (divisor === null) {
            divisor = kernel.flat().reduce((sum, val) => sum + val, 0) || 1;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = Math.min(width - 1, Math.max(0, x + kx - half));
                        const py = Math.min(height - 1, Math.max(0, y + ky - half));
                        const idx = (py * width + px) * 4;
                        const weight = kernel[ky][kx];

                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }

                const idx = (y * width + x) * 4;
                result.data[idx] = Math.max(0, Math.min(255, r / divisor));
                result.data[idx + 1] = Math.max(0, Math.min(255, g / divisor));
                result.data[idx + 2] = Math.max(0, Math.min(255, b / divisor));
                result.data[idx + 3] = data[idx + 3]; // Preserve alpha
            }
        }

        return result;
    }

    /**
     * Get pixel at coordinates
     * @param {ImageData} imageData - Image data
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array<number>} RGBA values
     */
    getPixel(imageData, x, y) {
        const idx = (y * imageData.width + x) * 4;
        return [
            imageData.data[idx],
            imageData.data[idx + 1],
            imageData.data[idx + 2],
            imageData.data[idx + 3]
        ];
    }

    /**
     * Set pixel at coordinates
     * @param {ImageData} imageData - Image data
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Array<number>} rgba - RGBA values
     */
    setPixel(imageData, x, y, rgba) {
        const idx = (y * imageData.width + x) * 4;
        imageData.data[idx] = rgba[0];
        imageData.data[idx + 1] = rgba[1];
        imageData.data[idx + 2] = rgba[2];
        imageData.data[idx + 3] = rgba[3];
    }

    /**
     * Get effect metadata
     * @returns {Object} Effect metadata
     */
    getMetadata() {
        return {
            name: this.name,
            isActive: this.isActive,
            progress: this.progress,
            intensity: this.options.intensity,
            duration: this.options.duration,
            frameCount: this.frameCount,
            lastFrameTime: this.lastFrameTime,
            parameters: this.parameters
        };
    }

    /**
     * Serialize effect state for debugging
     * @returns {Object} Serialized state
     */
    serialize() {
        return {
            name: this.name,
            options: this.options,
            isActive: this.isActive,
            progress: this.progress,
            startTime: this.startTime,
            endTime: this.endTime,
            frameCount: this.frameCount,
            parameters: this.parameters
        };
    }

    /**
     * Create a deep copy of the effect
     * @returns {EffectBase} Cloned effect
     */
    clone() {
        const cloned = new this.constructor(this.name, { ...this.options });
        cloned.parameters = { ...this.parameters };
        return cloned;
    }
}

