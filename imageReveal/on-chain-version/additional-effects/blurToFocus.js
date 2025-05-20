/**
 * Fade in and deblur an image on a canvas.
 * @param {CanvasRenderingContext2D} ctx - 2D context of target canvas.
 * @param {HTMLImageElement} img - The image to reveal.
 * @param {number} duration - Reveal duration in ms.
 * @param {number} maxBlur - Max starting blur radius in px.
 * @param {function} [onDone] - Optional callback after reveal.
 */
export function fadeBlurReveal(ctx, img, duration = 3000, maxBlur = 18, onDone) {
    const { width, height } = ctx.canvas;
    const start = performance.now();

    function draw(now) {
        const elapsed = Math.min(now - start, duration);
        const t = elapsed / duration;
        // Ease both effects together for smoothness (easeOutQuad)
        const ease = x => 1 - (1 - x) * (1 - x);
        const blur = maxBlur * (1 - ease(t));
        const alpha = ease(t);

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = alpha;
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        ctx.restore();

        if (elapsed < duration) {
            requestAnimationFrame(draw);
        } else {
            // Draw sharp, fully opaque image at the end
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(draw);
}
