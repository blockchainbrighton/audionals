import { EffectBase } from './EffectBase.js';

/**
 * Brightness-Based Reveal Effect (Optimised, context-based)
 * Reveals image based on brightness levels using fast alpha masking.
 */
export class BrightnessReveal extends EffectBase {
    constructor(name = 'BrightnessReveal', options = {}) {
        super(name, options);
    }

    initialize(canvas, originalImageData, random) {
        this.canvas = canvas;
        this.random = random;
        this.parameters = {
            revealMode: this.options.revealMode || 'brightFirst', // 'brightFirst', 'darkFirst', etc
            featherSize: this.options.featherSize ?? 0.1,
            contrastBoost: this.options.contrastBoost ?? 1.2,
            colorEnhancement: this.options.colorEnhancement ?? 0.3,
            adaptiveThreshold: this.options.adaptiveThreshold !== false,
            beatSync: this.options.beatSync !== false,
        };
        this.width = originalImageData.width;
        this.height = originalImageData.height;
        this.imageBitmap = null;
        this.brightnessMap = null;

        // Precompute brightness map as Float32Array
        this.brightnessMap = this.analyzeBrightness(originalImageData);
        createImageBitmap(originalImageData).then(bmp => { this.imageBitmap = bmp; });
        this.maskCanvas = null;
    }

    draw(ctx, timingInfo) {
        if (!this.imageBitmap || !this.brightnessMap) return;

        // Compute effect progress
        const progress = this.getProgress(timingInfo);

        // Precompute reveal mask as grayscale alpha on an offscreen canvas
        if (!this.maskCanvas
            || this.maskCanvas.width !== this.width
            || this.maskCanvas.height !== this.height
            || this._lastMaskProgress !== progress) {

            this._lastMaskProgress = progress;
            this.maskCanvas = this.generateRevealMask(progress, timingInfo);
        }

        // Compose: mask image on temp, then draw to ctx
        const tmp = this.getTempCanvas();
        const tctx = tmp.getContext('2d');
        tctx.clearRect(0, 0, tmp.width, tmp.height);

        // Draw original image to temp
        tctx.drawImage(this.imageBitmap, 0, 0, this.width, this.height);
        // Use mask as alpha (destination-in)
        tctx.globalCompositeOperation = 'destination-in';
        tctx.globalAlpha = 1;
        tctx.drawImage(this.maskCanvas, 0, 0, this.width, this.height);

        // Apply contrast boost if needed (optional, can be omitted for perf)
        if (this.parameters.contrastBoost > 1) {
            this.applyContrast(tmp, this.parameters.contrastBoost);
        }

        // Draw composited temp to main canvas, stretched
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    getProgress(timingInfo) {
        if (typeof this.startTime === 'number' && typeof this.duration === 'number') {
            return Math.max(0, Math.min(1, (timingInfo.currentTime - this.startTime) / this.duration));
        }
        return timingInfo.progress ?? 0;
    }

    /**
     * Generate the reveal mask as an offscreen canvas.
     */
    generateRevealMask(progress, timingInfo) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.createImageData(this.width, this.height);
        const data = imgData.data;
        const feather = this.parameters.featherSize * 255;

        // Calculate threshold based on mode/progress
        let threshold;
        switch (this.parameters.revealMode) {
            case 'brightFirst': threshold = 1 - progress; break;
            case 'darkFirst':   threshold = progress; break;
            case 'midtones':    threshold = [0.5 - progress * 0.5, 0.5 + progress * 0.5]; break;
            default:            threshold = 1 - progress; break;
        }

        for (let i = 0; i < this.brightnessMap.length; i++) {
            let mask = 0;
            const b = this.brightnessMap[i];

            if (Array.isArray(threshold)) {
                // midtones
                if (b >= threshold[0] && b <= threshold[1]) mask = 255;
                else {
                    const d = Math.min(Math.abs(b - threshold[0]), Math.abs(b - threshold[1]));
                    mask = Math.max(0, 255 - (d * 255 / feather));
                }
            } else {
                // standard
                if ((this.parameters.revealMode === 'brightFirst' && b >= threshold)
                 || (this.parameters.revealMode === 'darkFirst' && b <= threshold)) {
                    mask = 255;
                } else {
                    mask = Math.max(0, 255 - Math.abs(b - threshold) * 255 / feather);
                }
            }

            data[i * 4 + 0] = 255;
            data[i * 4 + 1] = 255;
            data[i * 4 + 2] = 255;
            data[i * 4 + 3] = mask;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    /**
     * Precompute brightness for all pixels in original image.
     */
    analyzeBrightness(imageData) {
        const map = new Float32Array(imageData.width * imageData.height);
        const data = imageData.data;
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            // Standard luminance formula
            map[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }
        return map;
    }

    // Optionally boost contrast using 2D context (for extra punch; can be omitted for performance)
    applyContrast(canvas, boost = 1.2) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = img.data;
        const c = boost;
        const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
        for (let i = 0; i < data.length; i += 4) {
            data[i]     = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
        ctx.putImageData(img, 0, 0);
    }

    getTempCanvas() {
        if (!this._tmpCanvas || this._tmpCanvas.width !== this.width || this._tmpCanvas.height !== this.height) {
            this._tmpCanvas = document.createElement('canvas');
            this._tmpCanvas.width = this.width;
            this._tmpCanvas.height = this.height;
        }
        return this._tmpCanvas;
    }

    // Required by effect manager
    start(startTime, duration) {
        this.startTime = startTime;
        this.duration = duration;
    }
    isActive(currentTime) {
        return (currentTime - this.startTime) < this.duration;
    }
}
