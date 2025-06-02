import { EffectBase } from './EffectBase.js';

/**
 * Alpha Fade Effect (Efficient context-based, multi-pattern support)
 */
export class AlphaFade extends EffectBase {
    constructor(name = 'AlphaFade', options = {}) {
        super(name, options);
    }

    /**
     * Initialize effect for context-based drawing
     */
    initialize(canvas, originalImageData, random) {
        this.canvas = canvas;
        this.random = random;
        this.parameters = {
            fadeDirection: this.options.fadeDirection || 'in',    // 'in', 'out', 'pulse'
            pattern: this.options.pattern || 'uniform',            // 'uniform', 'radial', 'linear', 'noise'
            gradientDirection: this.options.gradientDirection || 'horizontal', // for linear
            centerX: this.options.centerX || 0.5,
            centerY: this.options.centerY || 0.5,
            // Add more pattern parameters as needed
        };
        this.imageBitmap = null;
        createImageBitmap(originalImageData).then(bmp => { this.imageBitmap = bmp; });
        this.noiseCanvas = null; // Lazy generated if needed
    }

    /**
     * Draw the alpha fade effect using the 2D context API
     */
    draw(ctx, timingInfo) {
        if (!this.imageBitmap) return;
        const { fadeDirection, pattern, gradientDirection, centerX, centerY } = this.parameters;
        let progress = this.getProgress(timingInfo);
        let alpha = this.getFadeAlpha(progress, timingInfo);

        // Modulate by effect intensity
        if (typeof this.getIntensity === 'function') {
            alpha *= this.getIntensity() / 100;
        }
        alpha = Math.max(0, Math.min(1, alpha));

        ctx.save();

        if (pattern === 'uniform') {
            ctx.globalAlpha = alpha;
            ctx.drawImage(this.imageBitmap, 0, 0, this.canvas.width, this.canvas.height);
        } else if (pattern === 'radial') {
            // Create a radial gradient mask
            let mask = ctx.createRadialGradient(
                this.canvas.width * centerX, this.canvas.height * centerY, 0,
                this.canvas.width * centerX, this.canvas.height * centerY,
                Math.max(this.canvas.width, this.canvas.height) * progress
            );
            mask.addColorStop(0, `rgba(255,255,255,${alpha})`);
            mask.addColorStop(1, `rgba(255,255,255,0)`);
            // Mask to temp canvas
            this.drawWithMask(ctx, mask);
        } else if (pattern === 'linear') {
            // Linear gradient mask (direction)
            let grad;
            if (gradientDirection === 'vertical') {
                grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            } else if (gradientDirection === 'diagonal') {
                grad = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            } else {
                grad = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
            }
            const fadeStart = progress - 0.3, fadeEnd = progress + 0.3;
            grad.addColorStop(Math.max(0, fadeStart), `rgba(255,255,255,0)`);
            grad.addColorStop(Math.max(0, progress), `rgba(255,255,255,${alpha})`);
            grad.addColorStop(Math.min(1, fadeEnd), `rgba(255,255,255,0)`);
            this.drawWithMask(ctx, grad);
        } else if (pattern === 'noise') {
            // Use a pre-generated (or on-demand) noise alpha mask
            if (!this.noiseCanvas || this.noiseCanvas.width !== this.canvas.width || this.noiseCanvas.height !== this.canvas.height) {
                this.noiseCanvas = this.generateNoiseCanvas(this.canvas.width, this.canvas.height, this.random);
            }
            // Draw image to temp canvas
            const tmp = this.getTempCanvas();
            const tctx = tmp.getContext('2d');
            tctx.clearRect(0, 0, tmp.width, tmp.height);
            tctx.globalAlpha = 1;
            tctx.drawImage(this.imageBitmap, 0, 0, tmp.width, tmp.height);
            // Set global composite alpha based on threshold
            tctx.globalCompositeOperation = 'destination-in';
            tctx.globalAlpha = alpha;
            tctx.drawImage(this.noiseCanvas, 0, 0, tmp.width, tmp.height);
            // Draw the result to main context
            ctx.globalAlpha = 1;
            ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);
        }
        // (Optionally add more patterns with efficient canvas masking logic)

        ctx.restore();
    }

    /**
     * Returns fade alpha for the chosen direction
     */
    getFadeAlpha(progress, timingInfo) {
        switch (this.parameters.fadeDirection) {
            case 'in': return progress;
            case 'out': return 1 - progress;
            case 'pulse':
                // Quick pulse logic based on beats
                const freq = this.options.pulseFrequency || 2;
                const phase = (timingInfo.currentBeat * freq) % 1;
                return Math.max(0, Math.sin(phase * Math.PI * 2) * progress);
            default: return progress;
        }
    }

    /**
     * Returns effect progress (0-1) based on timingInfo, start, and duration
     */
    getProgress(timingInfo) {
        if (typeof this.startTime === 'number' && typeof this.duration === 'number') {
            return Math.max(0, Math.min(1, (timingInfo.currentTime - this.startTime) / this.duration));
        }
        return timingInfo.progress ?? 0;
    }

    /**
     * Masked image draw: draws imageBitmap with an alpha mask (CanvasGradient or Pattern)
     */
    drawWithMask(ctx, mask) {
        // Draw to temp canvas for masking
        const tmp = this.getTempCanvas();
        const tctx = tmp.getContext('2d');
        tctx.clearRect(0, 0, tmp.width, tmp.height);
        tctx.globalAlpha = 1;
        tctx.drawImage(this.imageBitmap, 0, 0, tmp.width, tmp.height);

        // Set mask as globalAlpha via fillStyle, use destination-in to mask image
        tctx.globalCompositeOperation = 'destination-in';
        tctx.globalAlpha = 1;
        tctx.fillStyle = mask;
        tctx.fillRect(0, 0, tmp.width, tmp.height);

        // Composite temp back onto main context
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Generate a simple noise alpha mask as a grayscale PNG on a canvas
     */
    generateNoiseCanvas(width, height, random) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < imgData.data.length; i += 4) {
            // random grayscale (can be improved)
            const val = Math.floor(255 * (random ? random.next() : Math.random()));
            imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = 255;
            imgData.data[i+3] = val;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    /**
     * Get or create a shared temp canvas for masking
     */
    getTempCanvas() {
        if (!this._tmpCanvas || this._tmpCanvas.width !== this.canvas.width || this._tmpCanvas.height !== this.canvas.height) {
            this._tmpCanvas = document.createElement('canvas');
            this._tmpCanvas.width = this.canvas.width;
            this._tmpCanvas.height = this.canvas.height;
        }
        return this._tmpCanvas;
    }

    // EffectManager calls start() and isActive()
    start(startTime, duration) {
        this.startTime = startTime;
        this.duration = duration;
    }
    isActive(currentTime) {
        if (typeof this.startTime === 'number' && typeof this.duration === 'number') {
            return (currentTime - this.startTime) < this.duration;
        }
        return true;
    }
}
