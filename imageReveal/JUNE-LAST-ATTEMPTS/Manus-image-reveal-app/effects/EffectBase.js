export class EffectBase {
    constructor(name, options = {}) {
        if (new.target === EffectBase)
            throw new Error('EffectBase is abstract.');
        this.name = name;
        this.options = { intensity: 50, duration: 1.0, easing: 'easeInOut', ...options };
        this.isActive = false;
        this.progress = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.canvas = this.ctx = this.originalImageData = this.workingImageData = this.outputImageData = null;
        this.random = null;
        this.parameters = {};
        this.lastFrameTime = this.frameCount = 0;
        this.width = this.height = 0;
        this.isInitialized = false;
    }

    initialize(canvas, originalImageData, random) {
        this.canvas = canvas;
        this.originalImageData = originalImageData;
        this.random = random;
        this.width = originalImageData.width;
        this.height = originalImageData.height;
        this.workingImageData = new ImageData(this.width, this.height);
        this.outputImageData = new ImageData(this.width, this.height);
        this.isInitialized = true;
        this.initializeParameters?.();
        this.onInitialize?.();
    }

    initializeParameters() {
        throw new Error('initializeParameters() must be implemented by subclass');
    }

    start(startTime, duration = null) {
        this.isActive = true;
        this.progress = 0;
        this.startTime = startTime;
        this.endTime = startTime + (duration ?? this.options.duration);
        this.frameCount = 0;
        this.onStart?.();
    }

    stop() {
        this.isActive = false;
        this.progress = 1;
        this.onStop?.();
    }

    /**
     * Update effect state and draw (new preferred flow).
     * Returns the latest output ImageData for compatibility,
     * but all drawing should go through draw(ctx, timingInfo).
     */
    update(currentTime, timingInfo, ctx = null) {
        if (!this.isActive) return null;
        const elapsed = currentTime - this.startTime, duration = this.endTime - this.startTime;
        this.progress = Math.max(0, Math.min(1, elapsed / duration));
        const eased = this.applyEasing(this.progress);
        this.frameCount++;
        const t0 = performance.now();
        if (ctx && typeof this.draw === 'function') {
            this.draw(ctx, timingInfo);
        } else {
            this.render(eased, timingInfo); // for legacy subclasses
        }
        this.lastFrameTime = performance.now() - t0;
        if (this.progress >= 1) this.stop();
        return this.outputImageData;
    }

    /**
     * Used by draw()-style subclasses for consistent progress calc.
     */
    getProgress(timingInfo) {
        // This allows draw() to use correct eased progress.
        const now = timingInfo?.currentTime ?? 0;
        const elapsed = now - this.startTime, duration = this.endTime - this.startTime;
        const p = Math.max(0, Math.min(1, elapsed / duration));
        return this.applyEasing(p);
    }

    /**
     * Legacy render method for backward compatibility.
     */
    render(progress, timingInfo) {
        throw new Error('render() or draw() must be implemented by subclass');
    }

    applyEasing(t) {
        switch (this.options.easing) {
            case 'linear': return t;
            case 'easeIn': return t * t;
            case 'easeOut': return 1 - (1 - t) * (1 - t);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
            case 'easeInCubic': return t ** 3;
            case 'easeOutCubic': return 1 - (1 - t) ** 3;
            case 'easeInOutCubic': return t < 0.5 ? 4 * t ** 3 : 1 - 4 * (1 - t) ** 3;
            case 'bounce':
                if (t < 1 / 2.75) return 7.5625 * t * t;
                if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
            default: return t;
        }
    }

    setIntensity(i) { this.options.intensity = Math.max(0, Math.min(100, i)); }
    getIntensity() { return this.options.intensity / 100; }

    copyImageData(src, dst) { dst.data.set(src.data); }

    blendImageData(base, overlay, alpha = 1, mode = 'normal') {
        const r = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
        for (let i = 0; i < r.data.length; i += 4) {
            const br = base.data[i], bg = base.data[i + 1], bb = base.data[i + 2], ba = base.data[i + 3],
                or = overlay.data[i], og = overlay.data[i + 1], ob = overlay.data[i + 2], oa = overlay.data[i + 3];
            let rr, rg, rb;
            switch (mode) {
                case 'multiply': rr = br * or / 255; rg = bg * og / 255; rb = bb * ob / 255; break;
                case 'screen': rr = 255 - ((255 - br) * (255 - or)) / 255; rg = 255 - ((255 - bg) * (255 - og)) / 255; rb = 255 - ((255 - bb) * (255 - ob)) / 255; break;
                case 'overlay':
                    rr = br < 128 ? 2 * br * or / 255 : 255 - 2 * (255 - br) * (255 - or) / 255;
                    rg = bg < 128 ? 2 * bg * og / 255 : 255 - 2 * (255 - bg) * (255 - og) / 255;
                    rb = bb < 128 ? 2 * bb * ob / 255 : 255 - 2 * (255 - bb) * (255 - ob) / 255; break;
                default: rr = or; rg = og; rb = ob;
            }
            r.data[i] = br + (rr - br) * alpha;
            r.data[i + 1] = bg + (rg - bg) * alpha;
            r.data[i + 2] = bb + (rb - bb) * alpha;
            r.data[i + 3] = ba + (oa - ba) * alpha;
        }
        return r;
    }

    applyConvolution(img, kernel, divisor = null) {
        const w = img.width, h = img.height, d = img.data, r = new ImageData(w, h),
            ks = kernel.length, half = ks >> 1;
        if (divisor == null) divisor = kernel.flat().reduce((s, v) => s + v, 0) || 1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let tr = 0, tg = 0, tb = 0;
            for (let ky = 0; ky < ks; ky++) for (let kx = 0; kx < ks; kx++) {
                const px = Math.min(w - 1, Math.max(0, x + kx - half)),
                      py = Math.min(h - 1, Math.max(0, y + ky - half)),
                      idx = (py * w + px) * 4, weight = kernel[ky][kx];
                tr += d[idx] * weight; tg += d[idx + 1] * weight; tb += d[idx + 2] * weight;
            }
            const idx = (y * w + x) * 4;
            r.data[idx] = Math.max(0, Math.min(255, tr / divisor));
            r.data[idx + 1] = Math.max(0, Math.min(255, tg / divisor));
            r.data[idx + 2] = Math.max(0, Math.min(255, tb / divisor));
            r.data[idx + 3] = d[idx + 3];
        }
        return r;
    }

    getPixel(img, x, y) {
        const idx = (y * img.width + x) * 4;
        return [img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3]];
    }
    setPixel(img, x, y, rgba) {
        const idx = (y * img.width + x) * 4;
        [img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3]] = rgba;
    }

    getMetadata() {
        return {
            name: this.name, isActive: this.isActive, progress: this.progress,
            intensity: this.options.intensity, duration: this.options.duration,
            frameCount: this.frameCount, lastFrameTime: this.lastFrameTime, parameters: this.parameters
        };
    }
    serialize() {
        return {
            name: this.name, options: this.options, isActive: this.isActive,
            progress: this.progress, startTime: this.startTime, endTime: this.endTime,
            frameCount: this.frameCount, parameters: this.parameters
        };
    }
    clone() {
        const c = new this.constructor(this.name, { ...this.options });
        c.parameters = { ...this.parameters };
        return c;
    }

    // For subclasses to optionally override.
    onStart() { }
    onStop() { }
}
