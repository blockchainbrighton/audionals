// --- START OF FILE waveformDisplay.js ---
/* eslint-env browser */
/* global AudioContext */

let canvas, ctx, logicalWidth = 0, logicalHeight = 0, dpr = 1, isSizeInitialized = false;
let resizeObserver, pendingAudioBuffer, currentAudioBuffer;
let playheadAnimationId, isPlayheadActive = false, playheadAudioStartTime = 0,
    playheadPlaybackRate = 1, playheadBufferOffset = 0, playheadSegmentDuration = 0,
    playheadColor = '#ff6b6b', audioContextRef, pendingPlayheadParams;
let trimStartRatio = 0, trimEndRatio = 1, isReversed = false, waveformContainer;

/* ---- tiny helpers ------------------------------------------------------- */
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const validCtx = () => ctx && canvas && isSizeInitialized && logicalWidth > 0 && logicalHeight > 0;
const log = (...a) => console.log('Waveform Display:', ...a);
const err = (...a) => console.error('Waveform Display:', ...a);
const visualTrim = () => {                          // original→visual pixel bounds
    let [s, e] = isReversed ? [1 - trimEndRatio, 1 - trimStartRatio] : [trimStartRatio, trimEndRatio];
    s = Math.round(s * logicalWidth); e = Math.round(e * logicalWidth);
    return s > e ? [e, s] : [s, e];
};
const drawSegment = (data, startX, endX, color) => { // fast vertical min‑max bars
    if (startX >= endX) return;
    const mid = logicalHeight / 2, spp = Math.max(1, Math.floor(data.length / logicalWidth));
    ctx.strokeStyle = color; ctx.beginPath();
    for (let x = startX; x < endX; x++) {
        const slice = data.subarray(x * spp, (x + 1) * spp);
        const min = slice.reduce((m, s) => (s < m ? s : m), 1);
        const max = slice.reduce((m, s) => (s > m ? s : m), -1);
        const yMax = clamp(mid - max * mid, 0, logicalHeight);
        const yMin = clamp(mid - min * mid, 0, logicalHeight);
        ctx.moveTo(x + 0.5, yMax); ctx.lineTo(x + 0.5, yMin);
    }
    ctx.stroke();
};

/* ---- exported API ------------------------------------------------------- */
export function setAudioContext(context) {
    context instanceof AudioContext ? (audioContextRef = context, log('AudioContext reference set.'))
                                    : (audioContextRef = null, err('Invalid AudioContext provided.'));
}

export function setReversed(reversed) {
    if (isReversed === reversed) return;
    isReversed = reversed; log(`Set reversed=${isReversed}`);
    if (!validCtx()) return clearWaveform();
    if (!isPlayheadActive && currentAudioBuffer) drawWaveform(currentAudioBuffer);
}

export function init(canvasId) {
    pendingAudioBuffer = currentAudioBuffer = pendingPlayheadParams = null;
    logicalWidth = logicalHeight = 0; audioContextRef = null; isReversed = false; stopPlayhead();
    resizeObserver?.disconnect(); resizeObserver = null;

    waveformContainer = document.getElementById('waveform-container')
                      ?? document.getElementById(canvasId)?.parentElement;
    if (!waveformContainer) return err('Init: container not found.'), false;
    canvas = document.getElementById(canvasId);
    if (!canvas) return err(`Init: canvas #${canvasId} not found.`), false;
    ctx = canvas.getContext('2d'); if (!ctx) return err('Init: 2D context failed.'), false;
    log(`Found container & canvas #${canvasId}.`);

    resizeObserver = new ResizeObserver(([entry]) => performCanvasSetup(entry));
    resizeObserver.observe(waveformContainer);
    return true;
}

export const clearWaveform = () =>
    validCtx() && (ctx.fillStyle = '#202020', ctx.fillRect(0, 0, logicalWidth, logicalHeight));

export function drawWaveform(audioBuffer, color = '#88c0d0', playheadX = null) {
    if (!ctx) return;
    if (audioBuffer?.getChannelData) currentAudioBuffer = audioBuffer;
    else if (audioBuffer !== null) err('Invalid AudioBuffer provided.');
    else if (!isSizeInitialized) pendingAudioBuffer = currentAudioBuffer;

    if (!validCtx()) return;
    drawBaseWaveform(currentAudioBuffer, color);
    if (playheadX != null && playheadX >= 0) drawPlayheadLine(playheadX);
}

export function startPlayhead(audioStartTime, playbackRate, bufferOffset, segmentDuration) {
    pendingPlayheadParams = { audioStartTime, playbackRate, bufferOffset, segmentDuration };
    if (!validCtx() || !audioContextRef || segmentDuration <= 0) return log('Deferring playhead start.');
    cancelAnimationFrame(playheadAnimationId); pendingPlayheadParams = null;

    playheadAudioStartTime = audioStartTime;
    playheadPlaybackRate   = playbackRate;
    playheadBufferOffset   = bufferOffset;
    playheadSegmentDuration = segmentDuration;
    isPlayheadActive = true;
    playheadAnimationId = requestAnimationFrame(_updatePlayhead);
}

export function stopPlayhead() {
    cancelAnimationFrame(playheadAnimationId); playheadAnimationId = null;
    if (!isPlayheadActive) return; isPlayheadActive = false; pendingPlayheadParams = null;
    validCtx() ? (currentAudioBuffer ? drawWaveform(currentAudioBuffer) : clearWaveform()) : null;
}

/* ---- internals ---------------------------------------------------------- */
function performCanvasSetup({ contentRect: { width: w, height: h } }) {
    if (!w || !h || (w === logicalWidth && h === logicalHeight)) return;
    logicalWidth = w; logicalHeight = h; dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.resetTransform(); ctx.scale(dpr, dpr); isSizeInitialized = true; log(`Setup ${w}×${h}@${dpr}`);

    _listenForTrimChanges();
    (pendingAudioBuffer || currentAudioBuffer) ? drawWaveform(pendingAudioBuffer ?? currentAudioBuffer)
                                               : clearWaveform();
    pendingAudioBuffer = null;

    if (pendingPlayheadParams && audioContextRef) {
        const p = pendingPlayheadParams;
        startPlayhead(p.audioStartTime, p.playbackRate, p.bufferOffset, p.segmentDuration);
    }
}

function _listenForTrimChanges() {
    waveformContainer?.removeEventListener('trimchanged', _handleTrimChanged);
    waveformContainer?.addEventListener('trimchanged', _handleTrimChanged);
}

function _handleTrimChanged({ detail }) {
    if (!detail) return;
    const changed = trimStartRatio !== detail.startRatio || trimEndRatio !== detail.endRatio;
    trimStartRatio = detail.startRatio; trimEndRatio = detail.endRatio;
    if (!changed) return;
    validCtx() ? (!isPlayheadActive && currentAudioBuffer ? drawWaveform(currentAudioBuffer) : clearWaveform())
               : null;
}

function drawBaseWaveform(audioBuffer, color = '#88c0d0', dimColor = 'rgba(136,192,208,.3)') {
    if (!validCtx()) return;
    clearWaveform();
    if (!audioBuffer?.getChannelData) return;
    const data = audioBuffer.getChannelData(0), [sX, eX] = visualTrim();
    drawSegment(data, 0, sX, dimColor);
    drawSegment(data, sX, eX, color);
    drawSegment(data, eX, logicalWidth, dimColor);
}

function drawPlayheadLine(x) {
    if (!validCtx()) return;
    x = Math.round(clamp(x, 0, logicalWidth)) + 0.5;
    ctx.strokeStyle = playheadColor; ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, logicalHeight); ctx.stroke();
}

function _updatePlayhead() {
    if (!isPlayheadActive || !validCtx() || !audioContextRef || !currentAudioBuffer || playheadSegmentDuration <= 0)
        return stopPlayhead();
    const t = clamp((audioContextRef.currentTime - playheadAudioStartTime) *
                    playheadPlaybackRate / playheadSegmentDuration, 0, 1);
    const [sX, eX] = visualTrim(), playheadX = sX + t * (eX - sX);
    drawWaveform(currentAudioBuffer);          // redraw & dim
    drawPlayheadLine(playheadX);               // overlay playhead
    t >= 1 ? stopPlayhead() : (playheadAnimationId = requestAnimationFrame(_updatePlayhead));
}
// --- END OF FILE waveformDisplay.js ---
