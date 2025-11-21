import { getFadeCurveValue } from './fade-shapes.js';

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
        viewport = null,
        fade = null
    } = options;

    const ctx = prepareCanvas(canvas, width, height);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const fadeConfig = (fade && typeof fade === 'object') ? fade : null;

    const viewportStart = Math.max(0, Math.min(1, viewport?.start ?? 0));
    const viewportEndRaw = Math.max(0, Math.min(1, viewport?.end ?? 1));
    const viewportEnd = Math.max(viewportStart + 1 / (audioBuffer.length || 1), viewportEndRaw);
    const viewportSpan = Math.max(viewportEnd - viewportStart, 1 / (audioBuffer.length || 1));

    const renderFadeSegments = metrics => {
        if (!fadeConfig) return;
        const totalSecondsRaw = Number(fadeConfig.selectionDuration);
        const totalSeconds = Number.isFinite(totalSecondsRaw) ? Math.max(0, totalSecondsRaw) : 0;
        if (totalSeconds <= 0) return;

        const sectionWidth = metrics?.width ?? 0;
        if (!Number.isFinite(sectionWidth) || sectionWidth <= 1) return;

        const baseX = metrics?.x ?? 0;
        const effectiveInSeconds = Math.max(0, Math.min(totalSeconds, Number(fadeConfig.in?.duration) || 0));
        const effectiveOutSeconds = Math.max(0, Math.min(totalSeconds, Number(fadeConfig.out?.duration) || 0));
        if (effectiveInSeconds <= 0 && effectiveOutSeconds <= 0) return;

        const secondsToWidth = sectionWidth / totalSeconds;

        const drawSegment = (kind, seconds, shapeId) => {
            if (seconds <= 0) return;
            const segmentWidth = Math.min(sectionWidth, Math.max(0, seconds * secondsToWidth));
            if (segmentWidth <= 1) return;
            const isIn = kind === 'in';
            const startX = isIn ? baseX : baseX + sectionWidth - segmentWidth;

            const gradient = ctx.createLinearGradient(startX, 0, startX + segmentWidth, 0);
            if (isIn) {
                gradient.addColorStop(0, 'rgba(24, 255, 182, 0.55)');
                gradient.addColorStop(1, 'rgba(24, 255, 182, 0.12)');
            } else {
                gradient.addColorStop(0, 'rgba(24, 255, 182, 0.12)');
                gradient.addColorStop(1, 'rgba(24, 255, 182, 0.55)');
            }

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.fillRect(startX, 0, segmentWidth, height);
            ctx.restore();

            const steps = Math.max(6, Math.round(segmentWidth / 6));
            const points = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const curveValue = getFadeCurveValue(shapeId, t);
                const amplitude = isIn ? curveValue : 1 - curveValue;
                const xPoint = startX + t * segmentWidth;
                const yPoint = height - amplitude * height;
                points.push({ x: xPoint, y: yPoint });
            }

            ctx.save();
            ctx.fillStyle = 'rgba(24, 255, 182, 0.18)';
            ctx.beginPath();
            if (isIn) {
                ctx.moveTo(startX, height);
                points.forEach((point, index) => {
                    if (index === 0) ctx.lineTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.lineTo(startX + segmentWidth, height);
            } else {
                ctx.moveTo(startX, 0);
                points.forEach((point, index) => {
                    if (index === 0) ctx.lineTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.lineTo(startX + segmentWidth, 0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = 'rgba(24, 255, 182, 0.78)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            points.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(24, 255, 182, 0.32)';
            ctx.lineWidth = 1;
            const boundaryX = isIn ? startX + segmentWidth : startX;
            ctx.beginPath();
            ctx.moveTo(boundaryX, 0);
            ctx.lineTo(boundaryX, height);
            ctx.stroke();
            ctx.restore();
        };

        drawSegment('in', effectiveInSeconds, fadeConfig.in?.shape);
        drawSegment('out', effectiveOutSeconds, fadeConfig.out?.shape);
    };

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
            const trimColor = selection.trimColor || 'rgba(5, 8, 12, 0.78)';
            const trimStripeColor = selection.trimStripeColor || 'rgba(24, 255, 182, 0.08)';
            const trimBoundaryColor = selection.trimBoundaryColor || 'rgba(24, 255, 182, 0.36)';
            const stripeSpacing = Math.max(4, Math.round(height / 14));

            const drawTrimSection = (originX, sectionWidth, isLeft) => {
                if (sectionWidth <= 0.5) return;
                ctx.save();
                ctx.fillStyle = trimColor;
                ctx.fillRect(originX, 0, sectionWidth, height);
                ctx.strokeStyle = trimStripeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let offset = -height; offset < sectionWidth + height; offset += stripeSpacing) {
                    const startX = originX + offset;
                    ctx.moveTo(startX, 0);
                    ctx.lineTo(startX + height, height);
                }
                ctx.stroke();
                ctx.restore();

                ctx.save();
                ctx.strokeStyle = trimBoundaryColor;
                ctx.lineWidth = 1.5;
                const boundaryX = isLeft ? originX + sectionWidth : originX;
                ctx.beginPath();
                ctx.moveTo(boundaryX, 0);
                ctx.lineTo(boundaryX, height);
                ctx.stroke();
                ctx.restore();
            };

            const leftTrimWidth = Math.max(0, xStart);
            const rightTrimWidth = Math.max(0, width - (xStart + widthPx));
            if (leftTrimWidth > 0.5) drawTrimSection(0, leftTrimWidth, true);
            if (rightTrimWidth > 0.5) drawTrimSection(xStart + widthPx, rightTrimWidth, false);

            ctx.fillStyle = fillColor;
            ctx.fillRect(xStart, 0, widthPx, height);
            renderFadeSegments({ x: xStart, width: widthPx });
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(xStart + 1, 1, borderWidth, height - 2);
            ctx.fillStyle = handleColor;
            const dynamicHandle = Math.max(4, Math.round(width * 0.008));
            const maxHandle = Math.max(2, widthPx / 2);
            const handleWidth = Math.min(dynamicHandle, maxHandle);
            ctx.fillRect(xStart, 0, handleWidth, height);
            ctx.fillRect(xStart + widthPx - handleWidth, 0, handleWidth, height);

            ctx.strokeStyle = handleColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xStart + handleWidth / 2, 0);
            ctx.lineTo(xStart + handleWidth / 2, height);
            ctx.moveTo(xStart + widthPx - handleWidth / 2, 0);
            ctx.lineTo(xStart + widthPx - handleWidth / 2, height);
            ctx.stroke();
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
