const peakCache = new WeakMap();

function getPeaks(audioBuffer, width, rangeStart = 0, rangeEnd = 1) {
    if (!audioBuffer || width <= 0) {
        return { min: new Float32Array(0), max: new Float32Array(0) };
    }

    const channelCount = audioBuffer.numberOfChannels;
    const sampleCount = audioBuffer.length;
    if (!channelCount || !sampleCount) {
        return { min: new Float32Array(0), max: new Float32Array(0) };
    }

    const normalizedStart = Number.isFinite(rangeStart) ? Math.max(0, Math.min(1, rangeStart)) : 0;
    const normalizedEndRaw = Number.isFinite(rangeEnd) ? Math.max(0, Math.min(1, rangeEnd)) : 1;
    const normalizedEnd = Math.max(normalizedStart + 1 / sampleCount, normalizedEndRaw);
    const cacheKey = `${width}|${normalizedStart.toFixed(4)}|${normalizedEnd.toFixed(4)}`;

    let widthMap = peakCache.get(audioBuffer);
    if (!widthMap) {
        widthMap = new Map();
        peakCache.set(audioBuffer, widthMap);
    }

    if (widthMap.has(cacheKey)) {
        return widthMap.get(cacheKey);
    }

    const viewStart = Math.floor(normalizedStart * sampleCount);
    const viewEnd = Math.min(sampleCount, Math.ceil(normalizedEnd * sampleCount));
    const viewSampleCount = Math.max(1, viewEnd - viewStart);

    const min = new Float32Array(width);
    const max = new Float32Array(width);

    const samplesPerBucket = viewSampleCount / width;

    for (let bucket = 0; bucket < width; bucket++) {
        const bucketStart = Math.floor(viewStart + bucket * samplesPerBucket);
        let bucketEnd = Math.floor(viewStart + (bucket + 1) * samplesPerBucket);

        if (bucket === width - 1) {
            bucketEnd = viewEnd;
        }
        if (bucketEnd <= bucketStart) {
            bucketEnd = Math.min(viewEnd, bucketStart + 1);
        }

        let minVal = 1;
        let maxVal = -1;

        for (let channel = 0; channel < channelCount; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = bucketStart; i < bucketEnd; i++) {
                const sample = data[i];
                if (sample < minVal) minVal = sample;
                if (sample > maxVal) maxVal = sample;
            }
        }

        if (minVal === 1 && maxVal === -1) {
            min[bucket] = 0;
            max[bucket] = 0;
        } else {
            min[bucket] = minVal;
            max[bucket] = maxVal;
        }
    }

    const result = { min, max };
    widthMap.set(cacheKey, result);
    return result;
}

function prepareCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = Math.max(1, Math.round(width * dpr));
    const scaledHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== scaledWidth) canvas.width = scaledWidth;
    if (canvas.height !== scaledHeight) canvas.height = scaledHeight;
    if (canvas.style.width !== `${width}px`) canvas.style.width = `${width}px`;
    if (canvas.style.height !== `${height}px`) canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    ctx.scale(dpr, dpr);
    return ctx;
}

/**
 * Draws a waveform visualization for the provided AudioBuffer.
 * @param {HTMLCanvasElement} canvas
 * @param {AudioBuffer} audioBuffer
 * @param {object} [options]
 * @param {number} [options.width=300]
 * @param {number} [options.height=120]
 * @param {string} [options.waveColor='#0f0']
 * @param {string} [options.backgroundColor='#111']
 * @param {string} [options.axisColor='#333']
 */
export function drawWaveform(canvas, audioBuffer, options = {}) {
    if (!canvas || !audioBuffer) return;

    const {
        width = 300,
        height = 120,
        waveColor = '#0f0',
        backgroundColor = '#111',
        axisColor = '#333',
        selection = null,
        viewport = null
    } = options;

    const ctx = prepareCanvas(canvas, width, height);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const viewportStart = Math.max(0, Math.min(1, viewport?.start ?? 0));
    const viewportEndRaw = Math.max(0, Math.min(1, viewport?.end ?? 1));
    const viewportEnd = Math.max(viewportStart + 1 / (audioBuffer.length || 1), viewportEndRaw);
    const viewportSpan = Math.max(viewportEnd - viewportStart, 1 / (audioBuffer.length || 1));

    const { min, max } = getPeaks(
        audioBuffer,
        Math.max(1, Math.round(width)),
        viewportStart,
        viewportEnd
    );

    if (selection && typeof selection === 'object') {
        const rawStart = Math.max(0, Math.min(1, selection.start ?? 0));
        const rawEnd = Math.max(rawStart, Math.min(1, selection.end ?? 1));
        const clippedStart = Math.max(viewportStart, Math.min(viewportEnd, rawStart));
        const clippedEnd = Math.max(clippedStart, Math.min(viewportEnd, rawEnd));
        const selWidth = Math.max(0, clippedEnd - clippedStart);
        if (selWidth > 0) {
            const rangeStartRatio = (clippedStart - viewportStart) / viewportSpan;
            const rangeEndRatio = (clippedEnd - viewportStart) / viewportSpan;
            const xStart = rangeStartRatio * width;
            const widthPx = Math.max(1, (rangeEndRatio - rangeStartRatio) * width);
            const fillColor = selection.color || 'rgba(0, 255, 0, 0.15)';
            const borderColor = selection.borderColor || waveColor;
            const handleColor = selection.handleColor || borderColor;
            const borderWidth = Math.max(0, widthPx - 2);

            ctx.fillStyle = fillColor;
            ctx.fillRect(xStart, 0, widthPx, height);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(xStart + 1, 1, borderWidth, height - 2);
            ctx.fillStyle = handleColor;
            const handleWidth = 3;
            ctx.fillRect(xStart, 0, handleWidth, height);
            ctx.fillRect(xStart + widthPx - handleWidth, 0, handleWidth, height);
        }
    }

    // Draw midline axis
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
        const xPos = x + 0.5;
        const yMin = ((1 - min[x]) / 2) * height;
        const yMax = ((1 - max[x]) / 2) * height;
        ctx.moveTo(xPos, yMin);
        ctx.lineTo(xPos, yMax);
    }

    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function clearWaveformCache(audioBuffer) {
    if (!audioBuffer) return;
    peakCache.delete(audioBuffer);
}
